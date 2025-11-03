"use client"

import React from "react"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Check, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Phone } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { differenceInCalendarDays, parseISO, isValid, format as formatDate, addDays, isBefore, isAfter, isWithinInterval } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function BookingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState(1)
  type RoomLite = { id: string; name: string; price: number; images?: string[]; quantity?: number; availableCount?: number }
  const [rooms, setRooms] = useState<RoomLite[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedRooms, setSelectedRooms] = useState<Record<string, number>>({}) // room name -> count
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const CONTACT_PHONE = "+254-722-867-400"
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as any
        return { 
          id: d.id, 
          name: data.name, 
          price: Number(data.price ?? 0), 
          images: data.images || (data.image ? [data.image] : []),
          quantity: Number(data.quantity ?? 1)
        } as RoomLite
      })
      setRooms(list)
    })
    return () => unsub()
  }, [])
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookings"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setBookings(list)
    })
    return () => unsub()
  }, [])
  const roomPrices = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    rooms.forEach((r) => (map[r.name] = r.price))
    return map
  }, [rooms])
  const roomImages = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {}
    rooms.forEach((r) => (map[r.name] = r.images || []))
    return map
  }, [rooms])

  // If current selection is not in backend rooms, default to first available
  useEffect(() => {
    if (rooms.length === 0) return
    if (!roomPrices[formData.roomType]) {
      const first = rooms[0]
      const subtotal = first.price * formData.nights
      setFormData((prev) => ({
        ...prev,
        roomType: first.name,
        pricePerNight: first.price,
        subtotal,
        total: subtotal,
      }))
    }
  }, [rooms])
  const [formData, setFormData] = useState({
    // Step 1: Booking Summary
    roomType: "Deluxe Single",
    checkIn: "2025-11-15",
    checkOut: "2025-11-17",
    nights: 2,
    pricePerNight: 2000,
    subtotal: 4000,
    total: 4000,

    // Step 2: Guest Details
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: "",

    // Step 3: Payment
    paymentMethod: "card",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCVC: "",
    mPesaPhone: "",
  })

  // Local calendar UI state
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined)
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined)
  const [showCheckInCal, setShowCheckInCal] = useState(false)
  const [showCheckOutCal, setShowCheckOutCal] = useState(false)
  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  React.useEffect(() => {
    const room = searchParams.get("room")
    const price = searchParams.get("price")
    const nightsParam = searchParams.get("nights")
    const qCheckIn = searchParams.get("checkIn")
    const qCheckOut = searchParams.get("checkOut")
    const qRooms = searchParams.get("rooms")
    const qAdults = searchParams.get("adults")
    const qChildren = searchParams.get("children")

    setFormData((prev) => {
      const derivedPrice = room && roomPrices[room] ? roomPrices[room] : prev.pricePerNight
      const pricePerNight = price ? Number(price) : derivedPrice
      const nights = nightsParam ? Number(nightsParam) : prev.nights
      const subtotal = pricePerNight * nights
      return {
        ...prev,
        roomType: room ?? prev.roomType,
        pricePerNight,
        nights,
        subtotal,
        total: subtotal,
        checkIn: qCheckIn ?? prev.checkIn,
        checkOut: qCheckOut ?? prev.checkOut,
      }
    })
    // Store guest counts in a safe spot
    setGuestCounts({
      rooms: qRooms ? Number(qRooms) : guestCounts.rooms,
      adults: qAdults ? Number(qAdults) : guestCounts.adults,
      children: qChildren ? Number(qChildren) : guestCounts.children,
    })

    // If a specific room is provided (coming from room details page), add it to selectedRooms
    if (room) {
      setSelectedRooms((prev) => {
        // Only update if this room isn't already selected, or if we need to add it
        if (!prev[room]) {
          return { ...prev, [room]: 1 }
        }
        return prev
      })
      // Skip to Step 2 when coming from room details page
      setStep(2)
    }
  }, [searchParams, roomPrices])

  // Keep local calendar state in sync with string dates
  React.useEffect(() => {
    const inDate = parseISO(formData.checkIn)
    setCheckInDate(isValid(inDate) ? inDate : undefined)
    const outDate = parseISO(formData.checkOut)
    setCheckOutDate(isValid(outDate) ? outDate : undefined)
  }, [formData.checkIn, formData.checkOut])

  // Capture guest counts from query params to display in summary
  const [guestCounts, setGuestCounts] = useState({ rooms: 1, adults: 1, children: 0 })
  
  // Calculate available rooms based on dates
  const availableRooms = useMemo(() => {
    if (!checkInDate || !checkOutDate || !isValid(checkInDate) || !isValid(checkOutDate)) {
      return rooms.map(r => ({ ...r, availableCount: r.quantity ?? 1 }))
    }
    
    return rooms.map((room) => {
      const quantity = room.quantity ?? 1
      // Count bookings that overlap with selected dates
      const conflictingBookings = bookings.filter((booking: any) => {
        if (booking.room !== room.name) return false
        if (booking.status === "cancelled" || booking.status === "rejected") return false
        if (!booking.checkIn || !booking.checkOut) return false
        
        const bookingCheckIn = parseISO(booking.checkIn)
        const bookingCheckOut = parseISO(booking.checkOut)
        
        if (!isValid(bookingCheckIn) || !isValid(bookingCheckOut)) return false
        
        // Check if dates overlap
        const bookingInterval = { start: bookingCheckIn, end: bookingCheckOut }
        const selectedInterval = { start: checkInDate, end: checkOutDate }
        
        return (
          isWithinInterval(checkInDate, bookingInterval) ||
          isWithinInterval(checkOutDate, bookingInterval) ||
          isWithinInterval(bookingCheckIn, selectedInterval) ||
          isWithinInterval(bookingCheckOut, selectedInterval) ||
          (isBefore(checkInDate, bookingCheckIn) && isAfter(checkOutDate, bookingCheckOut)) ||
          (isBefore(bookingCheckIn, checkInDate) && isAfter(bookingCheckOut, checkOutDate))
        )
      })
      
      const bookedCount = conflictingBookings.length
      const availableCount = Math.max(0, quantity - bookedCount)
      
      return { ...room, availableCount }
    })
  }, [rooms, bookings, checkInDate, checkOutDate])

  const handleRoomChange = (value: string) => {
    const pricePerNight = roomPrices[value] ?? formData.pricePerNight
    const nights = formData.nights
    const subtotal = pricePerNight * nights
    setFormData((prev) => ({
      ...prev,
      roomType: value,
      pricePerNight,
      subtotal,
      total: subtotal,
    }))
  }

  const recalcNightsAndTotal = (nextState: Partial<typeof formData>) => {
    const checkIn = nextState.checkIn ?? formData.checkIn
    const checkOut = nextState.checkOut ?? formData.checkOut
    const pricePerNight = nextState.pricePerNight ?? formData.pricePerNight
    const inDate = parseISO(checkIn)
    const outDate = parseISO(checkOut)
    let nights = formData.nights
    if (isValid(inDate) && isValid(outDate)) {
      const diff = differenceInCalendarDays(outDate, inDate)
      nights = Math.max(1, diff)
    }
    const subtotal = nights * pricePerNight
    setFormData((prev) => ({
      ...prev,
      ...nextState,
      nights,
      subtotal,
      total: subtotal,
    }))
  }

  // Calculate total based on selected rooms
  const calculatedTotal = useMemo(() => {
    return Object.entries(selectedRooms).reduce((sum, [roomName, count]) => {
      const room = availableRooms.find(r => r.name === roomName)
      return sum + (room ? room.price * formData.nights * count : 0)
    }, 0)
  }, [selectedRooms, availableRooms, formData.nights])

  // Keep nights in sync and reset room selection when dates change
  React.useEffect(() => {
    const inDate = parseISO(formData.checkIn)
    const outDate = parseISO(formData.checkOut)
    if (isValid(inDate) && isValid(outDate)) {
      const nights = Math.max(1, differenceInCalendarDays(outDate, inDate))
      if (nights !== formData.nights) {
        setFormData((prev) => ({ ...prev, nights }))
      }
    }
  }, [formData.checkIn, formData.checkOut])
  
  // Reset selected rooms when dates change (availability may change)
  React.useEffect(() => {
    if (checkInDate || checkOutDate) {
      // Validate current selections - remove rooms that are no longer available
      setSelectedRooms((prev) => {
        const updated: Record<string, number> = {}
        Object.entries(prev).forEach(([roomName, count]) => {
          const room = availableRooms.find(r => r.name === roomName)
          if (room && (room.availableCount ?? 0) >= count) {
            updated[roomName] = count
          }
        })
        return updated
      })
    }
  }, [checkInDate, checkOutDate, availableRooms])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePaymentMethodChange = (method: string) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethod: method,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      // Check if at least one room is selected
      const totalSelectedRooms = Object.values(selectedRooms).reduce((sum, count) => sum + count, 0)
      if (totalSelectedRooms === 0) {
        toast({ title: "Please select at least one room", variant: "destructive" })
        return
      }
      if (!checkInDate || !checkOutDate || !isValid(checkInDate) || !isValid(checkOutDate)) {
        toast({ title: "Please select check-in and check-out dates", variant: "destructive" })
        return
      }
      // Proceed to step 2
      setStep(step + 1)
    } else if (step === 2) {
      // Validate guest details
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
        toast({ title: "Please fill in all required guest information", variant: "destructive" })
        return
      }
      // Proceed to step 3
      setStep(step + 1)
    } else if (step === 3) {
      // Handle final submission - save booking and show success modal
      setIsSubmitting(true)
      
      try {
        // Prepare room data - use selectedRooms or fallback to formData.roomType
        const roomNames = Object.keys(selectedRooms).length > 0 
          ? Object.keys(selectedRooms) 
          : formData.roomType ? [formData.roomType] : []
        
        // Create booking entries for each room selected
        for (const roomName of roomNames) {
          const roomCount = selectedRooms[roomName] || 1
          const room = availableRooms.find(r => r.name === roomName)
          const roomPrice = room ? room.price : formData.pricePerNight
          
          // Build booking data, only including fields with values
          const bookingData: any = {
            customer: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
            room: roomName,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            dates: `${formatDate(parseISO(formData.checkIn), "dd/MM/yyyy")} - ${formatDate(parseISO(formData.checkOut), "dd/MM/yyyy")}`,
            guests: `${guestCounts.adults} adult(s), ${guestCounts.children} child(ren)`,
            status: "pending",
            amount: roomPrice * formData.nights * roomCount,
            createdAt: serverTimestamp(),
          }
          
          // Only include specialRequests if it has a value
          if (formData.specialRequests && formData.specialRequests.trim()) {
            bookingData.specialRequests = formData.specialRequests.trim()
          }
          
          await addDoc(collection(db, "bookings"), bookingData)
        }
        
        // Show success modal
        setShowSuccessModal(true)
      } catch (error) {
        console.error("Failed to submit booking:", error)
        toast({ title: "Failed to submit your booking. Please try again.", variant: "destructive" })
      } finally {
        setIsSubmitting(false)
      }
    }
  }
  
  const handleRoomSelection = (roomName: string, count: number) => {
    setSelectedRooms((prev) => {
      const newSelection = { ...prev }
      if (count === 0) {
        delete newSelection[roomName]
      } else {
        const room = availableRooms.find(r => r.name === roomName)
        const maxAvailable = room?.availableCount ?? 0
        newSelection[roomName] = Math.min(count, maxAvailable)
      }
      return newSelection
    })
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">Complete Your Booking</h1>
            <p className="text-lg opacity-90">Secure your reservation at 5PM Hotel</p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="relative">
              {/* Progress Line - starts at center of step 1, ends at center of step 3 */}
              <div className="absolute top-5 left-[5%] right-[5%] h-1 bg-muted -z-10">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                />
              </div>
              
              {/* Step Indicators and Labels */}
              <div className="flex items-start justify-between relative">
                {[
                  { number: 1, label: "Booking Summary" },
                  { number: 2, label: "Guest Details" },
                  { number: 3, label: "Review" }
                ].map(({ number, label }) => (
                  <div key={number} className="flex flex-col items-center flex-1 relative">
                    {/* Step indicator circle */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition relative z-10 ${
                        number <= step ? "bg-accent text-accent-foreground" : "bg-muted text-foreground/50"
                      }`}
                    >
                      {number < step ? <Check size={20} /> : number}
                    </div>
                    
                    {/* Label */}
                    <span 
                      className={`text-sm font-semibold mt-3 text-center ${
                        number <= step ? "text-primary" : "text-foreground/50"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-8 ${step === 3 ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
            {/* Main Form */}
            <div className={step === 3 ? "lg:col-span-1" : "lg:col-span-2"}>
              <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-lg p-8">
                {/* Step 1: Booking Summary */}
                {step === 1 && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-primary mb-6">Select Available Rooms</h2>
                    <div className="space-y-4 mb-8">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <label className="block text-sm text-foreground/70 mb-1">Check-in</label>
                          <div className="relative">
                            <button
                              type="button"
                              className="flex items-center w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent text-left bg-white"
                              onClick={() => { setShowCheckInCal(v => !v); setShowCheckOutCal(false) }}
                            >
                              <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                              <span className={checkInDate && isValid(checkInDate) ? "text-foreground" : "text-muted-foreground"}>
                                {checkInDate && isValid(checkInDate) ? formatDate(checkInDate, "dd/MM/yyyy") : "Select date"}
                              </span>
                            </button>
                            {showCheckInCal && (
                              <div className="absolute top-12 left-0 z-20 bg-white p-2 rounded-lg shadow-lg border w-fit" tabIndex={0}>
                                <Calendar
                                  mode="single"
                                  selected={checkInDate}
                                  onSelect={(date) => {
                                    setCheckInDate(date ?? undefined)
                                    const iso = date ? formatDate(date, "yyyy-MM-dd") : ""
                                    // If checkout is before or equal new checkin, auto-bump checkout by 1 night
                                    if (date && checkOutDate && !isAfter(checkOutDate, date)) {
                                      const bumped = addDays(date, 1)
                                      setCheckOutDate(bumped)
                                      recalcNightsAndTotal({ checkIn: iso, checkOut: formatDate(bumped, "yyyy-MM-dd") })
                                    } else {
                                      recalcNightsAndTotal({ checkIn: iso })
                                    }
                                    setShowCheckInCal(false)
                                  }}
                                  showOutsideDays
                                  defaultMonth={checkInDate ?? today}
                                  disabled={{ before: today }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <label className="block text-sm text-foreground/70 mb-1">Check-out</label>
                          <div className="relative">
                            <button
                              type="button"
                              className="flex items-center w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent text-left bg-white"
                              onClick={() => { setShowCheckOutCal(v => !v); setShowCheckInCal(false) }}
                            >
                              <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                              <span className={checkOutDate && isValid(checkOutDate) ? "text-foreground" : "text-muted-foreground"}>
                                {checkOutDate && isValid(checkOutDate) ? formatDate(checkOutDate, "dd/MM/yyyy") : "Select date"}
                              </span>
                            </button>
                            {showCheckOutCal && (
                              <div className="absolute top-12 left-0 z-20 bg-white p-2 rounded-lg shadow-lg border w-fit" tabIndex={0}>
                                <Calendar
                                  mode="single"
                                  selected={checkOutDate}
                                  onSelect={(date) => {
                                    if (!checkInDate) {
                                      toast({ title: "Select check-in first" })
                                      return
                                    }
                                    if (date && !isAfter(date, checkInDate)) {
                                      toast({ title: "Invalid dates", description: "Check-out must be after check-in." })
                                      return
                                    }
                                    setCheckOutDate(date ?? undefined)
                                    const iso = date ? formatDate(date, "yyyy-MM-dd") : ""
                                    recalcNightsAndTotal({ checkOut: iso })
                                    setShowCheckOutCal(false)
                                  }}
                                  showOutsideDays
                                  defaultMonth={checkOutDate ?? (checkInDate ? addDays(checkInDate, 1) : today)}
                                  disabled={checkInDate ? { before: addDays(checkInDate, 1) } : { before: today }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-foreground/70 mb-1">Number of Nights</p>
                        <p className="font-semibold text-lg">{formData.nights} {formData.nights === 1 ? "night" : "nights"}</p>
                      </div>
                      
                      {/* Available Rooms Selection */}
                      {checkInDate && checkOutDate && isValid(checkInDate) && isValid(checkOutDate) ? (
                        <div className="pt-4">
                          <h3 className="font-semibold text-primary mb-4">Available Rooms</h3>
                          <div className="space-y-4">
                            {availableRooms.map((room) => {
                              const selectedCount = selectedRooms[room.name] ?? 0
                              const isAvailable = (room.availableCount ?? 0) > 0
                              return (
                                <div key={room.id} className={`p-4 border rounded-lg ${isAvailable ? 'border-border' : 'border-red-300 opacity-60'}`}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-lg text-primary mb-1">{room.name}</h4>
                                      <p className="text-sm text-foreground/70 mb-2">KSh {room.price} per night</p>
                                      <p className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                        {isAvailable ? `${room.availableCount} available` : 'Not available'}
                                      </p>
                                    </div>
                                    {roomImages[room.name] && roomImages[room.name].length > 0 && (
                                      <img src={roomImages[room.name][0]} alt={room.name} className="h-20 w-20 object-cover rounded-md" />
                                    )}
                                  </div>
                                  {isAvailable && (
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => handleRoomSelection(room.name, Math.max(0, selectedCount - 1))}
                                        disabled={selectedCount === 0}
                                        className="w-8 h-8 rounded-full bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground transition"
                                      >
                                        −
                                      </button>
                                      <span className="w-12 text-center font-semibold">{selectedCount}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRoomSelection(room.name, selectedCount + 1)}
                                        disabled={selectedCount >= (room.availableCount ?? 0)}
                                        className="w-8 h-8 rounded-full bg-accent text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
                                      >
                                        +
                                      </button>
                                      {selectedCount > 0 && (
                                        <span className="ml-auto text-sm font-semibold text-accent">
                                          = KSh {(room.price * formData.nights * selectedCount).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {availableRooms.length === 0 && (
                              <p className="text-center text-foreground/70 py-4">No rooms available. Please check back later.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4">
                          <p className="text-center text-foreground/70 py-4">Please select check-in and check-out dates to see available rooms.</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-6">
                      <h3 className="font-semibold text-primary mb-4">Price Breakdown</h3>
                      <div className="space-y-2 mb-4">
                        {Object.entries(selectedRooms).map(([roomName, count]) => {
                          const room = availableRooms.find(r => r.name === roomName)
                          const roomTotal = room ? room.price * formData.nights * count : 0
                          return (
                            <div key={roomName} className="flex justify-between text-sm">
                              <span className="text-foreground/70">
                                {roomName} × {count} {count === 1 ? 'room' : 'rooms'}
                              </span>
                              <span className="font-semibold">KSh {roomTotal.toLocaleString()}</span>
                            </div>
                          )
                        })}
                        {Object.keys(selectedRooms).length === 0 && (
                          <p className="text-sm text-foreground/50 italic">No rooms selected</p>
                        )}
                        <div className="border-t border-border pt-2 flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="font-serif text-2xl font-bold text-accent">
                            KSh {Object.entries(selectedRooms).reduce((sum, [roomName, count]) => {
                              const room = availableRooms.find(r => r.name === roomName)
                              return sum + (room ? room.price * formData.nights * count : 0)
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Guest Details */}
                {step === 2 && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-primary mb-6">Guest Information</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">First Name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">Last Name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Special Requests</label>
                        <textarea
                          name="specialRequests"
                          value={formData.specialRequests}
                          onChange={handleInputChange}
                          rows={4}
                          placeholder="Any special requests or requirements?"
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Booking Summary & Confirmation */}
                {step === 3 && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-primary mb-6">Review Your Booking</h2>

                    <div className="space-y-6">
                      {/* Booking Details */}
                      <div className="bg-muted p-6 rounded-lg">
                        <h3 className="font-semibold text-lg text-primary mb-4">Booking Details</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-foreground/70 mb-1">Selected Rooms</p>
                            {Object.keys(selectedRooms).length > 0 ? (
                              <div className="space-y-1">
                                {Object.entries(selectedRooms).map(([roomName, count]) => {
                                  const room = availableRooms.find(r => r.name === roomName)
                                  const roomTotal = room ? room.price * formData.nights * count : 0
                                  return (
                                    <p key={roomName} className="font-semibold text-foreground">
                                      {roomName} × {count} {count === 1 ? "room" : "rooms"} - KSh {roomTotal.toLocaleString()}
                                    </p>
                                  )
                                })}
                              </div>
                            ) : formData.roomType ? (
                              <p className="font-semibold text-foreground">{formData.roomType} × 1 room</p>
                            ) : (
                              <p className="text-foreground/50">No rooms selected</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-foreground/70 mb-1">Check-in</p>
                            <p className="font-semibold text-foreground">
                              {checkInDate && isValid(checkInDate) ? formatDate(checkInDate, "dd/MM/yyyy") : "Not selected"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-foreground/70 mb-1">Check-out</p>
                            <p className="font-semibold text-foreground">
                              {checkOutDate && isValid(checkOutDate) ? formatDate(checkOutDate, "dd/MM/yyyy") : "Not selected"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-foreground/70 mb-1">Duration</p>
                            <p className="font-semibold text-foreground">{formData.nights} {formData.nights === 1 ? "night" : "nights"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-foreground/70 mb-1">Guests</p>
                            <p className="font-semibold text-foreground">
                              {guestCounts.adults} adult(s), {guestCounts.children} child(ren)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Guest Information */}
                      <div className="bg-muted p-6 rounded-lg border border-border">
                        <h3 className="font-semibold text-lg text-primary mb-4">Guest Information</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-foreground mb-2">First Name</label>
                              <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-foreground mb-2">Last Name</label>
                              <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground"
                                readOnly
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground"
                              readOnly
                            />
                          </div>
                          {formData.specialRequests && (
                            <div>
                              <label className="block text-sm font-semibold text-foreground mb-2">Special Requests</label>
                              <textarea
                                name="specialRequests"
                                value={formData.specialRequests}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground resize-none"
                                readOnly
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="bg-accent/10 p-6 rounded-lg border-2 border-accent">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-foreground">Total Amount</span>
                          <span className="font-serif text-3xl font-bold text-accent">
                            KSh {calculatedTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-4 mt-8">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : step === 3 ? "Confirm Booking" : "Continue"}
                    {!isSubmitting && <ChevronRight size={20} />}
                  </button>
                </div>
              </form>
            </div>

            {/* Order Summary Sidebar - Hidden on Step 3 */}
            {step !== 3 && (
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg shadow-lg p-6 sticky top-20">
                <h3 className="font-serif text-xl font-bold text-primary mb-6">Order Summary</h3>

                <div className="space-y-4 mb-6 pb-6 border-b border-border">
                  {Object.keys(selectedRooms).length > 0 ? (
                    <div>
                      <p className="text-sm text-foreground/70 mb-2">Selected Rooms</p>
                      {Object.entries(selectedRooms).map(([roomName, count]) => (
                        <p key={roomName} className="font-semibold mb-1">
                          {roomName} × {count} {count === 1 ? "room" : "rooms"}
                        </p>
                      ))}
                    </div>
                  ) : formData.roomType ? (
                    <div>
                      <p className="text-sm text-foreground/70 mb-1">Rooms</p>
                      <p className="font-semibold">{formData.roomType} × 1 room</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-foreground/70 mb-1">Rooms</p>
                      <p className="font-semibold text-foreground/50">Not selected</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Check-in</p>
                    <p className="font-semibold">{checkInDate && isValid(checkInDate) ? formatDate(checkInDate, "dd/MM/yyyy") : "Not selected"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Check-out</p>
                    <p className="font-semibold">{checkOutDate && isValid(checkOutDate) ? formatDate(checkOutDate, "dd/MM/yyyy") : "Not selected"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Duration</p>
                    <p className="font-semibold">{formData.nights} {formData.nights === 1 ? "night" : "nights"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Guests</p>
                    <p className="font-semibold">
                      {guestCounts.adults} adult(s), {guestCounts.children} child(ren)
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {Object.entries(selectedRooms).map(([roomName, count]) => {
                    const room = availableRooms.find(r => r.name === roomName)
                    const roomTotal = room ? room.price * formData.nights * count : 0
                    return (
                      <div key={roomName} className="flex justify-between text-sm">
                        <span className="text-foreground/70">
                          {roomName} × {count}
                        </span>
                        <span className="font-semibold">KSh {roomTotal.toLocaleString()}</span>
                      </div>
                    )
                  })}
                  {Object.keys(selectedRooms).length === 0 && (
                    <p className="text-sm text-foreground/50 italic">No rooms selected</p>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-serif text-2xl font-bold text-accent">KSh {calculatedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Success Confirmation Modal */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        setShowSuccessModal(open)
        // When modal is closed, redirect to home page
        if (!open) {
          router.push("/")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-serif text-primary">
                Submission Has Been Submitted!
              </DialogTitle>
              <DialogDescription className="text-base space-y-3 pt-2">
                <span className="block text-foreground mb-2">
                  Thank you for your interest. Your submission has been submitted successfully.
                </span>
                <span className="block text-foreground/80">
                  Our team will contact you within a few minutes. If you need immediate assistance, please call us directly.
                </span>
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg border border-border">
              <Phone className="w-5 h-5 text-accent flex-shrink-0" />
              <a 
                href={`tel:${CONTACT_PHONE.replace(/\s|-/g, '')}`}
                className="text-lg font-semibold text-primary hover:text-accent transition-colors"
              >
                {CONTACT_PHONE}
              </a>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowSuccessModal(false)
                  router.push("/")
                }}
                className="flex-1 bg-primary text-primary-foreground hover:opacity-90 hover:scale-105 transition-all duration-200"
              >
                Close
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1 hover:scale-105 transition-all duration-200"
              >
                <a href={`tel:${CONTACT_PHONE.replace(/\s|-/g, '')}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
