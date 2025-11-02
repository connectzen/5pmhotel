"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { mockVenues } from "@/lib/admin-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Phone, X, XCircle, Trash2, RotateCcw, Edit, CheckCircle2, AlertTriangle, Plus } from "lucide-react"
import { collection, onSnapshot, doc, setDoc, serverTimestamp, addDoc, getDoc, query, where, getDocs, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreateEventModal } from "@/components/admin/create-event-modal"

interface ClientEvent {
  id: string // This can be either the Firestore document ID or the event's own ID field
  firestoreId?: string // Firestore document ID for updates
  name: string
  venueId: string
  venueName: string
  date: string
  guests: number
  customerName: string
  customerEmail: string
  customerPhone?: string
  note?: string
  eventType?: string
  type?: string
  status: "pending" | "approved" | "rejected"
}

interface EventBooking {
  id: string
  eventName: string
  venue: string
  customer: string
  customerPhone?: string
  date: string
  status: "approved" | "pending" | "cancelled"
  guests: number
}

interface ApprovalData {
  amount: number
  paymentMethod: "card" | "cash" | "mpesa"
  callNotes: string
}

export default function EventsPage() {
  const searchParams = useSearchParams()
  const [createdEvents, setCreatedEvents] = useState<ClientEvent[]>([])
  const [bookedEvents, setBookedEvents] = useState<ClientEvent[]>([])
  const [rejectedEvents, setRejectedEvents] = useState<ClientEvent[]>([])
  const [allEvents, setAllEvents] = useState<ClientEvent[]>([])
  const [viewType, setViewType] = useState<"all" | "created" | "booked" | "rejected">(() => {
    const view = searchParams.get("view")
    if (view === "created" || view === "booked" || view === "rejected") {
      return view
    }
    return "all"
  })
  const [pendingEventsCount, setPendingEventsCount] = useState(0)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [approvalEvent, setApprovalEvent] = useState<ClientEvent | null>(null)
  const [editEvent, setEditEvent] = useState<ClientEvent | null>(null)
  const [editData, setEditData] = useState<Partial<ClientEvent>>({})
  const [approvalData, setApprovalData] = useState<ApprovalData>({
    amount: 0,
    paymentMethod: "cash",
    callNotes: "",
  })
  const [unapproveDialogOpen, setUnapproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToAction, setEventToAction] = useState<ClientEvent | null>(null)
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false)

  // Load events from Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clientEvents"), (snap) => {
      const allEvents = snap.docs.map((d) => {
        const data = d.data() as any
        return {
          ...data,
          // Store Firestore document ID separately for updates
          firestoreId: d.id,
          // Use the id from document data if it exists, otherwise use Firestore document ID
          id: data.id || d.id,
        } as ClientEvent
      })
      
      // Store all events
      setAllEvents(allEvents)
      
      // Separate pending (created), approved (booked), and rejected events
      const pending = allEvents.filter((e) => {
        const status = e.status || "pending"
        return status === "pending"
      })
      
      // Filter approved events - keep full ClientEvent structure, exclude cancelled
      const approved = allEvents.filter((e) => {
        const status = e.status || "pending"
        return status === "approved"
      })
      
      // Filter rejected events
      const rejected = allEvents.filter((e) => {
        const status = e.status || "pending"
        return status === "rejected"
      })
      
      setCreatedEvents(pending)
      setBookedEvents(approved)
      setRejectedEvents(rejected)
      setPendingEventsCount(pending.length)
    })
    
    return () => unsub()
  }, [])

  const openApprovalModal = async (ev: ClientEvent) => {
    setApprovalEvent(ev)
    
    // Try to fetch venue price to pre-fill
    let defaultAmount = 0
    try {
      const venueDoc = await getDoc(doc(db, "venues", ev.venueId))
      if (venueDoc.exists()) {
        const venueData = venueDoc.data()
        defaultAmount = venueData.price || 0
      }
    } catch (error) {
      console.warn("Could not fetch venue price:", error)
    }
    
    setApprovalData({
      amount: defaultAmount,
      paymentMethod: "mpesa",
      callNotes: "",
    })
  }

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approvalEvent) return
    
    if (!approvalData.amount || approvalData.amount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (processingIds.has(approvalEvent.id)) return
    
    setProcessingIds(prev => new Set(prev).add(approvalEvent.id))
    
    try {
      // Update event status in Firebase with call notes
      // Use firestoreId if available, otherwise fall back to id
      const docId = approvalEvent.firestoreId || approvalEvent.id
      await setDoc(
        doc(db, "clientEvents", docId),
        { 
          status: "approved",
          approvedAmount: approvalData.amount,
          paymentMethod: approvalData.paymentMethod,
          callNotes: approvalData.callNotes,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      // Check if payment already exists for this event
      // If it exists, update it; otherwise create a new one
      // Need to check both by id and firestoreId to handle all cases
      const allPaymentsSnapshot = await getDocs(collection(db, "payments"))
      const existingPayment = allPaymentsSnapshot.docs.find(doc => {
        const data = doc.data()
        return data.type === "event" && (
          data.bookingId === approvalEvent.id || 
          data.bookingId === approvalEvent.firestoreId ||
          doc.id === approvalEvent.id ||
          doc.id === approvalEvent.firestoreId
        )
      })
      
      // When payment method is chosen during approval, payment is completed
      const paymentStatus = "completed"
      const paymentData = {
        bookingId: approvalEvent.id,
        type: "event",
        amount: approvalData.amount,
        method: approvalData.paymentMethod,
        status: paymentStatus,
        date: new Date().toISOString().slice(0, 10),
        eventName: approvalEvent.name,
        venueName: approvalEvent.venueName,
        customerName: approvalEvent.customerName,
        customerEmail: approvalEvent.customerEmail,
        notes: approvalData.callNotes,
        updatedAt: serverTimestamp(),
      }

      if (existingPayment) {
        // Update existing payment instead of creating a duplicate
        await setDoc(
          doc(db, "payments", existingPayment.id),
          paymentData,
          { merge: true }
        )
      } else {
        // Create new payment entry only if it doesn't exist
        await addDoc(collection(db, "payments"), {
          ...paymentData,
          createdAt: serverTimestamp(),
        })
      }
      
      // Close modal and reset
      setApprovalEvent(null)
      setApprovalData({
        amount: 0,
        paymentMethod: "mpesa",
        callNotes: "",
      })
    } catch (error) {
      console.error("Failed to approve event:", error)
      alert("Failed to approve event. Please try again.")
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(approvalEvent.id)
        return next
      })
    }
  }
  
  const rejectEvent = async (ev: ClientEvent) => {
    if (processingIds.has(ev.id)) return // Prevent double-clicks
    
    setEventToAction(ev)
    setRejectDialogOpen(true)
  }

  
  const unapproveEvent = async (ev: ClientEvent) => {
    if (processingIds.has(ev.id)) return
    
    setEventToAction(ev)
    setUnapproveDialogOpen(true)
  }

  const confirmUnapproveEvent = async () => {
    if (!eventToAction) return
    const ev = eventToAction
    
    setUnapproveDialogOpen(false)
    setProcessingIds(prev => new Set(prev).add(ev.id))
    
    try {
      const docId = ev.firestoreId || ev.id
      await setDoc(
        doc(db, "clientEvents", docId),
        { 
          status: "pending",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      // Update payment status when event is unapproved
      try {
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", ev.id),
          where("type", "==", "event")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        if (!paymentsSnapshot.empty) {
          // Update existing payment to pending (since event is no longer approved)
          const paymentDoc = paymentsSnapshot.docs[0]
          await setDoc(
            doc(db, "payments", paymentDoc.id),
            {
              status: "pending",
              notes: "Event was unapproved",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        }
      } catch (paymentError) {
        console.warn("Failed to update payment entry:", paymentError)
      }
    } catch (error) {
      console.error("Failed to unapprove event:", error)
      alert("Failed to unapprove event. Please try again.")
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(ev.id)
        return next
      })
      setEventToAction(null)
    }
  }
  
  const deleteEvent = async (ev: ClientEvent) => {
    if (processingIds.has(ev.id)) return
    
    setEventToAction(ev)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteEvent = async () => {
    if (!eventToAction) return
    const ev = eventToAction
    
    setDeleteDialogOpen(false)
    setProcessingIds(prev => new Set(prev).add(ev.id))
    
    try {
      const docId = ev.firestoreId || ev.id
      
      // Delete the event document from Firebase
      await deleteDoc(doc(db, "clientEvents", docId))

      // Also delete related payment entries from the backend
      try {
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", ev.id),
          where("type", "==", "event")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        // Delete all related payments
        for (const paymentDoc of paymentsSnapshot.docs) {
          await deleteDoc(doc(db, "payments", paymentDoc.id))
        }
      } catch (paymentError) {
        console.warn("Failed to delete payment entries:", paymentError)
      }
    } catch (error) {
      console.error("Failed to delete event:", error)
      alert("Failed to delete event. Please try again.")
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(ev.id)
        return next
      })
      setEventToAction(null)
    }
  }

  const confirmRejectEvent = async () => {
    if (!eventToAction) return
    const ev = eventToAction
    
    setRejectDialogOpen(false)
    setProcessingIds(prev => new Set(prev).add(ev.id))
    
    try {
      const docId = ev.firestoreId || ev.id
      await setDoc(
        doc(db, "clientEvents", docId),
        { 
          status: "rejected",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      // Update or create failed payment entry for rejected event
      try {
        // Check if payment already exists
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", ev.id),
          where("type", "==", "event")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        if (!paymentsSnapshot.empty) {
          // Update existing payment to failed
          const paymentDoc = paymentsSnapshot.docs[0]
          await setDoc(
            doc(db, "payments", paymentDoc.id),
            {
              status: "failed",
              notes: "Event was rejected",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } else {
          // Create failed payment entry
          await addDoc(collection(db, "payments"), {
            bookingId: ev.id,
            type: "event",
            amount: 0,
            method: "cash",
            status: "failed",
            date: new Date().toISOString().slice(0, 10),
            eventName: ev.name,
            venueName: ev.venueName,
            customerName: ev.customerName,
            customerEmail: ev.customerEmail,
            notes: "Event was rejected",
            createdAt: serverTimestamp(),
          })
        }
      } catch (paymentError) {
        console.warn("Failed to update payment entry:", paymentError)
      }
    } catch (error) {
      console.error("Failed to reject event:", error)
      alert("Failed to reject event. Please try again.")
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(ev.id)
        return next
      })
      setEventToAction(null)
    }
  }
  
  const approveRejectedEvent = async (ev: ClientEvent) => {
    if (processingIds.has(ev.id)) return
    
    // Open approval modal so user can enter payment details (same as approving from created)
    setApprovalEvent(ev)
    
    // Try to fetch venue price to pre-fill
    let defaultAmount = 0
    try {
      const venueDoc = await getDoc(doc(db, "venues", ev.venueId))
      if (venueDoc.exists()) {
        const venueData = venueDoc.data()
        defaultAmount = venueData.price || 0
      }
    } catch (error) {
      console.warn("Could not fetch venue price:", error)
    }
    
    // Check if there's an existing payment with data we can pre-fill
    try {
      const paymentsQuery = query(
        collection(db, "payments"),
        where("bookingId", "==", ev.id),
        where("type", "==", "event")
      )
      const paymentsSnapshot = await getDocs(paymentsQuery)
      
      if (!paymentsSnapshot.empty) {
        const existingPayment = paymentsSnapshot.docs[0].data()
        // Pre-fill with existing payment data if available, otherwise use venue price
        defaultAmount = existingPayment.amount || defaultAmount
        setApprovalData({
          amount: defaultAmount,
          paymentMethod: existingPayment.method || "mpesa",
          callNotes: existingPayment.notes || "",
        })
      } else {
        setApprovalData({
          amount: defaultAmount,
          paymentMethod: "mpesa",
          callNotes: "",
        })
      }
    } catch (error) {
      console.warn("Could not fetch existing payment:", error)
      setApprovalData({
        amount: defaultAmount,
        paymentMethod: "mpesa",
        callNotes: "",
      })
    }
  }
  
  const openEditModal = (ev: ClientEvent) => {
    setEditEvent(ev)
    setEditData({
      name: ev.name,
      date: ev.date,
      guests: ev.guests,
      customerName: ev.customerName,
      customerEmail: ev.customerEmail,
      customerPhone: ev.customerPhone || "",
      note: ev.note || "",
      eventType: ev.eventType || "",
    })
  }
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEvent) return
    
    if (processingIds.has(editEvent.id)) return
    
    setProcessingIds(prev => new Set(prev).add(editEvent.id))
    
    try {
      const docId = editEvent.firestoreId || editEvent.id
      await setDoc(
        doc(db, "clientEvents", docId),
        {
          ...editData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      setEditEvent(null)
      setEditData({})
    } catch (error) {
      console.error("Failed to update event:", error)
      alert("Failed to update event. Please try again.")
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(editEvent.id)
        return next
      })
    }
  }

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Approve client event requests and manage booked events</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateEventModalOpen(true)}
            className="gap-2 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
          <Button
            variant={viewType === "all" ? "default" : "outline"}
            onClick={() => setViewType("all")}
            className={`${viewType === "all" ? "" : "border text-foreground"} hover:scale-105 transition-transform duration-200`}
          >
            All
          </Button>
          <Button
            variant={viewType === "created" ? "default" : "outline"}
            onClick={() => setViewType("created")}
            className={`relative ${viewType === "created" ? "" : "border text-foreground"} hover:scale-105 transition-transform duration-200`}
          >
            Pending Events
            {pendingEventsCount > 0 && (
              <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                {pendingEventsCount > 99 ? "99+" : pendingEventsCount}
              </span>
            )}
          </Button>
          <Button
            variant={viewType === "booked" ? "default" : "outline"}
            onClick={() => setViewType("booked")}
            className={`${viewType === "booked" ? "" : "border text-foreground"} hover:scale-105 transition-transform duration-200`}
          >
            Booked Events
          </Button>
          <Button
            variant={viewType === "rejected" ? "default" : "outline"}
            onClick={() => setViewType("rejected")}
            className={`gap-2 ${viewType === "rejected" ? "" : "border text-foreground"} hover:scale-105 transition-transform duration-200`}
          >
            <XCircle className="w-4 h-4" /> Rejected
          </Button>
        </div>
      </div>

      {/* All Events */}
      {viewType === "all" && (
        <div className="space-y-4">
          {allEvents.length === 0 && (
            <Card className="p-6 text-muted-foreground">No events found.</Card>
          )}
          {allEvents.map((ev) => {
            const status = ev.status || "pending"
            const isPending = status === "pending"
            const isApproved = status === "approved"
            const isRejected = status === "rejected"
            
            return (
              <Card key={ev.firestoreId || ev.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground">{ev.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{ev.venueName}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm">
                      <span><strong>Date:</strong> {ev.date}</span>
                      <span><strong>Guests:</strong> {ev.guests}</span>
                      <span><strong>Client:</strong> {ev.customerName} ({ev.customerEmail})</span>
                      {ev.customerPhone && (
                        <span className="flex items-center gap-1">
                          <strong>Phone:</strong>
                          <a 
                            href={`tel:${ev.customerPhone.replace(/\s|-/g, '')}`}
                            className="flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            {ev.customerPhone}
                          </a>
                        </span>
                      )}
                    </div>
                    {ev.note && <p className="text-sm mt-2">Note: {ev.note}</p>}
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                      <Badge className={`capitalize ${getBookingStatusColor(status)}`}>{status}</Badge>
                      {ev.eventType && (
                        <Badge variant="outline" className="text-xs">
                          {ev.eventType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                      {isPending && (
                        <>
                          <Button 
                            onClick={() => openApprovalModal(ev)} 
                            size="sm"
                            disabled={processingIds.has(ev.id)}
                            className="min-w-[80px] hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => rejectEvent(ev)} 
                            size="sm"
                            disabled={processingIds.has(ev.id)}
                            className="min-w-[80px] hover:scale-105 transition-transform duration-200"
                          >
                            {processingIds.has(ev.id) ? "Processing..." : "Reject"}
                          </Button>
                        </>
                      )}
                      {isApproved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unapproveEvent(ev)}
                          disabled={processingIds.has(ev.id)}
                          className="gap-1 text-blue-600 hover:text-blue-700 min-w-[90px] hover:scale-105 transition-transform duration-200"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Unapprove
                        </Button>
                      )}
                      {isRejected && (
                        <Button 
                          variant="outline" 
                          onClick={() => approveRejectedEvent(ev)} 
                          size="sm"
                          disabled={processingIds.has(ev.id)}
                          className="min-w-[80px] hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          {processingIds.has(ev.id) ? "Processing..." : "Approve"}
                        </Button>
                      )}
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(ev)}
                        disabled={processingIds.has(ev.id)}
                        className="gap-1 text-blue-600 hover:text-blue-700 min-w-[70px] hover:scale-105 transition-transform duration-200"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      {isRejected && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(ev)}
                          disabled={processingIds.has(ev.id)}
                          className="gap-1 text-red-600 hover:text-red-700 min-w-[70px] hover:scale-105 transition-transform duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Created Events (pending) */}
      {viewType === "created" && (
        <div className="space-y-4">
          {createdEvents.length === 0 && (
            <Card className="p-6 text-muted-foreground">No client-created events yet.</Card>
          )}
          {createdEvents.map((ev) => (
            <Card key={ev.firestoreId || ev.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{ev.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{ev.venueName}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm">
                    <span><strong>Date:</strong> {ev.date}</span>
                    <span><strong>Guests:</strong> {ev.guests}</span>
                    <span><strong>Client:</strong> {ev.customerName} ({ev.customerEmail})</span>
                    {ev.customerPhone && (
                      <span className="flex items-center gap-1">
                        <strong>Phone:</strong>
                        <a 
                          href={`tel:${ev.customerPhone.replace(/\s|-/g, '')}`}
                          className="flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium"
                        >
                          <Phone className="w-3 h-3" />
                          {ev.customerPhone}
                        </a>
                      </span>
                    )}
                  </div>
                  {ev.note && <p className="text-sm mt-2">Note: {ev.note}</p>}
                </div>
                  <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                      <Badge className={`capitalize ${getBookingStatusColor("pending")}`}>pending</Badge>
                      {ev.eventType && (
                        <Badge variant="outline" className="text-xs">
                          {ev.eventType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                    <Button 
                      onClick={() => openApprovalModal(ev)} 
                      size="sm"
                      disabled={processingIds.has(ev.id)}
                      className="min-w-[80px] hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => rejectEvent(ev)} 
                      size="sm"
                      disabled={processingIds.has(ev.id)}
                      className="min-w-[80px] hover:scale-105 transition-transform duration-200"
                    >
                      {processingIds.has(ev.id) ? "Processing..." : "Reject"}
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(ev)}
                      disabled={processingIds.has(ev.id)}
                      className="gap-1 text-blue-600 hover:text-blue-700 min-w-[70px] hover:scale-105 transition-transform duration-200"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Booked Events - Cards */}
      {viewType === "booked" && (
        <div className="space-y-4">
          {bookedEvents.length === 0 && (
            <Card className="p-6 text-muted-foreground">No booked events yet.</Card>
          )}
          {bookedEvents.map((be) => (
            <Card key={be.firestoreId || be.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{be.name || "-"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{be.venueName || "-"}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm">
                    <span className="font-mono text-xs"><strong>ID:</strong> {be.id || "-"}</span>
                    <span><strong>Date:</strong> {be.date || "-"}</span>
                    <span><strong>Guests:</strong> {be.guests || "-"}</span>
                    <span><strong>Client:</strong> {be.customerName || "-"} {be.customerEmail ? `(${be.customerEmail})` : ""}</span>
                    {be.customerPhone && (
                      <span className="flex items-center gap-1">
                        <strong>Phone:</strong>
                        <a 
                          href={`tel:${be.customerPhone.replace(/\s|-/g, '')}`}
                          className="flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium"
                        >
                          <Phone className="w-3 h-3" />
                          {be.customerPhone}
                        </a>
                      </span>
                    )}
                  </div>
                  {be.note && <p className="text-sm mt-2">Note: {be.note}</p>}
                </div>
                <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <Badge className={`capitalize ${getBookingStatusColor(be.status)}`}>{be.status}</Badge>
                    {be.eventType && (
                      <Badge variant="outline" className="text-xs">
                        {be.eventType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unapproveEvent(be)}
                      disabled={processingIds.has(be.id)}
                      className="gap-1 text-blue-600 hover:text-blue-700 min-w-[90px] hover:scale-105 transition-transform duration-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Unapprove
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rejected Events View */}
      {viewType === "rejected" && (
        <div className="space-y-4">
          {rejectedEvents.length === 0 && (
            <Card className="p-6 text-muted-foreground">No rejected events.</Card>
          )}
          {rejectedEvents.map((ev) => (
            <Card key={ev.firestoreId || ev.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{ev.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{ev.venueName}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm">
                    <span><strong>Date:</strong> {ev.date}</span>
                    <span><strong>Guests:</strong> {ev.guests}</span>
                    <span><strong>Client:</strong> {ev.customerName} ({ev.customerEmail})</span>
                    {ev.customerPhone && (
                      <span className="flex items-center gap-1">
                        <strong>Phone:</strong>
                        <a 
                          href={`tel:${ev.customerPhone.replace(/\s|-/g, '')}`}
                          className="flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium"
                        >
                          <Phone className="w-3 h-3" />
                          {ev.customerPhone}
                        </a>
                      </span>
                    )}
                  </div>
                  {ev.note && <p className="text-sm mt-2">Note: {ev.note}</p>}
                </div>
                <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <Badge className={`capitalize ${getBookingStatusColor("cancelled")}`}>rejected</Badge>
                    {ev.eventType && (
                      <Badge variant="outline" className="text-xs">
                        {ev.eventType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => approveRejectedEvent(ev)}
                      disabled={processingIds.has(ev.id)}
                      className="gap-1 text-green-600 hover:text-green-700 min-w-[90px] hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEvent(ev)}
                      disabled={processingIds.has(ev.id)}
                      className="gap-1 text-red-600 hover:text-red-700 min-w-[70px] hover:scale-105 transition-transform duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Edit Event</h2>
                <button 
                  onClick={() => { setEditEvent(null); setEditData({}) }} 
                  className="text-muted-foreground hover:text-foreground"
                  disabled={processingIds.has(editEvent.id)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Event Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={editData.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Event name"
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={editData.date || ""}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Number of Guests <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={editData.guests || ""}
                      onChange={(e) => setEditData({ ...editData, guests: Number(e.target.value) })}
                      placeholder="Number of guests"
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Event Type
                    </label>
                    <select
                      value={editData.eventType || ""}
                      onChange={(e) => setEditData({ ...editData, eventType: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Select event type</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Corporate Event">Corporate Event</option>
                      <option value="Conference">Conference</option>
                      <option value="Party">Party</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={editData.customerName || ""}
                      onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                      placeholder="Customer name"
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Customer Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={editData.customerEmail || ""}
                      onChange={(e) => setEditData({ ...editData, customerEmail: e.target.value })}
                      placeholder="customer@email.com"
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Customer Phone
                    </label>
                    <Input
                      type="tel"
                      value={editData.customerPhone || ""}
                      onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                      placeholder="+254..."
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Note / Special Requests
                  </label>
                  <textarea
                    value={editData.note || ""}
                    onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                    placeholder="Any special requests or requirements..."
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setEditEvent(null); setEditData({}) }}
                    className="flex-1 hover:scale-105 transition-transform duration-200"
                    disabled={processingIds.has(editEvent.id)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                    disabled={processingIds.has(editEvent.id)}
                  >
                    {processingIds.has(editEvent.id) ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Approval Modal */}
      {approvalEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Approve Event</h2>
                <button 
                  onClick={() => setApprovalEvent(null)} 
                  className="text-muted-foreground hover:text-foreground"
                  disabled={processingIds.has(approvalEvent.id)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-1">Event: {approvalEvent.name}</p>
                <p className="text-xs text-muted-foreground">Venue: {approvalEvent.venueName}</p>
                <p className="text-xs text-muted-foreground">Customer: {approvalEvent.customerName}</p>
              </div>

              <form onSubmit={handleApprovalSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Agreed Amount (KES) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={approvalData.amount || ""}
                    onChange={(e) => setApprovalData({ ...approvalData, amount: Number(e.target.value) })}
                    placeholder="0.00"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={approvalData.paymentMethod}
                    onChange={(e) => setApprovalData({ ...approvalData, paymentMethod: e.target.value as "card" | "cash" | "mpesa" })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Call Notes / Discussion Summary
                  </label>
                  <textarea
                    value={approvalData.callNotes}
                    onChange={(e) => setApprovalData({ ...approvalData, callNotes: e.target.value })}
                    placeholder="Enter notes about what was discussed during the phone call..."
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApprovalEvent(null)}
                    className="flex-1 hover:scale-105 transition-transform duration-200"
                    disabled={processingIds.has(approvalEvent.id)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                    disabled={processingIds.has(approvalEvent.id)}
                  >
                    {processingIds.has(approvalEvent.id) ? "Processing..." : "Approve & Save"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Unapprove Warning Dialog */}
      <AlertDialog open={unapproveDialogOpen} onOpenChange={setUnapproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <AlertDialogTitle>Unapprove Event</AlertDialogTitle>
            </div>
            <div className="pt-2 space-y-3">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to unapprove "{eventToAction?.name}"?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Move the event back to "Created Events"</li>
                <li>Update the payment status to "Pending"</li>
                <li>Require re-approval if you want to proceed with this event</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnapproveEvent}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Yes, Unapprove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Warning Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-red-500" />
              <AlertDialogTitle>Reject Event</AlertDialogTitle>
            </div>
            <div className="pt-2 space-y-3">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to reject "{eventToAction?.name}"?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Move the event to "Rejected" status</li>
                <li>Mark the payment as "Failed"</li>
                <li>Notify the customer about the rejection</li>
              </ul>
              <div className="text-sm font-semibold text-red-600">
                This action cannot be easily undone!
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectEvent}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete/Cancel Warning Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Trash2 className="w-6 h-6 text-red-500" />
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
            </div>
            <div className="pt-2 space-y-3">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to delete "{eventToAction?.name}"?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Permanently delete the event from the database</li>
                <li>Delete all related payment entries</li>
                <li>Completely remove this event from the system</li>
              </ul>
              <div className="text-sm font-semibold text-red-600">
                This action cannot be undone!
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEvent}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={createEventModalOpen}
        onClose={() => setCreateEventModalOpen(false)}
        onSuccess={() => {
          setCreateEventModalOpen(false)
        }}
      />
      </div>
    </div>
  )
}

