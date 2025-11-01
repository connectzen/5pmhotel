"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO, isValid, addDays, isBefore, differenceInCalendarDays } from "date-fns"
import { collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateBookingModal({ isOpen, onClose, onSuccess }: CreateBookingModalProps) {
  const [step, setStep] = useState(1)
  const [rooms, setRooms] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedRooms, setSelectedRooms] = useState<Record<string, number>>({})
  const [checkInDate, setCheckInDate] = useState<Date | undefined>()
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>()
  const [showCheckInCal, setShowCheckInCal] = useState(false)
  const [showCheckOutCal, setShowCheckOutCal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Validation errors state
  const [errors, setErrors] = useState({
    checkInDate: false,
    checkOutDate: false,
    rooms: false,
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
  })
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: "",
    adults: 1,
    children: 0,
  })

  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSelectedRooms({})
      setCheckInDate(undefined)
      setCheckOutDate(undefined)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialRequests: "",
        adults: 1,
        children: 0,
      })
      setErrors({
        checkInDate: false,
        checkOutDate: false,
        rooms: false,
        firstName: false,
        lastName: false,
        email: false,
        phone: false,
      })
    }
  }, [isOpen])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map((d) => {
        const data = d.data()
        return { id: d.id, name: data.name, price: Number(data.price ?? 0), quantity: Number(data.quantity ?? 1) }
      }))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => unsub()
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const nights = useMemo(() => {
    if (checkInDate && checkOutDate && isValid(checkInDate) && isValid(checkOutDate)) {
      return Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
    }
    return 1
  }, [checkInDate, checkOutDate])

  // Calculate available rooms
  const availableRooms = useMemo(() => {
    if (!checkInDate || !checkOutDate || !isValid(checkInDate) || !isValid(checkOutDate)) {
      return rooms
    }

    return rooms.map(room => {
      const conflictingBookings = bookings.filter(b => {
        if (b.status === "cancelled" || b.status === "rejected") return false
        if (b.room !== room.name) return false
        
        const bookingCheckIn = parseISO(b.checkIn || b.dates?.split(" - ")[0])
        const bookingCheckOut = parseISO(b.checkOut || b.dates?.split(" - ")[1])
        
        if (!isValid(bookingCheckIn) || !isValid(bookingCheckOut)) return false
        
        return (checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn)
      })
      
      const bookedCount = conflictingBookings.length
      const available = (room.quantity || 1) - bookedCount
      
      return { ...room, availableCount: Math.max(0, available) }
    })
  }, [rooms, bookings, checkInDate, checkOutDate])

  const handleRoomToggle = (roomName: string, e?: React.MouseEvent) => {
    // Prevent event bubbling if clicking on quantity input
    if (e) {
      e.stopPropagation()
    }
    setSelectedRooms(prev => {
      const current = prev[roomName] || 0
      if (current > 0) {
        const next = { ...prev }
        delete next[roomName]
        return next
      } else {
        return { ...prev, [roomName]: 1 }
      }
    })
    // Clear room error when selecting
    if (errors.rooms) {
      setErrors(prev => ({ ...prev, rooms: false }))
    }
  }

  const handleRoomCountChange = (roomName: string, count: number, e?: React.MouseEvent) => {
    // Prevent event bubbling to card click
    if (e) {
      e.stopPropagation()
    }
    if (count < 1) {
      setSelectedRooms(prev => {
        const next = { ...prev }
        delete next[roomName]
        return next
      })
    } else {
      setSelectedRooms(prev => ({ ...prev, [roomName]: count }))
    }
  }

  const calculateTotal = () => {
    let total = 0
    Object.entries(selectedRooms).forEach(([roomName, count]) => {
      const room = rooms.find(r => r.name === roomName)
      if (room) {
        total += room.price * nights * count
      }
    })
    return total
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (step === 1) {
      // Validate step 1
      const hasRooms = Object.keys(selectedRooms).length > 0
      const hasCheckIn = checkInDate && isValid(checkInDate)
      const hasCheckOut = checkOutDate && isValid(checkOutDate)
      
      setErrors({
        checkInDate: !hasCheckIn,
        checkOutDate: !hasCheckOut,
        rooms: !hasRooms,
        firstName: false,
        lastName: false,
        email: false,
        phone: false,
      })
      
      if (!hasRooms || !hasCheckIn || !hasCheckOut) {
        toast({ title: "Please complete all required fields", variant: "destructive" })
        return
      }
      setStep(2)
    } else if (step === 2) {
      // Validate step 2
      const firstNameValid = formData.firstName.trim().length > 0
      const lastNameValid = formData.lastName.trim().length > 0
      const emailValid = formData.email.trim().length > 0 && formData.email.includes("@")
      const phoneValid = formData.phone.trim().length > 0
      
      setErrors({
        checkInDate: false,
        checkOutDate: false,
        rooms: false,
        firstName: !firstNameValid,
        lastName: !lastNameValid,
        email: !emailValid,
        phone: !phoneValid,
      })
      
      if (!firstNameValid || !lastNameValid || !emailValid || !phoneValid) {
        toast({ title: "Please fill in all required guest information", variant: "destructive" })
        return
      }
      setStep(3)
    } else if (step === 3) {
      setIsSubmitting(true)
      try {
        const roomNames = Object.keys(selectedRooms)
        for (const roomName of roomNames) {
          const roomCount = selectedRooms[roomName] || 1
          const room = rooms.find(r => r.name === roomName)
          const roomPrice = room ? room.price : 0
          
          const bookingData: any = {
            customer: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            phone: formData.phone,
            room: roomName,
            checkIn: format(checkInDate!, "yyyy-MM-dd"),
            checkOut: format(checkOutDate!, "yyyy-MM-dd"),
            dates: `${format(checkInDate!, "dd/MM/yyyy")} - ${format(checkOutDate!, "dd/MM/yyyy")}`,
            guests: `${formData.adults} adult(s), ${formData.children} child(ren)`,
            status: "pending",
            amount: roomPrice * nights * roomCount,
            createdAt: serverTimestamp(),
          }
          
          if (formData.specialRequests?.trim()) {
            bookingData.specialRequests = formData.specialRequests.trim()
          }
          
          await addDoc(collection(db, "bookings"), bookingData)
        }
        
        toast({ title: "Booking created successfully!", description: "The booking has been added and is now pending approval." })
        onSuccess?.()
        onClose()
      } catch (error) {
        console.error("Failed to create booking:", error)
        toast({ title: "Failed to create booking", variant: "destructive" })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Create New Booking</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6 gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {s}
                </div>
                {s < 3 && <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Room & Dates Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 1: Select Room & Dates</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Check-in Date</label>
                    <button
                      type="button"
                      onClick={() => { 
                        setShowCheckInCal(!showCheckInCal)
                        setShowCheckOutCal(false)
                        if (errors.checkInDate) {
                          setErrors(prev => ({ ...prev, checkInDate: false }))
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between transition-colors bg-secondary text-foreground ${
                        errors.checkInDate 
                          ? "border-red-500 border-2 bg-red-500/10" 
                          : "border-border hover:border-accent"
                      }`}
                    >
                      <span>{checkInDate ? format(checkInDate, "dd/MM/yyyy") : "Select date"}</span>
                      <CalendarIcon className="w-4 h-4" />
                    </button>
                    {showCheckInCal && (
                      <div className="absolute top-full mt-1 z-10 bg-white border rounded-lg shadow-lg">
                        <Calendar
                          mode="single"
                          selected={checkInDate}
                          onSelect={(date) => {
                            setCheckInDate(date)
                            setShowCheckInCal(false)
                            if (date) {
                              setErrors(prev => ({ ...prev, checkInDate: false }))
                            }
                            if (date && checkOutDate && date >= checkOutDate) {
                              setCheckOutDate(addDays(date, 1))
                            }
                          }}
                          disabled={{ before: today }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Check-out Date</label>
                    <button
                      type="button"
                      onClick={() => { 
                        setShowCheckOutCal(!showCheckOutCal)
                        setShowCheckInCal(false)
                        if (errors.checkOutDate) {
                          setErrors(prev => ({ ...prev, checkOutDate: false }))
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between transition-colors bg-secondary text-foreground ${
                        errors.checkOutDate 
                          ? "border-red-500 border-2 bg-red-500/10" 
                          : "border-border hover:border-accent"
                      }`}
                    >
                      <span>{checkOutDate ? format(checkOutDate, "dd/MM/yyyy") : "Select date"}</span>
                      <CalendarIcon className="w-4 h-4" />
                    </button>
                    {showCheckOutCal && (
                      <div className="absolute top-full mt-1 z-10 bg-white border rounded-lg shadow-lg">
                        <Calendar
                          mode="single"
                          selected={checkOutDate}
                          onSelect={(date) => {
                            if (date && checkInDate && date > checkInDate) {
                              setCheckOutDate(date)
                              setShowCheckOutCal(false)
                              setErrors(prev => ({ ...prev, checkOutDate: false }))
                            }
                          }}
                          disabled={checkInDate ? { before: addDays(checkInDate, 1) } : { before: today }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableRooms.map((room) => {
                    const isSelected = selectedRooms[room.name] > 0
                    const count = selectedRooms[room.name] || 0
                    return (
                      <div
                        key={room.id}
                        onClick={(e) => handleRoomToggle(room.name, e)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 bg-secondary ${
                          errors.rooms && !isSelected
                            ? "border-red-500 border-2 bg-red-500/10"
                            : isSelected
                            ? "border-accent border-2 bg-accent/10 shadow-md"
                            : "border-border hover:border-accent hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-1">{room.name}</h4>
                            <p className="text-sm text-muted-foreground font-medium">KES {room.price.toLocaleString()} / night</p>
                            <p className="text-xs text-muted-foreground mt-1">Available: {room.availableCount || 0}</p>
                          </div>
                          {isSelected && (
                            <div className="ml-2 flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div 
                            className="mt-3 pt-3 border-t border-border flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="text-sm font-medium">Quantity:</label>
                            <Input
                              type="number"
                              min="1"
                              max={room.availableCount || 1}
                              value={count}
                              onChange={(e) => handleRoomCountChange(room.name, parseInt(e.target.value) || 1, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {errors.rooms && (
                  <p className="text-sm text-red-500 mt-2">Please select at least one room</p>
                )}

                {nights > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-semibold">Total: KES {calculateTotal().toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{nights} night(s)</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Guest Information */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 2: Guest Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      placeholder="First Name *"
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData({ ...formData, firstName: e.target.value })
                        if (errors.firstName) {
                          setErrors(prev => ({ ...prev, firstName: false }))
                        }
                      }}
                      className={`${errors.firstName ? "border-red-500 border-2 bg-red-500/10" : ""}`}
                      required
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500 mt-1">First name is required</p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="Last Name *"
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData({ ...formData, lastName: e.target.value })
                        if (errors.lastName) {
                          setErrors(prev => ({ ...prev, lastName: false }))
                        }
                      }}
                      className={`${errors.lastName ? "border-red-500 border-2 bg-red-500/10" : ""}`}
                      required
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-500 mt-1">Last name is required</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email *"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value })
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: false }))
                        }
                      }}
                      className={`${errors.email ? "border-red-500 border-2 bg-red-500/10" : ""}`}
                      required
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">Valid email is required</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="tel"
                      placeholder="Phone *"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value })
                        if (errors.phone) {
                          setErrors(prev => ({ ...prev, phone: false }))
                        }
                      }}
                      className={`${errors.phone ? "border-red-500 border-2 bg-red-500/10" : ""}`}
                      required
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">Phone number is required</p>
                    )}
                  </div>
                  <textarea
                    placeholder="Special Requests"
                    value={formData.specialRequests}
                    onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                    className="col-span-2 px-3 py-2 border border-border rounded-lg resize-none bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 3: Review & Confirm</h3>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p><strong>Guest:</strong> {formData.firstName} {formData.lastName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>Dates:</strong> {checkInDate && checkOutDate && `${format(checkInDate, "dd/MM/yyyy")} - ${format(checkOutDate, "dd/MM/yyyy")}`}</p>
                  <p><strong>Nights:</strong> {nights}</p>
                  <p><strong>Guests:</strong> {formData.adults} adult(s), {formData.children} child(ren)</p>
                  <p><strong>Rooms:</strong> {Object.entries(selectedRooms).map(([name, count]) => `${name} x${count}`).join(", ")}</p>
                  <p><strong>Total:</strong> KES {calculateTotal().toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {step === 3 ? (isSubmitting ? "Creating..." : "Create Booking") : "Next"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

