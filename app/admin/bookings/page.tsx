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
import { Search, X, Loader2, AlertTriangle, Plus, XCircle, LogIn } from "lucide-react"
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
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, serverTimestamp, query, where, getDocs, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { differenceInCalendarDays, parseISO, isValid, format, addDays, isPast, isToday, startOfDay } from "date-fns"

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
    updatedDates: "", // Store auto-calculated dates if booking date is past
  })
  const [rooms, setRooms] = useState<any[]>([])
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [bookingToCheckout, setBookingToCheckout] = useState<any | null>(null)
  const [createBookingModalOpen, setCreateBookingModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false)
  const [bookingToAction, setBookingToAction] = useState<any | null>(null)

  // Helper: write a status transition/audit entry to Firestore
  const logStatusHistory = async (
    bookingId: string,
    fromStatus: string,
    toStatus: string,
    note?: string,
  ) => {
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        {
          statusHistory: arrayUnion({
            from: fromStatus,
            to: toStatus,
            note: note || null,
            at: serverTimestamp(),
          }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (e) {
      console.warn("Failed to write status history:", e)
    }
  }

  // Helper: write a generic edit audit entry
  const logEditHistory = async (bookingId: string, note?: string) => {
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        {
          statusHistory: arrayUnion({
            event: "edited",
            note: note || null,
            at: serverTimestamp(),
          }),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (e) {
      console.warn("Failed to write edit history:", e)
    }
  }

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
    // Update time every 5 seconds for real-time monitoring of expired bookings
    // This ensures expired bookings are detected quickly
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 5000) // Update every 5 seconds for faster detection

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
      // Parse ISO YYYY-MM-DD as LOCAL date to avoid UTC timezone shifts
      if (checkoutDateStr.includes('-') && checkoutDateStr.length === 10) {
        const [y, m, d] = checkoutDateStr.split('-').map((v) => parseInt(v, 10))
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          checkoutDate = new Date(y, m - 1, d)
        }
      } else {
        checkoutDate = new Date(checkoutDateStr)
        if (isNaN(checkoutDate.getTime())) checkoutDate = null
      }
    }

    // If not found, try parsing from dates field (DD/MM/YYYY format) - this is the main format used
    if (!checkoutDate && booking.dates) {
      const dates = (booking.dates || "").split(" - ")
      if (dates.length >= 2) {
        const checkoutStr = dates[1].trim()
        // Parse DD/MM/YYYY format (e.g., "03/11/2025")
        const parts = checkoutStr.split("/")
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10)
          const year = parseInt(parts[2], 10)
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && month > 0 && month <= 12 && year > 2000) {
            checkoutDate = new Date(year, month - 1, day)
            // Validate the date was created correctly
            if (isNaN(checkoutDate.getTime()) || checkoutDate.getFullYear() !== year) {
              checkoutDate = null
            }
          }
        } else {
          // Try ISO format if DD/MM/YYYY parsing failed
          checkoutDate = parseISO(checkoutStr)
          if (!isValid(checkoutDate)) checkoutDate = null
        }
        if (checkoutDate && isNaN(checkoutDate.getTime())) checkoutDate = null
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

  // Sort bookings to put expired checked-in bookings at the top
  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter((booking) => {
      const email = (booking as any).email || ""
      const matchesSearch =
        booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter
      return matchesSearch && matchesStatus
    })
    
    // Sort: expired checked-in bookings first, then others
    return filtered.sort((a, b) => {
      const aExpired = isBookingCheckoutExpired(a).expired
      const bExpired = isBookingCheckoutExpired(b).expired
      
      if (aExpired && !bExpired) return -1
      if (!aExpired && bExpired) return 1
      if (aExpired && bExpired) {
        // Both expired - sort by how overdue (most overdue first)
        const aElapsed = isBookingCheckoutExpired(a).elapsed || 0
        const bElapsed = isBookingCheckoutExpired(b).elapsed || 0
        return bElapsed - aElapsed
      }
      return 0
    })
  }, [bookings, searchTerm, statusFilter, currentTime])

  const openApprovalModal = (booking: any) => {
    setApprovalBooking(booking)
    
    const now = new Date()
    const today = startOfDay(now)
    const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    // Find the room that matches the booking's room name
    const matchingRoom = rooms.find(r => r.name === booking.room)
    const selectedRoomId = matchingRoom?.id || ""
    
    // Calculate nights from booking dates and check if dates need to be updated
    let nights = 1
    let updatedDates = "" // Will store auto-calculated dates if booking date is past/today
    let needsDateUpdate = false
    
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
          
          // Check if check-in date is today or in the past
          const checkInStart = startOfDay(checkInDate)
          if (isPast(checkInStart) || isToday(checkInStart)) {
            // Auto-calculate new dates based on today
            needsDateUpdate = true
            const newCheckInDate = today
            const newCheckOutDate = addDays(today, nights)
            
            // Format as DD/MM/YYYY
            updatedDates = `${format(newCheckInDate, 'dd/MM/yyyy')} - ${format(newCheckOutDate, 'dd/MM/yyyy')}`
          }
        }
      }
    } else if (booking.checkIn && booking.checkOut) {
      // Try alternative date fields
      const checkInDate = parseISO(booking.checkIn)
      const checkOutDate = parseISO(booking.checkOut)
      if (isValid(checkInDate) && isValid(checkOutDate)) {
        nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
        
        // Check if check-in date is today or in the past
        const checkInStart = startOfDay(checkInDate)
        if (isPast(checkInStart) || isToday(checkInStart)) {
          // Auto-calculate new dates based on today
          needsDateUpdate = true
          const newCheckInDate = today
          const newCheckOutDate = addDays(today, nights)
          
          // Format as DD/MM/YYYY
          updatedDates = `${format(newCheckInDate, 'dd/MM/yyyy')} - ${format(newCheckOutDate, 'dd/MM/yyyy')}`
        }
      }
    }
    
    // Only set default dates if we actually need an update
    // This handles cases where dates couldn't be parsed but we still need defaults
    // Note: We don't auto-update if the original check-in date is in the future
    
    // Calculate amount based on selected room and nights
    const amount = matchingRoom ? matchingRoom.price * nights : (booking.amount ?? 0)
    
    setApprovalData({
      amount,
      selectedRoomId,
      paymentMethod: "mpesa",
      checkInTime: defaultTime,
      checkOutTime: "",
      updatedDates: updatedDates,
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
      
      // Prepare update data
      const updateData: any = {
        status: finalStatus,
        amount: approvalData.amount,
        room: selectedRoom.name, // Update room name if different
        paymentMethod: approvalData.paymentMethod,
        checkInTime: approvalData.checkInTime || null,
        // Default check-out time to 11:00 if check-in time is set but check-out time is not
        checkOutTime: approvalData.checkOutTime || (approvalData.checkInTime ? "11:00" : null),
        updatedAt: serverTimestamp(),
      }
      
      // If dates were auto-calculated (booking was for past/today), update the dates field
      if (approvalData.updatedDates) {
        updateData.dates = approvalData.updatedDates
        // Also update checkIn and checkOut dates in ISO format for compatibility
        const datesParts = approvalData.updatedDates.split(" - ")
        if (datesParts.length === 2) {
          const [dayIn, monthIn, yearIn] = datesParts[0].trim().split("/")
          const [dayOut, monthOut, yearOut] = datesParts[1].trim().split("/")
          if (dayIn && monthIn && yearIn) {
            const newCheckIn = new Date(parseInt(yearIn), parseInt(monthIn) - 1, parseInt(dayIn))
            const newCheckOut = new Date(parseInt(yearOut), parseInt(monthOut) - 1, parseInt(dayOut))
            updateData.checkIn = format(newCheckIn, 'yyyy-MM-dd')
            updateData.checkOut = format(newCheckOut, 'yyyy-MM-dd')
          }
        }
      }
      
      // Update booking with selected room and calculated amount
      await setDoc(
        doc(db, "bookings", approvalBooking.id),
        updateData,
        { merge: true }
      )
      // Log status transition
      await logStatusHistory(approvalBooking.id, approvalBooking.status || "unknown", finalStatus, "approve")
      
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
        checkOutTime: "",
        updatedDates: "",
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
    
    // If approving (pending, rejected, or cancelled) - always show approval modal
    if (newStatus === "approved" && existing.status !== "approved") {
      openApprovalModal(existing)
      return
    }
    
    // If rejecting, show confirmation dialog
    if (newStatus === "rejected") {
      setBookingToAction(existing)
      setRejectDialogOpen(true)
      return
    }
    
    // If cancelling, show confirmation dialog
    if (newStatus === "cancelled") {
      setBookingToAction(existing)
      setCancelDialogOpen(true)
      return
    }
    
    // If checking in, show confirmation dialog
    if (newStatus === "checked-in" && existing.status === "approved") {
      setBookingToAction(existing)
      setCheckinDialogOpen(true)
      return
    }
    
    // If checking out, show confirmation dialog
    if (newStatus === "checked-out" && existing.status === "checked-in") {
      setBookingToCheckout(existing)
      setCheckoutDialogOpen(true)
      return
    }
    
    // This section handles any remaining direct status updates
    // Most actions now go through confirmation dialogs above
    // This should rarely be reached now since all major actions have confirmations
    try {
      await setDoc(
        doc(db, "bookings", bookingId),
        { status: newStatus, updatedAt: serverTimestamp() },
        { merge: true }
      )
      await logStatusHistory(bookingId, existing.status, newStatus, "direct status change")
    } catch (error) {
      console.error("Failed to update booking status:", error)
      alert("Failed to update booking status. Please try again.")
    }
  }

  const handleEditSave = async (next: any) => {
    // Ensure times are saved with the booking
    // If checkOutTime is empty string or null, use default "11:00"
    // IMPORTANT: Always ensure checkOutTime is set for checked-in bookings
    let finalCheckOutTime = (next.checkOutTime && next.checkOutTime.trim()) ? next.checkOutTime.trim() : null

    // If booking is checked-in but has no checkOutTime, default to 11:00
    if (next.status === "checked-in" && !finalCheckOutTime) {
      finalCheckOutTime = "11:00"
    }

    // If the Dates were edited (DD/MM/YYYY - DD/MM/YYYY), also update ISO fields checkIn/checkOut
    let checkInISO: string | null = null
    let checkOutISO: string | null = null
    if (typeof next.dates === 'string' && next.dates.includes(' - ')) {
      const [checkInStr, checkOutStr] = next.dates.split(' - ').map((s: string) => s.trim())

      const toISO = (dmy: string): string | null => {
        const parts = dmy.split('/')
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10)
          const year = parseInt(parts[2], 10)
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            const local = new Date(year, month - 1, day)
            return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
          }
        }
        return null
      }

      checkInISO = toISO(checkInStr)
      checkOutISO = toISO(checkOutStr)
    }

    const updateData: any = {
      ...next,
      checkInTime: next.checkInTime || null,
      checkOutTime: finalCheckOutTime || null,
      // If parsed, set ISO dates too so expiration reads the updated checkout
      ...(checkInISO ? { checkIn: checkInISO } : {}),
      ...(checkOutISO ? { checkOut: checkOutISO } : {}),
      updatedAt: serverTimestamp(),
    }

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Edit Save]', {
        bookingId: next.id,
        status: next.status,
        checkOutTime: finalCheckOutTime,
        checkInISO,
        checkOutISO,
        updateData,
      })
    }

    // Remove null values to avoid overwriting existing data with null
    if (!updateData.checkInTime) delete updateData.checkInTime
    await setDoc(doc(db, "bookings", next.id), updateData, { merge: true })
    await logEditHistory(next.id, "edit modal save")
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
      await logStatusHistory(bookingToCheckout.id, "checked-in", "checked-out", isMistake ? "checkout (mistake flow)" : "checkout")
        
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

  const handleRejectConfirm = async () => {
    if (!bookingToAction) return
    
    setRejectDialogOpen(false)
    
    try {
      await setDoc(
        doc(db, "bookings", bookingToAction.id),
        { status: "rejected", updatedAt: serverTimestamp() },
        { merge: true }
      )
      await logStatusHistory(bookingToAction.id, bookingToAction.status, "rejected", "reject")
      
      // Update or create payment entries
      try {
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", bookingToAction.id),
          where("type", "==", "booking")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        if (!paymentsSnapshot.empty) {
          const paymentDoc = paymentsSnapshot.docs[0]
          await setDoc(
            doc(db, "payments", paymentDoc.id),
            {
              status: "failed",
              notes: "Booking was rejected",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } else {
          await addDoc(collection(db, "payments"), {
            bookingId: bookingToAction.id,
            type: "booking",
            amount: bookingToAction.amount ?? 0,
            method: "cash",
            status: "failed",
            date: new Date().toISOString().slice(0, 10),
            customerName: bookingToAction.customer || "",
            room: bookingToAction.room || "",
            notes: "Booking was rejected",
            createdAt: serverTimestamp(),
          })
        }
      } catch (paymentError) {
        console.warn("Failed to update payment entry:", paymentError)
      }
    } catch (error) {
      console.error("Failed to reject booking:", error)
      alert("Failed to reject booking. Please try again.")
    } finally {
      setBookingToAction(null)
    }
  }

  const handleCancelConfirm = async () => {
    if (!bookingToAction) return
    
    setCancelDialogOpen(false)
    
    try {
      await setDoc(
        doc(db, "bookings", bookingToAction.id),
        { status: "cancelled", updatedAt: serverTimestamp() },
        { merge: true }
      )
      await logStatusHistory(bookingToAction.id, bookingToAction.status, "cancelled", "cancel")
      
      // Update or create payment entries
      try {
        const paymentsQuery = query(
          collection(db, "payments"),
          where("bookingId", "==", bookingToAction.id),
          where("type", "==", "booking")
        )
        const paymentsSnapshot = await getDocs(paymentsQuery)
        
        if (!paymentsSnapshot.empty) {
          const paymentDoc = paymentsSnapshot.docs[0]
          await setDoc(
            doc(db, "payments", paymentDoc.id),
            {
              status: "failed",
              notes: "Booking was cancelled",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } else {
          await addDoc(collection(db, "payments"), {
            bookingId: bookingToAction.id,
            type: "booking",
            amount: bookingToAction.amount ?? 0,
            method: "cash",
            status: "failed",
            date: new Date().toISOString().slice(0, 10),
            customerName: bookingToAction.customer || "",
            room: bookingToAction.room || "",
            notes: "Booking was cancelled",
            createdAt: serverTimestamp(),
          })
        }
      } catch (paymentError) {
        console.warn("Failed to update payment entry:", paymentError)
      }
    } catch (error) {
      console.error("Failed to cancel booking:", error)
      alert("Failed to cancel booking. Please try again.")
    } finally {
      setBookingToAction(null)
    }
  }

  const handleCheckinConfirm = async () => {
    if (!bookingToAction) return
    
    setCheckinDialogOpen(false)
    
    try {
      // Get today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Calculate checkout date based on original booking dates
      let checkoutDate = new Date(today)
      const originalCheckIn = bookingToAction.checkIn 
        ? parseISO(bookingToAction.checkIn) 
        : null
      const originalCheckOut = bookingToAction.checkOut 
        ? parseISO(bookingToAction.checkOut) 
        : null
      
      // If we have original dates, calculate the number of nights
      if (originalCheckIn && originalCheckOut && isValid(originalCheckIn) && isValid(originalCheckOut)) {
        const nights = differenceInCalendarDays(originalCheckOut, originalCheckIn)
        checkoutDate = addDays(today, nights)
      } else if (bookingToAction.dates) {
        // Try to parse from dates field
        const dates = bookingToAction.dates.split(" - ")
        if (dates.length === 2) {
          const checkInStr = dates[0].trim()
          const checkOutStr = dates[1].trim()
          const checkInParts = checkInStr.split("/")
          const checkOutParts = checkOutStr.split("/")
          
          if (checkInParts.length === 3 && checkOutParts.length === 3) {
            const [dayIn, monthIn, yearIn] = checkInParts
            const [dayOut, monthOut, yearOut] = checkOutParts
            const origCheckIn = new Date(parseInt(yearIn), parseInt(monthIn) - 1, parseInt(dayIn))
            const origCheckOut = new Date(parseInt(yearOut), parseInt(monthOut) - 1, parseInt(dayOut))
            if (!isNaN(origCheckIn.getTime()) && !isNaN(origCheckOut.getTime())) {
              const nights = differenceInCalendarDays(origCheckOut, origCheckIn)
              checkoutDate = addDays(today, nights)
            }
          }
        }
      }
      
      // Format dates
      const todayStr = format(today, 'yyyy-MM-dd')
      const checkoutStr = format(checkoutDate, 'yyyy-MM-dd')
      const datesStr = `${format(today, 'dd/MM/yyyy')} - ${format(checkoutDate, 'dd/MM/yyyy')}`
      
      // Get current time for check-in
      const now = new Date()
      const checkInTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      
      // Get check-out time from existing booking or default to 11:00
      const existingCheckOutTime = (bookingToAction as any).checkOutTime || (bookingToAction as any).checkoutTime || "11:00"
      
      // Update booking with today's check-in date and times
      await setDoc(
        doc(db, "bookings", bookingToAction.id),
        { 
          status: "checked-in", 
          checkIn: todayStr,
          checkOut: checkoutStr,
          dates: datesStr,
          checkInTime: checkInTimeStr,
          checkOutTime: existingCheckOutTime,
          updatedAt: serverTimestamp() 
        },
        { merge: true }
      )
      await logStatusHistory(bookingToAction.id, bookingToAction.status, "checked-in", "check-in")
      
      // Ensure payment exists and is completed for this booking
      const paymentsQuery = query(
        collection(db, "payments"),
        where("bookingId", "==", bookingToAction.id),
        where("type", "==", "booking")
      )
      const paymentsSnapshot = await getDocs(paymentsQuery)
      
      if (paymentsSnapshot.empty) {
        // If no payment exists, create one with the booking amount
        await addDoc(collection(db, "payments"), {
          bookingId: bookingToAction.id,
          type: "booking",
          amount: bookingToAction.amount || 0,
          method: bookingToAction.paymentMethod || "mpesa",
          status: "completed",
          date: todayStr,
          customerName: bookingToAction.customer || "",
          room: bookingToAction.room || "",
          notes: "Payment processed upon check-in",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else {
        // Update existing payment to ensure it's completed
        const existingPayment = paymentsSnapshot.docs[0]
        await setDoc(
          doc(db, "payments", existingPayment.id),
          {
            status: "completed",
            date: todayStr,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      }
    } catch (error) {
      console.error("Failed to check in booking:", error)
      alert("Failed to check in booking. Please try again.")
    } finally {
      setBookingToAction(null)
    }
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
    <div className="h-full flex flex-col min-w-0 overflow-hidden">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage all room and venue bookings</p>
        </div>
        <Button
          onClick={() => setCreateBookingModalOpen(true)}
          className="gap-2 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Create Booking
        </Button>
      </div>

      {/* Compact expired indicator chip (no big banner) */}
      {expiredCheckedInCount > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setStatusFilter("checked-in")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-semibold shadow hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {expiredCheckedInCount} checkout{expiredCheckedInCount > 1 ? 's' : ''} expired — View
          </button>
        </div>
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
                  onClick={() => { setApprovalBooking(null); setApprovalData({ amount: 0, selectedRoomId: "", paymentMethod: "mpesa", checkInTime: "", checkOutTime: "", updatedDates: "" }) }} 
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
                  {approvalData.updatedDates ? (
                    <span>
                      {` | Original Dates: ${approvalBooking.dates || "N/A"}`}
                      <br />
                      <span className="text-green-600 font-semibold">
                        Updated Dates: {approvalData.updatedDates} (Auto-calculated)
                      </span>
                    </span>
                  ) : (
                    approvalBooking.dates && ` | Dates: ${approvalBooking.dates}`
                  )}
                </p>
                {approvalData.updatedDates && (
                  <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mt-2 border border-green-200">
                    ✅ Dates automatically updated because the original booking date was today or in the past.
                  </p>
                )}
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
                    onClick={() => { setApprovalBooking(null); setApprovalData({ amount: 0, selectedRoomId: "", paymentMethod: "mpesa", checkInTime: "", checkOutTime: "", updatedDates: "" }); setIsApproving(false) }}
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

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-red-500" />
              <AlertDialogTitle>Reject Booking</AlertDialogTitle>
            </div>
            <div className="space-y-2">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to reject this booking?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                Booking Details:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Customer: {bookingToAction?.customer}</li>
                <li>Room: {bookingToAction?.room}</li>
                <li>Dates: {bookingToAction?.dates}</li>
              </ul>
              <div className="text-sm text-muted-foreground mt-3">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
                <li>Move the booking to "Rejected" status</li>
                <li>Mark the payment as "Failed"</li>
                <li>Notify the customer about the rejection</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Reject Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-orange-500" />
              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            </div>
            <div className="space-y-2">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to cancel this booking?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                Booking Details:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Customer: {bookingToAction?.customer}</li>
                <li>Room: {bookingToAction?.room}</li>
                <li>Dates: {bookingToAction?.dates}</li>
              </ul>
              <div className="text-sm text-muted-foreground mt-3">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
                <li>Move the booking to "Cancelled" status</li>
                <li>Mark the payment as "Failed"</li>
                <li>Make the room available again</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Yes, Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check-in Confirmation Dialog */}
      <AlertDialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <LogIn className="w-6 h-6 text-blue-500" />
              <AlertDialogTitle>Check-in Booking</AlertDialogTitle>
            </div>
            <div className="space-y-2">
              <AlertDialogDescription>
                <span className="text-base font-semibold text-foreground block mb-2">
                  Are you sure you want to check in this guest?
                </span>
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                Booking Details:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Customer: {bookingToAction?.customer}</li>
                <li>Room: {bookingToAction?.room}</li>
                <li>Dates: {bookingToAction?.dates}</li>
                <li>Amount: KES {bookingToAction?.amount?.toLocaleString()}</li>
              </ul>
              <div className="text-sm text-muted-foreground mt-3">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
                <li>Change booking status to "Checked-In"</li>
                <li>Mark the room as occupied</li>
                <li>Record the check-in time</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckinConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Yes, Check In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  )
}
