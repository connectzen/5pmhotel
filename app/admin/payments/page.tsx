"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PaymentsTable } from "@/components/admin/payments-table"
import { Download, Trash2, RefreshCw } from "lucide-react"
import { collection, onSnapshot, deleteDoc, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [methodFilter, setMethodFilter] = useState<"all" | "card" | "mpesa" | "cash">("all")
  const [isCleaning, setIsCleaning] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => unsub()
  }, [])

  // Auto-sync payment status with bookings and events in real-time
  useEffect(() => {
    const syncPaymentsWithBookings = async () => {
      try {
        // Listen to bookings changes
        const bookingsUnsub = onSnapshot(collection(db, "bookings"), async (bookingsSnap) => {
          const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          
          // Get all payments
          const paymentsSnap = await getDocs(collection(db, "payments"))
          const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          
          // Update payments based on booking status
          for (const booking of bookings) {
            // Include all related payments (pending, completed, and failed) to handle state transitions
            const relatedPayments = payments.filter(p => 
              p.type === "booking" && p.bookingId === booking.id
            )
            
            for (const payment of relatedPayments) {
              let newStatus = payment.status
              
              if (booking.status === "approved") {
                // When booking is approved, update payment from pending or failed to completed
                if (payment.status === "pending" || payment.status === "failed") {
                  newStatus = "completed"
                }
              } else if ((booking.status === "rejected" || booking.status === "cancelled") && payment.status !== "failed") {
                // When booking is rejected/cancelled, mark payment as failed
                newStatus = "failed"
              } else if (booking.status === "checked-out" && payment.status !== "completed") {
                // When booking is checked-out, ensure payment is completed
                newStatus = "completed"
              }
              
              if (newStatus !== payment.status) {
                await setDoc(
                  doc(db, "payments", payment.id),
                  { status: newStatus, updatedAt: serverTimestamp() },
                  { merge: true }
                )
              }
            }
          }
        })

        // Listen to events changes
        const eventsUnsub = onSnapshot(collection(db, "clientEvents"), async (eventsSnap) => {
          const events = eventsSnap.docs.map(d => {
            const data = d.data()
            return { id: data.id || d.id, firestoreId: d.id, ...data }
          })
          
          // Get all payments
          const paymentsSnap = await getDocs(collection(db, "payments"))
          const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          
          // Update payments based on event status
          for (const event of events) {
            // Include all related payments (pending, completed, and failed) to handle state transitions
            // Match by both bookingId and check if it matches either event.id or event.firestoreId
            const relatedPayments = payments.filter(p => {
              if (p.type !== "event") return false
              const bookingId = p.bookingId || ""
              return bookingId === event.id || 
                     bookingId === event.firestoreId ||
                     p.id === event.id ||
                     p.id === event.firestoreId
            })
            
            for (const payment of relatedPayments) {
              let newStatus = payment.status
              
              if (event.status === "approved") {
                // When event is approved, update payment from pending or failed to completed
                // This handles transitions from both "created" (pending) and "rejected" (failed) to "approved" (completed)
                if (payment.status === "pending" || payment.status === "failed") {
                  newStatus = "completed"
                }
              } else if (event.status === "rejected") {
                // When event is rejected, mark payment as failed (unless already failed)
                if (payment.status !== "failed") {
                  newStatus = "failed"
                }
              }
              
              if (newStatus !== payment.status) {
                await setDoc(
                  doc(db, "payments", payment.id),
                  { status: newStatus, updatedAt: serverTimestamp() },
                  { merge: true }
                )
              }
            }
          }
        })

        return () => {
          bookingsUnsub()
          eventsUnsub()
        }
      } catch (error) {
        console.error("Error in payment auto-sync:", error)
      }
    }

    syncPaymentsWithBookings()
  }, [])

  const filteredPayments = payments.filter((payment) => {
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter
    return matchesMethod
  })

  const handleExportCSV = () => {
    const headers = ["Booking ID", "Amount", "Method", "Status", "Date"]
    const rows = filteredPayments.map((p) => [p.bookingId, p.amount, p.method, p.status, p.date])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "payments.csv"
    a.click()
  }

  const completedAmount = useMemo(() => filteredPayments.filter((p: any) => p.status === "completed").reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0), [filteredPayments])

  // Identify dummy/test payments (amount 0 or suspicious dates in the future)
  const dummyPayments = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    return payments.filter((payment) => {
      const amount = Number(payment.amount || 0)
      const paymentDate = payment.date ? new Date(payment.date) : null
      const isFutureDate = paymentDate && paymentDate > today
      const hasZeroAmount = amount === 0
      
      return hasZeroAmount || isFutureDate
    })
  }, [payments])

  const handleCleanDummyData = async () => {
    if (dummyPayments.length === 0) {
      alert("No dummy data found to clean.")
      return
    }

    if (!confirm(`Are you sure you want to delete ${dummyPayments.length} dummy/test payment(s)? This action cannot be undone.`)) {
      return
    }

    setIsCleaning(true)
    try {
      for (const payment of dummyPayments) {
        await deleteDoc(doc(db, "payments", payment.id))
      }
      alert(`Successfully deleted ${dummyPayments.length} dummy payment(s).`)
    } catch (error) {
      console.error("Failed to clean dummy data:", error)
      alert("Failed to clean dummy data. Please try again.")
    } finally {
      setIsCleaning(false)
    }
  }

  // Sync payment status with related approved events/bookings
  const handleSyncPaymentStatus = async () => {
    setIsSyncing(true)
    let updatedCount = 0

    try {
      // Get all pending payments
      const pendingPayments = payments.filter(p => p.status === "pending")
      
      for (const payment of pendingPayments) {
        let shouldBeCompleted = false

        // Check if linked to an approved event
        if (payment.type === "event" && payment.bookingId) {
          try {
            // First, try to find by the event's id field
            const eventsQuery = query(
              collection(db, "clientEvents"),
              where("id", "==", payment.bookingId)
            )
            const eventsSnapshot = await getDocs(eventsQuery)
            
            if (!eventsSnapshot.empty) {
              const eventData = eventsSnapshot.docs[0].data()
              if (eventData.status === "approved") {
                shouldBeCompleted = true
              }
            } else {
              // Also check if bookingId matches the firestore document ID directly
              try {
                const eventDoc = await getDoc(doc(db, "clientEvents", payment.bookingId))
                if (eventDoc.exists()) {
                  const eventData = eventDoc.data()
                  if (eventData.status === "approved") {
                    shouldBeCompleted = true
                  }
                }
              } catch (docError) {
                // Document doesn't exist or error accessing it - continue
              }
              
              // Also check all events and match by id field
              if (!shouldBeCompleted) {
                const allEventsSnapshot = await getDocs(collection(db, "clientEvents"))
                const matchingEvent = allEventsSnapshot.docs.find(doc => {
                  const data = doc.data()
                  return (data.id === payment.bookingId || doc.id === payment.bookingId) && data.status === "approved"
                })
                if (matchingEvent) {
                  shouldBeCompleted = true
                }
              }
            }
          } catch (error) {
            console.warn(`Error checking event ${payment.bookingId}:`, error)
          }
        }
        
        // Check if linked to an approved booking
        if (payment.type === "booking" && payment.bookingId) {
          try {
            const bookingDoc = await getDoc(doc(db, "bookings", payment.bookingId))
            if (bookingDoc.exists() && bookingDoc.data().status === "approved") {
              shouldBeCompleted = true
            }
          } catch (error) {
            console.warn(`Error checking booking ${payment.bookingId}:`, error)
          }
        }

        // Update payment status if it should be completed
        if (shouldBeCompleted) {
          await setDoc(
            doc(db, "payments", payment.id),
            { status: "completed", updatedAt: serverTimestamp() },
            { merge: true }
          )
          updatedCount++
        }
      }

      if (updatedCount > 0) {
        alert(`Successfully updated ${updatedCount} payment(s) to completed status.`)
      } else {
        alert("No payments needed to be updated.")
      }
    } catch (error) {
      console.error("Failed to sync payment status:", error)
      alert("Failed to sync payment status. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="p-6 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Track all payment transactions from bookings, events, rooms, and venues</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncPaymentStatus} 
            variant="outline" 
            className="gap-2 bg-transparent text-blue-600 hover:text-blue-700 border-blue-600"
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Payment Status'}
          </Button>
          {dummyPayments.length > 0 && (
            <Button 
              onClick={handleCleanDummyData} 
              variant="outline" 
              className="gap-2 bg-transparent text-orange-600 hover:text-orange-700 border-orange-600"
              disabled={isCleaning}
            >
              <Trash2 className="w-4 h-4" />
              Clean Dummy Data ({dummyPayments.length})
            </Button>
          )}
          <Button onClick={handleExportCSV} variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Completed Payments</p>
          <p className="text-3xl font-bold text-accent">KSh {completedAmount.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div>
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <div className="flex gap-2">
            {(["all", "card", "mpesa", "cash"] as const).map((method) => (
              <Button
                key={method}
                variant={methodFilter === method ? "default" : "outline"}
                onClick={() => setMethodFilter(method)}
                className="capitalize"
              >
                {method === "mpesa" ? "M-Pesa" : method}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <PaymentsTable payments={filteredPayments} />
    </div>
  )
}
