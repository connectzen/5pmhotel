"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Venue } from "@/lib/admin-store"
import { format, isValid } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, CheckCircle2, Phone, Loader2 } from "lucide-react"
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PaymentInfoModal } from "@/components/payment-info-modal"

type ClientEvent = {
  id: string
  name: string
  venueId: string
  venueName: string
  date: string
  guests: number
  customerName: string
  customerEmail: string
  customerPhone: string
  note?: string
  status: "pending" | "approved"
}

export function CreateEvent() {
  const [venues, setVenues] = useState<Venue[]>([] as any)
  const [selectedVenueId, setSelectedVenueId] = useState<string>("")
  const selectedVenue: Venue | undefined = useMemo(
    () => venues.find((v) => v.id === selectedVenueId),
    [venues, selectedVenueId],
  )
  // Venue-driven selections
  const [selectedPackageId, setSelectedPackageId] = useState<string>("")
  const selectedPackage = useMemo(
    () => selectedVenue?.packages?.find((p) => p.id === selectedPackageId),
    [selectedVenue, selectedPackageId],
  )
  const [timeStepMinutes, setTimeStepMinutes] = useState<number>(30)
  const timeOptions = useMemo(() => {
    const opts: string[] = []
    const start = selectedVenue?.operatingHours?.start
    const end = selectedVenue?.operatingHours?.end
    if (!start || !end) return opts
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = end.split(":").map(Number)
    const startMin = (sh || 0) * 60 + (sm || 0)
    const endMin = (eh || 0) * 60 + (em || 0)
    const step = Math.max(5, timeStepMinutes || 30)
    for (let m = startMin; m <= endMin; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0")
      const mm = String(m % 60).padStart(2, "0")
      opts.push(`${hh}:${mm}`)
    }
    return opts
  }, [selectedVenue, timeStepMinutes])
  const [startTime, setStartTime] = useState<string>("")
  const [showTimeOverflowWarning, setShowTimeOverflowWarning] = useState(false)
  const computedEndTime = useMemo(() => {
    if (!startTime || !selectedPackage?.durationHours) return ""
    const [h, m] = startTime.split(":").map(Number)
    const totalStart = (h || 0) * 60 + (m || 0)
    const durationMin = (selectedPackage.durationHours || 0) * 60
    const endTotal = totalStart + durationMin

    const venueEnd = selectedVenue?.operatingHours?.end
    if (!venueEnd) {
      const endH = Math.floor(endTotal / 60) % 24
      const endM = endTotal % 60
      setShowTimeOverflowWarning(false)
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
    }

    const [eh, em] = venueEnd.split(":").map(Number)
    const endMinAllowed = (eh || 0) * 60 + (em || 0)
    if (endTotal > endMinAllowed) {
      setShowTimeOverflowWarning(true)
      return venueEnd // clamp to venue end
    } else {
      setShowTimeOverflowWarning(false)
      const endH = Math.floor(endTotal / 60) % 24
      const endM = endTotal % 60
      return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
    }
  }, [startTime, selectedPackage, selectedVenue])

  const totalPrice = useMemo(() => {
    const base = typeof selectedVenue?.price === "number" ? selectedVenue!.price : 0
    const pkg = typeof selectedPackage?.price === "number" ? selectedPackage!.price! : 0
    return base + pkg
  }, [selectedVenue, selectedPackage])

  const [eventName, setEventName] = useState("")
  const [eventDate, setEventDate] = useState<Date | undefined>()
  const [showCal, setShowCal] = useState(false)
  const calWrapperRef = useRef<HTMLDivElement | null>(null)
  const [guests, setGuests] = useState(50)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [note, setNote] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingPaymentData, setPendingPaymentData] = useState<{ paymentUrl: string; eventData: any } | null>(null)
  const [errors, setErrors] = useState<{
    eventName?: boolean;
    venue?: boolean;
    date?: boolean;
    customerName?: boolean;
    customerEmail?: boolean;
  }>({})
  
  const CONTACT_PHONE = "+254-722-867-400"

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Load venues from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "venues"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any
      setVenues(list)
      if (!selectedVenueId && list.length) setSelectedVenueId(list[0].id)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!selectedVenueId && venues.length) setSelectedVenueId(venues[0].id)
  }, [selectedVenueId, venues])
  useEffect(() => {
    // default selections whenever venue changes
    setSelectedPackageId(selectedVenue?.packages?.[0]?.id || "")
    setStartTime(timeOptions[0] || "")
  }, [selectedVenue, timeOptions])

  // Close calendar on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!calWrapperRef.current) return
      const target = e.target as Node
      if (!calWrapperRef.current.contains(target)) {
        setShowCal(false)
      }
    }
    if (showCal) document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [showCal])

  const handleProceedToPayment = async (customerName: string, customerPhone: string) => {
    if (!pendingPaymentData) return
    
    try {
      // Save event with customer info and external payment status
      await addDoc(collection(db, "clientEvents"), {
        ...pendingPaymentData.eventData,
        customerName: customerName,
        customerPhone: customerPhone,
        paymentStatus: "external-pending",
        paymentMethod: "external",
      })
      
      // Redirect to payment URL
      window.location.href = pendingPaymentData.paymentUrl
    } catch (error) {
      console.error("Failed to save event:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    const newErrors: {
      eventName?: boolean;
      venue?: boolean;
      date?: boolean;
      customerName?: boolean;
      customerEmail?: boolean;
      startTime?: boolean;
      package?: boolean;
    } = {}
    let hasErrors = false

    if (!eventName.trim()) {
      newErrors.eventName = true
      hasErrors = true
    }
    if (!selectedVenueId) {
      newErrors.venue = true
      hasErrors = true
    }
    if (!eventDate || !isValid(eventDate)) {
      newErrors.date = true
      hasErrors = true
    }
    if (!customerName.trim()) {
      newErrors.customerName = true
      hasErrors = true
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      newErrors.customerEmail = true
      hasErrors = true
    }
    // Require package when venue has packages
    if (selectedVenue?.packages && selectedVenue.packages.length > 0 && !selectedPackageId) {
      newErrors.package = true
      hasErrors = true
    }
    // Require start time if venue has operating hours
    if (selectedVenue?.operatingHours?.start && selectedVenue?.operatingHours?.end && !startTime) {
      newErrors.startTime = true
      hasErrors = true
    }

    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    
    if (!selectedVenue) return
    
    setIsSubmitting(true)
    
    if (!eventDate || !isValid(eventDate)) {
      setErrors(prev => ({ ...prev, date: true }))
      setIsSubmitting(false)
      return
    }
    
    // Check if selected package has a payment URL
    const paymentUrl = selectedPackage?.paymentUrl?.trim() || null
    
    // Prepare event data
    const pending: ClientEvent = {
      id: `CEV-${Date.now()}`,
      name: eventName,
      venueId: selectedVenue.id,
      venueName: selectedVenue.name,
      date: format(eventDate, "yyyy-MM-dd"),
      guests,
      customerName,
      customerEmail,
      customerPhone,
      note,
      status: "pending",
    }
    
    const eventData = {
      ...pending,
      // Include selected package and timing details for backend handling
      packageId: selectedPackage?.id ?? null,
      packageName: selectedPackage?.name ?? null,
      packagePrice: typeof selectedPackage?.price === "number" ? selectedPackage?.price : null,
      packageDurationHours: selectedPackage?.durationHours ?? null,
      startTime: startTime || null,
      endTime: computedEndTime || null,
      timeStepMinutes,
      totalPrice,
      paymentUrl: paymentUrl,
      createdAt: serverTimestamp(),
    }
    
    // If payment URL exists, show modal to collect name and phone
    if (paymentUrl) {
      setPendingPaymentData({ paymentUrl, eventData })
      setShowPaymentModal(true)
      setIsSubmitting(false)
      return
    }
    
    try {
      await addDoc(collection(db, "clientEvents"), eventData)
      
      // Reset form
      setEventName("")
      setEventDate(undefined)
      setGuests(50)
      setCustomerName("")
      setCustomerEmail("")
      setCustomerPhone("")
      setNote("")
      
      // Show success modal
      setShowSuccessModal(true)
    } catch (err) {
      console.error("Failed to submit event:", err)
      alert("Failed to submit event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="plan-event" className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl font-bold text-primary mb-8">Plan Your Event</h2>
        <form className="bg-card border rounded-lg p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6" onSubmit={handleSubmit}>
          {/* Left column: basics */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Event Name</label>
              <input
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value)
                  if (errors.eventName) setErrors(prev => ({ ...prev, eventName: false }))
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                  errors.eventName ? "border-red-500 border-2" : "border-border"
                }`}
                placeholder="e.g., Corporate Gala"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Venue</label>
              <select
                value={selectedVenueId}
                onChange={(e) => {
                  setSelectedVenueId(e.target.value)
                  if (errors.venue) setErrors(prev => ({ ...prev, venue: false }))
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                  errors.venue ? "border-red-500 border-2" : "border-border"
                }`}
              >
                <option value="">Select a venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            {/* Package selection, if any */}
            {selectedVenue?.packages && selectedVenue.packages.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-1">Package</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => {
                    setSelectedPackageId(e.target.value)
                    if (errors.package) setErrors(prev => ({ ...prev, package: false }))
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                    errors.package ? "border-red-500 border-2" : "border-border"
                  }`}
                >
                  {selectedVenue.packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{typeof p.price === "number" ? ` • KES ${p.price}` : ""}{p.durationHours ? ` • ${p.durationHours}h` : ""}
                    </option>
                  ))}
                </select>
                {selectedPackage && startTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Starts {startTime}{selectedPackage.durationHours ? ` • Ends ${computedEndTime}` : ""}
                  </p>
                )}
                {errors.package && <p className="text-xs text-red-600 mt-1">Please select a package.</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <div className="relative" ref={calWrapperRef}>
                <button
                  type="button"
                  className={`flex items-center w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                    errors.date ? "border-red-500 border-2" : "border-border"
                  }`}
                  onClick={() => setShowCal((s) => !s)}
                >
                  <CalendarIcon className="w-5 h-5 mr-2 opacity-60" />
                  {eventDate && isValid(eventDate) ? format(eventDate, "dd/MM/yyyy") : "Select date"}
                </button>
                {showCal && (
                  <div className="absolute z-20 bg-card border rounded-lg shadow-lg mt-2 p-2">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(d) => { 
                        if (!d) return
                        setEventDate(d)
                        setShowCal(false)
                        if (errors.date) setErrors(prev => ({ ...prev, date: false }))
                      }}
                      defaultMonth={eventDate ?? today}
                      disabled={{ before: today }}
                      showOutsideDays
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Time selection inside operating hours */}
            {timeOptions.length > 0 && (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1">Start Time</label>
                    <select
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value)
                        if (errors.startTime) setErrors(prev => ({ ...prev, startTime: false }))
                      }}
                      className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                        errors.startTime ? "border-red-500 border-2" : "border-border"
                      }`}
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.startTime && <p className="text-xs text-red-600 mt-1">Please select a start time.</p>}
                    {showTimeOverflowWarning && (
                      <p className="text-xs text-amber-600 mt-1">
                        End time exceeds operating hours; clamped to {selectedVenue?.operatingHours?.end}.
                      </p>
                    )}
                  </div>
                  <div className="w-40">
                    <label className="block text-sm font-semibold mb-1">Time Step</label>
                    <select
                      value={String(timeStepMinutes)}
                      onChange={(e) => setTimeStepMinutes(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="5">5 min</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">1 hour</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1">Guests</label>
              <input type="number" min={1} value={guests} onChange={(e) => setGuests(parseInt(e.target.value || "0", 10))} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
            </div>
          </div>

          {/* Middle column: client details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Your Name</label>
              <input 
                required 
                value={customerName} 
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (errors.customerName) setErrors(prev => ({ ...prev, customerName: false }))
                }} 
                className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                  errors.customerName ? "border-red-500 border-2" : "border-border"
                }`} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input 
                required 
                type="email" 
                value={customerEmail} 
                onChange={(e) => {
                  setCustomerEmail(e.target.value)
                  if (errors.customerEmail) setErrors(prev => ({ ...prev, customerEmail: false }))
                }} 
                className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                  errors.customerEmail ? "border-red-500 border-2" : "border-border"
                }`} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phone</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" />
            </div>
            <div className="lg:hidden">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-accent text-accent-foreground rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  selectedPackage?.paymentUrl?.trim() ? "Proceed to Checkout" : "Submit Request"
                )}
              </button>
            </div>
          </div>

          {/* Right column: venue details + note + submit */}
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-background">
              <h3 className="font-semibold mb-2">Venue Details</h3>
              <p className="text-sm text-muted-foreground"><strong>Name:</strong> {selectedVenue?.name}</p>
              <p className="text-sm text-muted-foreground"><strong>Capacity:</strong> {selectedVenue?.capacity}</p>
              <p className="text-sm text-muted-foreground"><strong>Base Price:</strong> KES {selectedVenue?.price?.toLocaleString()}</p>
              {selectedPackage && (
                <p className="text-sm text-muted-foreground">
                  <strong>Selected Package:</strong> {selectedPackage.name}{typeof selectedPackage.price === "number" ? ` (KES ${selectedPackage.price})` : ""}
                </p>
              )}
              {startTime && (
                <p className="text-sm text-muted-foreground">
                  <strong>Start:</strong> {startTime}{computedEndTime ? ` • End: ${computedEndTime}` : ""}
                </p>
              )}
              <p className="text-sm text-foreground mt-2">
                <strong>Total:</strong> KES {totalPrice.toLocaleString()}
              </p>
              {selectedVenue?.operatingHours?.start && selectedVenue?.operatingHours?.end && (
                <p className="text-sm text-muted-foreground"><strong>Hours:</strong> {selectedVenue.operatingHours.start} – {selectedVenue.operatingHours.end}</p>
              )}
              {selectedVenue?.capacities && (
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Layouts:</strong> Theatre {selectedVenue.capacities.theatre ?? 0}, Classroom {selectedVenue.capacities.classroom ?? 0}, U-Shape {selectedVenue.capacities.uShape ?? 0}, Boardroom {selectedVenue.capacities.boardroom ?? 0}
                </p>
              )}
              {selectedVenue?.description && <p className="text-sm mt-2">{selectedVenue.description}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground min-h-24" placeholder="Any special requirements?" />
            </div>
            <div className="hidden lg:block">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-accent text-accent-foreground rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  selectedPackage?.paymentUrl?.trim() ? "Proceed to Checkout" : "Submit Request"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Success Confirmation Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-serif text-primary">
                Event Request Submitted!
              </DialogTitle>
              <DialogDescription className="text-base space-y-3 pt-2">
                <span className="block text-foreground mb-2">
                  Thank you for your interest. Your event request has been successfully submitted.
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
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
              >
                Close
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1"
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
      
      <PaymentInfoModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setPendingPaymentData(null)
        }}
        onProceed={handleProceedToPayment}
        title="Booking Information"
        showGuestInfo={true}
      />
    </section>
  )
}


