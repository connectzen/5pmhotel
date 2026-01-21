"use client"

import React, { useEffect, useState, useRef } from "react"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format, addDays, differenceInCalendarDays, isAfter, isValid } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChevronLeft, ChevronRight, Star, Wifi, Tv, Coffee } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

type RoomDoc = {
  name: string
  price: number
  rating?: number
  capacity?: number
  images?: string[]
  description?: string
  amenities?: string[]
  ratePlans?: any
}

const computeBaseRate = (ratePlans?: any) => {
  if (!ratePlans) return 0
  const bedOnly = (ratePlans as any).bedOnly
  if (bedOnly && typeof bedOnly.amount === "number" && bedOnly.amount > 0) {
    return bedOnly.amount
  }

  let min = Number.POSITIVE_INFINITY
  Object.values(ratePlans as any).forEach((plan: any) => {
    if (!plan) return
    if (typeof plan.amount === "number" && plan.amount > 0) {
      min = Math.min(min, plan.amount)
    }
    ;["single", "double", "twin"].forEach((occ) => {
      const value = plan?.[occ]
      if (typeof value === "number" && value > 0) {
        min = Math.min(min, value)
      }
    })
  })
  return Number.isFinite(min) ? min : 0
}

export default function RoomDetailsPage() {
  const params = useParams()
  const roomId = params.id as string
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("bedOnly")
  useEffect(() => {
    const load = async () => {
      const d = await getDoc(doc(db, "rooms", roomId))
      if (!d.exists()) {
        setNotFound(true)
        return
      }
      const data = d.data() as any
      const baseRate = computeBaseRate(data.ratePlans)
      const initialPlan =
        (data.ratePlans && data.ratePlans.bedOnly && data.ratePlans.bedOnly.amount) ? "bedOnly" : "bedBreakfast"
      setSelectedPlan(initialPlan)
      setRoom({
        name: data.name,
        price: Number(data.price ?? baseRate ?? 0),
        rating: Number(data.rating ?? 5),
        capacity: Number(data.capacity ?? 1),
        images: (data.images as string[]) ?? (data.image ? [data.image] : []),
        description: data.description ?? "",
        amenities: (data.amenities as string[]) ?? ["WiFi", "TV"],
        ratePlans: data.ratePlans ?? null,
      })
    }
    load()
  }, [roomId])
  const bookingFormRef = useRef<HTMLDivElement>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [showCheckInCal, setShowCheckInCal] = useState(false)
  const [showCheckOutCal, setShowCheckOutCal] = useState(false)
  const [guests, setGuests] = useState("1")
  const [nights, setNights] = useState(1)
  const [errors, setErrors] = useState({
    checkIn: false,
    checkOut: false,
  })
  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0,0,0,0)
    return d
  }, [])
  // Deterministic review count to avoid hydration mismatches
  const reviewCount = React.useMemo(() => {
    const base = `${roomId}-${room?.name ?? ''}`
    const sum = Array.from(base).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return 50 + (sum % 100)
  }, [roomId, room?.name])

  // Recalculate nights whenever dates change (must be before any early returns to keep Hooks order stable)
  React.useEffect(() => {
    if (checkIn && checkOut && isValid(checkIn) && isValid(checkOut)) {
      const diff = differenceInCalendarDays(checkOut, checkIn)
      setNights(Math.max(1, diff))
    } else {
      setNights(1)
    }
  }, [checkIn, checkOut])

  const planDefinitions: Array<{ key: string; label: string }> = [
    { key: "bedOnly", label: "Bed Only" },
    { key: "bedBreakfast", label: "Bed & Breakfast" },
    { key: "bedWine", label: "Bed & Wine" },
    { key: "bedMeal", label: "Bed & Meal" },
    { key: "halfBoard", label: "Half Board" },
    { key: "fullBoard", label: "Full Board" },
  ]

  const currentPlanPrice = React.useMemo(() => {
    if (!room?.ratePlans) return room?.price ?? 0
    const plan = (room.ratePlans as any)[selectedPlan]
    if (plan && typeof plan.amount === "number" && plan.amount > 0) {
      return plan.amount
    }
    // fallback to base rate
    return computeBaseRate(room.ratePlans) || room.price || 0
  }, [room, selectedPlan])

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-primary mb-4">Room Not Found</h1>
            <Link href="/rooms" className="text-accent hover:underline">
              Back to Rooms
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading room…</p>
        </main>
        <Footer />
      </div>
    )
  }

  const nextImage = () => {
    if (!room.images || room.images.length <= 1) return
    setCurrentImageIndex((prev) => (prev + 1) % room.images.length)
  }

  const prevImage = () => {
    if (!room.images || room.images.length <= 1) return
    setCurrentImageIndex((prev) => (prev - 1 + room.images.length) % room.images.length)
  }

  const handleBookNowClick = () => {
    bookingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Image Gallery */}
        <div className="relative h-96 md:h-screen bg-gray-200 overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-300"
            style={{ backgroundImage: `url('${room.images?.[currentImageIndex] ?? "/luxury-single-room.jpg"}')` }}
          />
          {room.images && room.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition z-10"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                {currentImageIndex + 1} / {room.images.length}
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {room.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Room Details */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <h1 className="font-serif text-4xl font-bold text-primary mb-4">{room.name}</h1>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={i < Math.floor(room.rating) ? "fill-accent text-accent" : "text-gray-300"}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">
                    {room.rating} ({reviewCount} reviews)
                  </span>
                </div>
                <p className="text-foreground/70 text-lg leading-relaxed">{room.description}</p>
              </div>

              <div className="mb-8">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {room.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      {amenity.includes("WiFi") && <Wifi size={20} className="text-accent" />}
                      {amenity.includes("TV") && <Tv size={20} className="text-accent" />}
                      {amenity.includes("Coffee") && <Coffee size={20} className="text-accent" />}
                      <span className="text-sm font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Room Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-foreground/70 mb-1">Capacity</p>
                    <p className="font-semibold text-lg">{room.capacity} Guest(s)</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-foreground/70 mb-1">Price per Night</p>
                    <p className="font-serif text-2xl font-bold text-accent">KSh {currentPlanPrice}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <div className="lg:col-span-1">
              <div ref={bookingFormRef} className="bg-card rounded-lg shadow-lg p-6 sticky top-20">
                <h3 className="font-serif text-2xl font-bold text-primary mb-4">Book This Room</h3>

                {/* Plan selector */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-foreground mb-2">Choose your package</p>
                  <div className="flex flex-wrap gap-2">
                    {planDefinitions.map((plan) => {
                      const planData = (room.ratePlans as any)?.[plan.key]
                      const amount = planData?.amount
                      if (!amount || amount <= 0) return null
                      const isActive = selectedPlan === plan.key
                      return (
                        <button
                          key={plan.key}
                          type="button"
                          onClick={() => setSelectedPlan(plan.key)}
                          className={`px-3 py-2 rounded-full border text-xs sm:text-sm transition-all ${
                            isActive
                              ? "bg-accent text-accent-foreground border-accent shadow-sm"
                              : "bg-secondary text-foreground border-border hover:border-accent/60"
                          }`}
                        >
                          <span className="font-medium">{plan.label}</span>
                          <span className="ml-2 text-[11px] sm:text-xs opacity-80">KSh {amount}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Check-in <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        data-field="check-in"
                        className={`flex items-center w-full px-4 py-2 border rounded-lg focus:ring-2 text-left transition-colors ${
                          errors.checkIn
                            ? "border-red-500 border-2 bg-red-50 focus:ring-red-500"
                            : checkIn
                            ? "border-green-500 bg-green-50/50 focus:ring-green-500"
                            : "border-border bg-white focus:ring-accent"
                        }`}
                        onClick={() => { 
                          setShowCheckInCal(v => !v); 
                          setShowCheckOutCal(false)
                          if (errors.checkIn) {
                            setErrors(prev => ({ ...prev, checkIn: false }))
                          }
                        }}
                      >
                        <CalendarIcon className={`w-5 h-5 mr-2 ${errors.checkIn ? "text-red-500" : "text-muted-foreground"}`} />
                        <span className={errors.checkIn ? "text-red-600 font-medium" : checkIn ? "text-foreground" : "text-muted-foreground"}>
                          {checkIn ? format(checkIn, "dd/MM/yyyy") : "Select date"}
                        </span>
                      </button>
                      {errors.checkIn && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <span className="font-semibold">⚠</span>
                          <span>Check-in date is required</span>
                        </p>
                      )}
                      {showCheckInCal && (
                        <div className="absolute top-12 left-0 z-20 bg-white p-2 rounded-lg shadow-lg border w-fit" tabIndex={0}>
                          <Calendar
                            mode="single"
                            selected={checkIn}
                            onSelect={(date) => {
                              if (!date) return
                              setCheckIn(date)
                              // Clear error when date is selected
                              if (errors.checkIn) {
                                setErrors(prev => ({ ...prev, checkIn: false }))
                              }
                              // auto-bump checkout if needed
                              if (!checkOut || !isAfter(checkOut, date)) {
                                const bumped = addDays(date, 1)
                                setCheckOut(bumped)
                                // Clear checkout error if date is auto-set
                                if (errors.checkOut) {
                                  setErrors(prev => ({ ...prev, checkOut: false }))
                                }
                              }
                              setShowCheckInCal(false)
                            }}
                            showOutsideDays
                            defaultMonth={checkIn ?? today}
                            disabled={{ before: today }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Check-out <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        data-field="check-out"
                        className={`flex items-center w-full px-4 py-2 border rounded-lg focus:ring-2 text-left transition-colors ${
                          errors.checkOut
                            ? "border-red-500 border-2 bg-red-50 focus:ring-red-500"
                            : checkOut
                            ? "border-green-500 bg-green-50/50 focus:ring-green-500"
                            : "border-border bg-white focus:ring-accent"
                        }`}
                        onClick={() => { 
                          setShowCheckOutCal(v => !v); 
                          setShowCheckInCal(false)
                          if (errors.checkOut) {
                            setErrors(prev => ({ ...prev, checkOut: false }))
                          }
                        }}
                      >
                        <CalendarIcon className={`w-5 h-5 mr-2 ${errors.checkOut ? "text-red-500" : "text-muted-foreground"}`} />
                        <span className={errors.checkOut ? "text-red-600 font-medium" : checkOut ? "text-foreground" : "text-muted-foreground"}>
                          {checkOut ? format(checkOut, "dd/MM/yyyy") : "Select date"}
                        </span>
                      </button>
                      {errors.checkOut && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <span className="font-semibold">⚠</span>
                          <span>Check-out date is required</span>
                        </p>
                      )}
                      {showCheckOutCal && (
                        <div className="absolute top-12 left-0 z-20 bg-white p-2 rounded-lg shadow-lg border w-fit" tabIndex={0}>
                          <Calendar
                            mode="single"
                            selected={checkOut}
                            onSelect={(date) => {
                              if (!checkIn) {
                                toast({ title: "Select check-in first" })
                                return
                              }
                              if (date && !isAfter(date, checkIn)) {
                                toast({ title: "Invalid dates", description: "Check-out must be after check-in." })
                                return
                              }
                              setCheckOut(date)
                              // Clear error when date is selected
                              if (errors.checkOut) {
                                setErrors(prev => ({ ...prev, checkOut: false }))
                              }
                              setShowCheckOutCal(false)
                            }}
                            showOutsideDays
                            defaultMonth={checkOut ?? (checkIn ? addDays(checkIn,1) : today)}
                            disabled={checkIn ? { before: addDays(checkIn, 1) } : { before: today }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Guests</label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                    </select>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-foreground/70">Price per night</span>
                    <span className="font-semibold">KSh {currentPlanPrice}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-foreground/70">Nights</span>
                    <span className="font-semibold">{nights}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-serif text-xl font-bold text-accent">KSh {currentPlanPrice * nights}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    const hasErrors = !checkIn || !checkOut
                    
                    if (hasErrors) {
                      setErrors({
                        checkIn: !checkIn,
                        checkOut: !checkOut,
                      })
                      
                      // Scroll to first error field
                      if (!checkIn) {
                        const checkInButton = document.querySelector('[data-field="check-in"]') as HTMLElement
                        checkInButton?.scrollIntoView({ behavior: "smooth", block: "center" })
                        checkInButton?.focus()
                      } else if (!checkOut) {
                        const checkOutButton = document.querySelector('[data-field="check-out"]') as HTMLElement
                        checkOutButton?.scrollIntoView({ behavior: "smooth", block: "center" })
                        checkOutButton?.focus()
                      }
                      
                      toast({
                        title: "Required fields missing",
                        description: "Please select check-in and check-out dates before proceeding.",
                        variant: "destructive",
                      })
                      return
                    }
                    
                    // No external payment URL – always go to internal booking page
                    window.location.href = `/booking?room=${encodeURIComponent(
                      room.name,
                    )}&price=${currentPlanPrice}&nights=${nights}${
                      checkIn ? `&checkIn=${format(checkIn, "yyyy-MM-dd")}` : ""
                    }${checkOut ? `&checkOut=${format(checkOut, "yyyy-MM-dd")}` : ""}&adults=${guests}&children=0&plan=${encodeURIComponent(
                      selectedPlan,
                    )}`
                  }}
                  className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition text-center"
                >
                  Proceed to Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
