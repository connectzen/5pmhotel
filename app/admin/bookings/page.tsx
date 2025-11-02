"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookingsTable } from "@/components/admin/bookings-table"
import { BookingEditModal } from "@/components/admin/booking-edit-modal"
import { BookingDetailModal } from "@/components/admin/booking-detail-modal"
import { CreateBookingModal } from "@/components/admin/create-booking-modal"
import { TimePicker } from "@/components/admin/time-picker"
import { Search, X, Loader2, AlertTriangle, Plus } from "lucide-react"
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
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { differenceInCalendarDays, parseISO, isValid } from "date-fns"

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "rejected" | "checked-in" | "checked-out" | "cancelled"
  >(() => {
    const filter = searchParams.get("filter")
    if (filter === "pending" || filter === "rejected" || filter === "checked-in" || filter === "checked-out" || filter === "cancelled") {
      return filter
    }
    return "all"
  })
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [editingBooking, setEditingBooking] = useState<any | null>(null)
  const [approvalBooking, setApprovalBooking] = useState<any | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [approvalData, setApprovalData] = useState({
    amount: 0,
    selectedRoomId: "",
    paymentMethod: "mpesa" as "card" | "cash" | "mpesa",
    checkInTime: "",
    checkOutTime: "",
  })
  const [rooms, setRooms] = useState<any[]>([])
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [bookingToCheckout, setBookingToCheckout] = useState<any | null>(null)
  const [createBookingModalOpen, setCreateBookingModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => unsub()
  }, [])

  // Load rooms from Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map((d) => {
        const data = d.data()
        return { id: d.id, name: data.name, price: Number(data.price ?? 0) }
      }))
    })
    return () => unsub()
  }, [])

  // When rooms load and approval modal is open, recalculate amount if needed
  useEffect(() => {
    if (!approvalBooking || rooms.length === 0) return
    
    // If no room is selected yet, try to match the booking's room
    setApprovalData(prev => {
      if (prev.selectedRoomId) return prev // Already selected, don't change
      
      const matchingRoom = rooms.find(r => r.name === approvalBooking.room)
      if (!matchingRoom) return prev
      
      // Calculate nights from booking dates
      let nights = 1
      if (approvalBooking.dates) {
        const dates = (approvalBooking.dates || "").split(" - ")
        if (dates.length >= 2) {
          const checkInStr = dates[0].trim()
          const checkOutStr = dates[1].trim()
          
          const checkInParts = checkInStr.split("/")
          const checkOutParts = checkOutStr.split("/")
          
          let checkInDate: Date | null = null
          let checkOutDate: Date | null = null
          
          if (checkInParts.length === 3 && checkOutParts.length === 3) {
            const [dayIn, monthIn, yearIn] = checkInParts
            const [dayOut, monthOut, yearOut] = checkOutParts
            checkInDate = new Date(parseInt(yearIn), parseInt(monthIn) - 1, parseInt(dayIn))
            checkOutDate = new Date(parseInt(yearOut), parseInt(monthOut) - 1, parseInt(dayOut))
          } else {
            checkInDate = parseISO(checkInStr)
            checkOutDate = parseISO(checkOutStr)
          }
          
          if (isValid(checkInDate) && isValid(checkOutDate)) {
            nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
          }
        }
      } else if (approvalBooking.checkIn && approvalBooking.checkOut) {
        const checkInDate = parseISO(approvalBooking.checkIn)
        const checkOutDate = parseISO(approvalBooking.checkOut)
        if (isValid(checkInDate) && isValid(checkOutDate)) {
          nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
        }
      }
      
      const amount = matchingRoom.price * nights
      return {
        ...prev,
        selectedRoomId: matchingRoom.id,
        amount,
      }
    })
  }, [rooms, approvalBooking])

  // Calculate pending and expired checked-in bookings for notifications
  const pendingBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === "pending").length
  }, [bookings])

  // Real-time clock for monitoring
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every minute for real-time monitoring
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Helper function to check if booking checkout time has expired
  const isBookingCheckoutExpired = (booking: any) => {
    if (booking.status !== "checked-in") return { expired: false, expiredAt: null, elapsed: null }

    const now = currentTime
    let checkoutDateTime: Date | null = null

    // First, try to get checkout time (HH:MM format)
    const checkoutTime = (booking as any).checkOutTime || (booking as any).checkoutTime
    const checkoutDateStr = (booking as any).checkOutDate || (booking as any).checkOut || (booking as any).checkoutDate

    // Parse checkout date
    let checkoutDate: Date | null = null
    if (checkoutDateStr) {
      checkoutDate = new Date(checkoutDateStr)
      if (isNaN(checkoutDate.getTime())) checkoutDate = null
    }

    // If not found, try parsing from dates field
    if (!checkoutDate && booking.dates) {
      const dates = (booking.dates || "").split(" - ")
      if (dates.length >= 2) {
        const checkoutStr = dates[1].trim()
        const parts = checkoutStr.split("/")
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10)
          const year = parseInt(parts[2], 10)
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            checkoutDate = new Date(year, month - 1, day)
          }
        } else {
          checkoutDate = new Date(checkoutStr)
        }
        if (isNaN(checkoutDate.getTime())) checkoutDate = null
      }
    }

    if (!checkoutDate) return { expired: false, expiredAt: null, elapsed: null }

    // Parse checkout time (HH:MM format) if available
    if (checkoutTime && typeof checkoutTime === 'string' && checkoutTime.includes(':')) {
      const [hours, minutes] = checkoutTime.split(':').map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        checkoutDateTime = new Date(checkoutDate)
        checkoutDateTime.setHours(hours, minutes, 0, 0)
      }
    }

    // If no checkout time specified, default to 11:00 AM
    if (!checkoutDateTime) {
      checkoutDateTime = new Date(checkoutDate)
      checkoutDateTime.setHours(11, 0, 0, 0)
    }

    const expired = now > checkoutDateTime
    const elapsed = expired ? Math.floor((now.getTime() - checkoutDateTime.getTime()) / (1000 * 60)) : null // in minutes

    return { expired, expiredAt: checkoutDateTime, elapsed }
  }

  const expiredBookings = useMemo(() => {
    return bookings.map(booking => {
      const expiration = isBookingCheckoutExpired(booking)
      return { booking, ...expiration }
    }).filter(item => item.expired)
  }, [bookings, currentTime])

  const expiredCheckedInCount = expiredBookings.length

  // Browser notifications for expired checkouts
  useEffect(() => {
    if (expiredCheckedInCount > 0 && typeof window !== 'undefined' && 'Notification' in window) {
      // Request permission if not granted
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }

      // Show notification if permission granted
      if (Notification.permission === 'granted') {
        const notification = new Notification(`🚨 ${expiredCheckedInCount} Checkout${expiredCheckedInCount > 1 ? 's' : ''} Expired`, {
          body: `You have ${expiredCheckedInCount} checked-in guest${expiredCheckedInCount > 1 ? 's' : ''} whose checkout time has expired. Please check them out.`,
          icon: '/favicon.ico',
          tag: 'expired-checkout',
          requireInteraction: true,
          badge: '/favicon.ico'
        })

        // Close notification after 10 seconds
        setTimeout(() => notification.close(), 10000)
      }
    }
  }, [expiredCheckedInCount])

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const email = (booking as any).email || ""
    const matchesSearch =
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter
    return matchesSearch && matchesStatus
  }), [bookings, searchTerm, statusFilter])

  const openApprovalModal = (booking: any) => {
    setApprovalBooking(booking)
    // Set default check-in time to current time
    const now = new Date()
    const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    // Find the room that matches the booking's room name
    const matchingRoom = rooms.find(r => r.name === booking.room)
    const selectedRoomId = matchingRoom?.id || ""
    
    // Calculate nights from booking dates
    let nights = 1
    if (booking.dates) {
      const dates = (booking.dates || "").split(" - ")
      if (dates.length >= 2) {
        const checkInStr = dates[0].trim()
        const checkOutStr = dates[1].trim()
        
        // Try to parse DD/MM/YYYY format
        const checkInParts = checkInStr.split("/")
        const checkOutParts = checkOutStr.split("/")
        
        let checkInDate: Date | null = null
        let checkOutDate: Date | null = null
        
        if (checkInParts.length === 3 && checkOutParts.length === 3) {
          const [dayIn, monthIn, yearIn] = checkInParts
          const [dayOut, monthOut, yearOut] = checkOutParts
          checkInDate = new Date(parseInt(yearIn), parseInt(monthIn) - 1, parseInt(dayIn))
          checkOutDate = new Date(parseInt(yearOut), parseInt(monthOut) - 1, parseInt(dayOut))
        } else {
          // Try ISO format
          checkInDate = parseISO(checkInStr)
          checkOutDate = parseISO(checkOutStr)
        }
        
        if (isValid(checkInDate) && isValid(checkOutDate)) {
          nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
        }
      }
    } else if (booking.checkIn && booking.checkOut) {
      // Try alternative date fields
      const checkInDate = parseISO(booking.checkIn)
      const checkOutDate = parseISO(booking.checkOut)
      if (isValid(checkInDate) && isValid(checkOutDate)) {
        nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
      }
    }
    
    // Calculate amount based on selected room and nights
    const amount = matchingRoom ? matchingRoom.price * nights : (booking.amount ?? 0)
    
    setApprovalData({
      amount,
      selectedRoomId,
      paymentMethod: "mpesa",
      checkInTime: defaultTime,
      checkOutTime: "",
    })
  }

  const handleApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approvalBooking || isApproving) return
    
    if (!approvalData.amount || approvalData.amount <= 0) {
      alert("Please select a room")
      return
    }

    if (!approvalData.selectedRoomId) {
      alert("Please select a room")
      return
    }

    setIsApproving(true)
    try {
      // Get selected room details
      const selectedRoom = rooms.find(r => r.id === approvalData.selectedRoomId)
      if (!selectedRoom) {
        alert("Selected room not found. Please select a valid room.")
        setIsApproving(false)
        return
      }

      // Check if booking dates have expired
      const now = new Date()
      let hasExpired = false
      
      // Parse checkout date from booking.dates or alternative fields
      const checkOut = (approvalBooking as any).checkOutDate || (approvalBooking as any).checkOut || (approvalBooking as any).checkoutDate
      let checkoutDate: Date | null = null
      
      if (checkOut) {
        checkoutDate = new Date(checkOut)
        if (isNaN(checkoutDate.getTime())) checkoutDate = null
      }
      
      if (!checkoutDate && approvalBooking.dates) {
        const dates = (approvalBooking.dates || "").split(" - ")
        if (dates.length >= 2) {
          const checkoutStr = dates[1].trim()
          const parts = checkoutStr.split("/")
          if (parts.length === 3) {
            const [day, month, year] = parts
            checkoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else {
            checkoutDate = new Date(checkoutStr)
          }
          if (isNaN(checkoutDate.getTime())) checkoutDate = null
        }
      }
      
      if (checkoutDate) {
        checkoutDate.setHours(12, 0, 0, 0) // Set to noon
        hasExpired = checkoutDate < now
      }

      // Determine status: if check-in time is provided, automatically check in
      const finalStatus = approvalData.checkInTime ? "checked-in" : "approved"
      
      // Update booking with selected room and calculated amount
      await setDoc(
        doc(db, "bookings", approvalBooking.id),
        { 
          status: finalStatus,
          amount: approvalData.amount,
          room: selectedRoom.name, // Update room name if different
          paymentMethod: approvalData.paymentMethod,
          checkInTime: approvalData.checkInTime || null,
          checkOutTime: approvalData.checkOutTime || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      
      // Check if payment already exists for this booking
      const paymentsQuery = query(
        collection(db, "payments"),
        where("bookingId", "==", approvalBooking.id),
        where("type", "==", "booking")
      )
      const paymentsSnapshot = await getDocs(paymentsQuery)
      
      const paymentData = {
        bookingId: approvalBooking.id,
        type: "booking",
        amount: approvalData.amount,
        method: approvalData.paymentMethod,
        status: "completed",
        date: new Date().toISOString().slice(0, 10),
        customerName: approvalBooking.customer || "",
        room: approvalBooking.room || "",
        notes: hasExpired ? "Booking re-approved after expiration" : "Booking approved",
        updatedAt: serverTimestamp(),
      }

      if (!paymentsSnapshot.empty) {
        // Payment exists - ALWAYS update it instead of creating duplicate
        // This ensures that after mistaken checkout, we update the existing payment
        // rather than creating a new one when re-approved
        const existingPayment = paymentsSnapshot.docs[0]
        await setDoc(
          doc(db, "payments", existingPayment.id),
          paymentData,
          { merge: true }
        )
      } else {
        // No existing payment - create new one
        await addDoc(collection(db, "payments"), {
          ...paymentData,
          createdAt: serverTimestamp(),
        })
      }
      
      setApprovalBooking(null)
      setApprovalData({
        amount: 0,
        selectedRoomId: "",
        paymentMethod: "mpesa",
        checkInTime: "",
      })
    } catch (error) {
      console.error("Failed to approve booking:", error)
      alert("Failed to approve booking. Please try again.")
    } finally {
      setIsApproving(false)
    }
  }

  const handleStatusChange = async (
    bookingId: string,
    newStatus: "pending" | "approved" | "rejected" | "checked-in" | "checked-out" | "cancelled",
  ) => {
    const existing = bookings.find((b) => b.id === bookingId)
    if (!existing) return
    
    // If approving a cancelled booking (reapproving), set to pending for review
    if (newStatus === "approved" && existing.status === "cancelled") {
      try {
        await setDoc(
          doc(db, "bookings", bookingId),
          { status: "pending", updatedAt: serverTimestamp() },
          { merge: true }
        )
        
        // Update payment status to pending if payment exists
        try {
          const paymentsQuery = query(
            collection(db, "payments"),
            where("bookingId", "==", bookingId),
            where("type", "==", "booking")
          )
          const paymentsSnapshot = await getDocs(paymentsQuery)
          
          if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0]
            await setDoc(
              doc(db, "payments", paymentDoc.id),
              {
                status: "pending",
                notes: "Booking was reapproved and needs review",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          }
        } catch (paymentError) {
          console.warn("Failed to update payment entry:", paymentError)
        }
      } catch (error) {
        console.error("Failed to reapprove booking:", error)
        alert("Failed to reapprove booking. Please try again.")
      }
      return
    }
    
    // If approving a new booking or re-approving a rejected booking, open approval modal
    if (newStatus === "approved" && (existing.status !== "approved" || existing.status === "rejected")) {
      openApprovalModal(existing)
      return
    }
    
    // If checking out, show confirmation dialog
    if (newStatus === "checked-out" && existing.status === "checked-in") {
      setBookingToCheckout(existing)
      setCheckoutDialogOpen(true)
      return
    }
    
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        { status: newStatus, updatedAt: serverTimestamp() },
        { merge: true }
      )
      
      // Update or create payment entries based on status
      if (newStatus === "rejected" || newStatus === "cancelled") {
        try {
          // Check if payment already exists
          const paymentsQuery = query(
            collection(db, "payments"),
            where("bookingId", "==", existing.id),
            where("type", "==", "booking")
          )
          const paymentsSnapshot = await getDocs(paymentsQuery)
          
          if (!paymentsSnapshot.empty) {
            // Update existing payment to failed
            const paymentDoc = paymentsSnapshot.docs[0]
            await setDoc(
              doc(db, "payments", paymentDoc.id),
              {
                status: "failed",
                notes: `Booking was ${newStatus}`,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          } else {
            // Create failed payment entry
            await addDoc(collection(db, "payments"), {
              bookingId: existing.id,
              type: "booking",
              amount: existing.amount ?? 0,
              method: "cash",
              status: "failed",
              date: new Date().toISOString().slice(0, 10),
              customerName: existing.customer || "",
              room: existing.room || "",
              notes: `Booking was ${newStatus}`,
              createdAt: serverTimestamp(),
            })
          }
        } catch (paymentError) {
          console.warn("Failed to update payment entry:", paymentError)
        }
      } else if (newStatus === "checked-out") {
        // When checked out, ensure payment is completed
        try {
          const paymentsQuery = query(
            collection(db, "payments"),
            where("bookingId", "==", existing.id),
            where("type", "==", "booking")
          )
          const paymentsSnapshot = await getDocs(paymentsQuery)
          
          if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0]
            await setDoc(
              doc(db, "payments", paymentDoc.id),
              {
                status: "completed",
                notes: "Booking checked out",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            )
          }
        } catch (paymentError) {
          console.warn("Failed to update payment on check-out:", paymentError)
        }
      }
    } catch (error) {
      console.error("Failed to update booking status:", error)
      alert("Failed to update booking status. Please try again.")
    }
  }

  const handleEditSave = (next: any) => {
    setDoc(doc(db, "bookings", next.id), { ...next, updatedAt: serverTimestamp() }, { merge: true })
  }

  const handleCheckout = async (isMistake: boolean) => {
    if (!bookingToCheckout) return
    
    setCheckoutDialogOpen(false)
    
    try {
      if (isMistake) {
        // If checkout was by mistake:
        // 1. Update payment: reset amount to 0, change status to "pending"
        // 2. Update booking: change status back to "pending" (requires re-approval)
        // 3. Mark payment with flag to indicate it should be UPDATED not recreated on re-approval
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", bookingToCheckout.id),
          where("type", "==", "booking")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        if (!paymentsSnapshot.empty) {
          // Update existing payment - do not create new one
          const paymentDoc = paymentsSnapshot.docs[0]
          await setDoc(
            doc(db, "payments", paymentDoc.id),
            {
              amount: 0,
              status: "pending",
              notes: "Checkout was by mistake - reset amount and requires re-approval",
              // Preserve original payment data to ensure we can update it later
              customerName: bookingToCheckout.customer || "",
              room: bookingToCheckout.room || "",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } else {
          // If payment doesn't exist (shouldn't happen but handle it), create one
          await addDoc(collection(db, "payments"), {
            bookingId: bookingToCheckout.id,
            type: "booking",
            amount: 0,
            method: "cash",
            status: "pending",
            date: new Date().toISOString().slice(0, 10),
            customerName: bookingToCheckout.customer || "",
            room: bookingToCheckout.room || "",
            notes: "Checkout was by mistake - reset amount and requires re-approval",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        
        // Update booking status back to pending and reset amount (requires re-approval)
        await setDoc(
          doc(db, "bookings", bookingToCheckout.id),
          { 
            status: "pending",
            amount: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      } else {
        // If checkout was NOT by mistake:
        // 1. Keep payment amount (already completed)
        // 2. Change booking status to checked-out
        await setDoc(
          doc(db, "bookings", bookingToCheckout.id),
          { 
            status: "checked-out",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        
        // Ensure payment is marked as completed in Firebase
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", bookingToCheckout.id),
          where("type", "==", "booking")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        if (!paymentsSnapshot.empty) {
          const paymentDoc = paymentsSnapshot.docs[0]
          await setDoc(
            doc(db, "payments", paymentDoc.id),
            {
              status: "completed",
              notes: "Booking checked out",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        }
      }
    } catch (error) {
      console.error("Failed to process checkout:", error)
      alert("Failed to process checkout. Please try again.")
    } finally {
      setBookingToCheckout(null)
    }
  }

  const handleDeleteClick = (bookingId: string) => {
    setBookingToDelete(bookingId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return
    
    setDeleteDialogOpen(false)
    
    // Also delete related payment entries from the backend
    try {
      const paymentsQuery = query(
        collection(db, "payments"),
        where("bookingId", "==", bookingToDelete),
        where("type", "==", "booking")
      )
      const paymentsSnapshot = await getDocs(paymentsQuery)
      
      // Delete all related payments
      for (const paymentDoc of paymentsSnapshot.docs) {
        await deleteDoc(doc(db, "payments", paymentDoc.id))
      }
    } catch (paymentError) {
      console.warn("Failed to delete payment entries:", paymentError)
    }
    
    // Delete the booking document from Firebase
    await deleteDoc(doc(db, "bookings", bookingToDelete))
    
    setBookingToDelete(null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage all room and venue bookings</p>
        </div>
        <Button
          onClick={() => setCreateBookingModalOpen(true)}
          className="gap-2 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create Booking
        </Button>
      </div>

      {/* Prominent Alert for expired checked-in bookings */}
      {expiredCheckedInCount > 0 && (
        <Card className="p-6 bg-red-50 border-red-400 border-2 animate-pulse shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-ping">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-1">
                🚨 URGENT: {expiredCheckedInCount} Checkout{expiredCheckedInCount > 1 ? 's' : ''} Expired
              </h3>
              <p className="text-sm font-medium text-red-800 mb-2">
                {expiredCheckedInCount > 1 
                  ? `${expiredCheckedInCount} checked-in guests have exceeded their checkout time.`
                  : 'A checked-in guest has exceeded their checkout time.'
                }
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {expiredBookings.slice(0, 3).map(({ booking, elapsed }) => {
                  const hours = elapsed ? Math.floor(elapsed / 60) : 0
                  const minutes = elapsed ? elapsed % 60 : 0
                  return (
                    <div key={booking.id} className="text-xs bg-red-100 px-2 py-1 rounded border border-red-300">
                      <span className="font-semibold">{booking.customer}</span> - 
                      <span className="ml-1">{booking.room}</span> - 
                      <span className="ml-1 text-red-700">
                        Expired {hours > 0 ? `${hours}h ` : ''}{minutes}m ago
                      </span>
                    </div>
                  )
                })}
                {expiredCheckedInCount > 3 && (
                  <div className="text-xs bg-red-100 px-2 py-1 rounded border border-red-300">
                    +{expiredCheckedInCount - 3} more
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter("checked-in")}
                className="border-red-300 text-red-700 hover:bg-red-100 hover:scale-105 transition-transform duration-200 font-semibold"
              >
                View All Expired
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, ID or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "rejected", "checked-in", "checked-out", "cancelled"] as const).map(
              (status) => {
                const getBadgeCount = () => {
                  if (status === "pending") return pendingBookingsCount
                  if (status === "checked-in") return expiredCheckedInCount
                  return 0
                }
                const badgeCount = getBadgeCount()
                
                return (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}
                    className="capitalize relative hover:scale-105 transition-transform duration-200"
                  >
                    {status === "checked-in" && badgeCount > 0 && (
                      <AlertTriangle className="w-4 h-4 mr-1.5 text-red-600" />
                    )}
                    {status}
                    {badgeCount > 0 && (
                      <span className="ml-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Button>
                )
              },
            )}
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      <BookingsTable
        bookings={filteredBookings}
        onSelectBooking={setSelectedBooking}
        onStatusChange={handleStatusChange}
        onEdit={(b) => setEditingBooking(b)}
        onDelete={handleDeleteClick}
      />

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
          onApprove={() => openApprovalModal(selectedBooking)}
        />
      )}

      {editingBooking && (
        <BookingEditModal booking={editingBooking} onSave={handleEditSave} onClose={() => setEditingBooking(null)} />
      )}

      {/* Approval Modal */}
      {approvalBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {approvalBooking.status === "rejected" ? "Re-approve Booking" : "Approve Booking"}
                </h2>
                <button 
                  onClick={() => { setApprovalBooking(null); setApprovalData({ amount: 0, selectedRoomId: "", paymentMethod: "mpesa", checkInTime: "", checkOutTime: "" }) }} 
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-1">Booking: {approvalBooking.id}</p>
                <p className="text-xs text-muted-foreground">Customer: {approvalBooking.customer}</p>
                <p className="text-xs text-muted-foreground">
                  Current Room: {approvalBooking.room || "Not assigned"} 
                  {approvalBooking.dates && ` | Dates: ${approvalBooking.dates}`}
                </p>
                {approvalBooking.dates && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-blue-600">Note: You can select a different room below if needed. The amount will be recalculated automatically.</span>
                  </p>
                )}
              </div>

              <form onSubmit={handleApprovalSubmit} className="space-y-4 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Select Room <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={approvalData.selectedRoomId}
                      onChange={(e) => {
                        const selectedRoom = rooms.find(r => r.id === e.target.value)
                        if (selectedRoom) {
                          // Calculate nights from booking dates
                          let nights = 1
                          if (approvalBooking.dates) {
                            const dates = (approvalBooking.dates || "").split(" - ")
                            if (dates.length >= 2) {
                              const checkInStr = dates[0].trim()
                              const checkOutStr = dates[1].trim()
                              
                              const checkInParts = checkInStr.split("/")
                              const checkOutParts = checkOutStr.split("/")
                              
                              let checkInDate: Date | null = null
                              let checkOutDate: Date | null = null
                              
                              if (checkInParts.length === 3 && checkOutParts.length === 3) {
                                const [dayIn, monthIn, yearIn] = checkInParts
                                const [dayOut, monthOut, yearOut] = checkOutParts
                                checkInDate = new Date(parseInt(yearIn), parseInt(monthIn) - 1, parseInt(dayIn))
                                checkOutDate = new Date(parseInt(yearOut), parseInt(monthOut) - 1, parseInt(dayOut))
                              } else {
                                checkInDate = parseISO(checkInStr)
                                checkOutDate = parseISO(checkOutStr)
                              }
                              
                              if (isValid(checkInDate) && isValid(checkOutDate)) {
                                nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
                              }
                            }
                          } else if (approvalBooking.checkIn && approvalBooking.checkOut) {
                            const checkInDate = parseISO(approvalBooking.checkIn)
                            const checkOutDate = parseISO(approvalBooking.checkOut)
                            if (isValid(checkInDate) && isValid(checkOutDate)) {
                              nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
                            }
                          }
                          
                          const calculatedAmount = selectedRoom.price * nights
                          setApprovalData({
                            ...approvalData,
                            selectedRoomId: e.target.value,
                            amount: calculatedAmount,
                          })
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      required
                    >
                      <option value="">-- Select Room --</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} - KSh {room.price.toLocaleString()} per night
                        </option>
                      ))}
                    </select>
                    {approvalData.selectedRoomId && approvalData.amount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculated Amount: KSh {approvalData.amount.toLocaleString()}
                      </p>
                    )}
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

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2 text-foreground">
                      Check-in Time <span className="text-red-500">*</span>
                    </label>
                    <TimePicker
                      value={approvalData.checkInTime}
                      onChange={(time) => {
                        // Calculate checkout time automatically based on check-in time and checkout date
                        let autoCheckOutTime = ""
                        if (time && approvalBooking) {
                          // Standard hotel checkout time is 11:00 AM on the checkout date
                          // This applies to all bookings regardless of duration
                          autoCheckOutTime = "11:00"
                        }
                        setApprovalData({ ...approvalData, checkInTime: time, checkOutTime: autoCheckOutTime || approvalData.checkOutTime })
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Set the expected check-in time for this booking</p>
                  </div>
                  {approvalData.checkInTime && (
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2 text-foreground">
                        Check-out Time {approvalData.checkOutTime ? "(Auto-calculated)" : ""}
                      </label>
                      <TimePicker
                        value={approvalData.checkOutTime || "11:00"}
                        onChange={(time) => setApprovalData({ ...approvalData, checkOutTime: time })}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-calculated to 11:00 AM on checkout date. You can adjust if needed.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setApprovalBooking(null); setApprovalData({ amount: 0, selectedRoomId: "", paymentMethod: "mpesa", checkInTime: "", checkOutTime: "" }); setIsApproving(false) }}
                    className="flex-1 hover:scale-105 transition-transform duration-200"
                    disabled={isApproving}
                  >
                    Cancel
                  </Button>
                  {approvalBooking.status === "rejected" ? (
                    <Button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                      disabled={isApproving}
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Re-approving...
                        </>
                      ) : (
                        "Re-approve & Save"
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="flex-1 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
                      disabled={isApproving}
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        "Approve & Save"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Checkout Confirmation Dialog */}
      <AlertDialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <AlertDialogTitle>Check-out Confirmation</AlertDialogTitle>
            </div>
            <div className="pt-2 space-y-3">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Was this checkout done by mistake?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                Booking Details:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Customer: {bookingToCheckout?.customer}</li>
                <li>Room: {bookingToCheckout?.room}</li>
                <li>Dates: {bookingToCheckout?.dates}</li>
              </ul>
              <div className="text-sm text-muted-foreground mt-4">
                <strong>If by mistake:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Payment amount will be reset to 0</li>
                  <li>Booking status will return to "Pending"</li>
                  <li>Customer will need to be re-approved</li>
                  <li>After re-approval, customer can be checked in again</li>
                </ul>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <strong>If not by mistake:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Payment amount will remain the same</li>
                  <li>Booking status will be "Checked-Out"</li>
                  <li>Checkout is final</li>
                </ul>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToCheckout(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCheckout(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Yes, It Was a Mistake
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleCheckout(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              No, Not a Mistake
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={createBookingModalOpen}
        onClose={() => setCreateBookingModalOpen(false)}
        onSuccess={() => {
          setCreateBookingModalOpen(false)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            </div>
            <div className="space-y-2">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to delete this booking?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Permanently delete the booking from the database</li>
                <li>Delete all related payment entries</li>
                <li>Completely remove this booking from the system</li>
              </ul>
              <div className="text-sm font-semibold text-red-600 mt-3">
                This action cannot be undone!
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
