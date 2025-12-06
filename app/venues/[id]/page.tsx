"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Users, Wifi, Zap, CalendarIcon, CheckCircle2, Phone, X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid } from "date-fns"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PaymentInfoModal } from "@/components/payment-info-modal"

type VenueData = {
  name: string
  description: string
  capacity: number
  image?: string
  images?: string[]
  setupStyles?: string[]
  facilities?: string[]
  pricing?: {
    halfDay?: number
    fullDay?: number
    executiveRetreat?: number
  }
  price?: number
  status?: string
  // New fields from dashboard form
  operatingHours?: { start?: string; end?: string }
  packages?: Array<{ id: string; name: string; description?: string; durationHours?: number; price?: number; cateringIncluded?: boolean; paymentUrl?: string }>
  capacities?: {
    theatre?: number
    classroom?: number
    uShape?: number
    boardroom?: number
  }
}

export default function VenueDetailsPage() {
  const params = useParams()
  const venueId = params.id as string
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [eventDate, setEventDate] = useState<Date | undefined>()
  const [showCal, setShowCal] = useState(false)
  const calWrapperRef = useRef<HTMLDivElement | null>(null)
  const [eventType, setEventType] = useState("Corporate Event")
  const [guests, setGuests] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingPaymentData, setPendingPaymentData] = useState<{ paymentUrl: string; eventData: any } | null>(null)
  // Package/time derived from venue
  const [selectedPackageId, setSelectedPackageId] = useState<string>("")
  const selectedPackage = useMemo(() => venue?.packages?.find(p => p.id === selectedPackageId), [venue, selectedPackageId])
  const [startTime, setStartTime] = useState<string>("")
  const timeOptions = useMemo(() => {
    const opts: string[] = []
    const start = venue?.operatingHours?.start
    const end = venue?.operatingHours?.end
    if (!start || !end) return opts
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = end.split(":").map(Number)
    const startMin = (sh || 0) * 60 + (sm || 0)
    const endMin = (eh || 0) * 60 + (em || 0)
    for (let m = startMin; m <= endMin; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0")
      const mm = String(m % 60).padStart(2, "0")
      opts.push(`${hh}:${mm}`)
    }
    return opts
  }, [venue])
  const computedEndTime = useMemo(() => {
    if (!startTime || !selectedPackage?.durationHours) return ""
    const [h, mm] = startTime.split(":").map(Number)
    const base = (h || 0) * 60 + (mm || 0)
    const endTotal = base + (selectedPackage.durationHours || 0) * 60
    const endH = Math.floor(endTotal / 60) % 24
    const endM = endTotal % 60
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
  }, [startTime, selectedPackage])
  
  const CONTACT_PHONE = "+254-722-867-400"
  
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const layoutEntries = useMemo(() => {
    if (!venue?.capacities) return []
    return [
      { key: "theatre", label: "Theatre", value: venue.capacities.theatre },
      { key: "classroom", label: "Classroom", value: venue.capacities.classroom },
      { key: "uShape", label: "U-Shape", value: venue.capacities.uShape },
      { key: "boardroom", label: "Boardroom", value: venue.capacities.boardroom },
    ].filter((layout) => typeof layout.value === "number" && Number(layout.value) > 0)
  }, [venue])
  const layoutLine = useMemo(
    () => layoutEntries.map((layout) => `${layout.label}: ${layout.value}`).join(" • "),
    [layoutEntries],
  )
  
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
    
    // Validation
    if (!eventDate || !isValid(eventDate)) {
      alert("Please select an event date")
      return
    }
    
    if (!guests || Number(guests) < 1) {
      alert("Please enter the number of guests")
      return
    }

    setSubmitting(true)
    
    try {
      // Check if selected package has a payment URL
      const paymentUrl = selectedPackage?.paymentUrl?.trim() || null
      
      const trimmedSpecialRequests = specialRequests.trim()
      const eventData = {
        id: `CEV-${Date.now()}`,
        name: `${eventType} at ${venue?.name || "Venue"}`,
        venueId: venueId,
        venueName: venue?.name || "",
        date: format(eventDate, "yyyy-MM-dd"),
        guests: Number(guests),
        note: trimmedSpecialRequests || null,
        eventType: eventType,
        packageId: selectedPackage?.id ?? null,
        packageName: selectedPackage?.name ?? null,
        packagePrice: typeof selectedPackage?.price === "number" ? selectedPackage?.price : null,
        packageDurationHours: selectedPackage?.durationHours ?? null,
        startTime: startTime || null,
        endTime: computedEndTime || null,
        status: "pending",
        type: "venue-quote", // To differentiate from other bookings
        paymentUrl: paymentUrl,
        createdAt: serverTimestamp(),
      }
      
      // If payment URL exists, show modal to collect name and phone
      if (paymentUrl) {
        setPendingPaymentData({ paymentUrl, eventData })
        setShowPaymentModal(true)
        setSubmitting(false)
        return
      }
      
      // For non-payment URL cases, we still need customer info - show a simple alert
      alert("Please contact us directly to complete your booking. Our team will reach out to you shortly.")
      await addDoc(collection(db, "clientEvents"), {
        ...eventData,
        customerName: "Pending Contact",
        customerEmail: "pending@contact.com",
        customerPhone: "",
      })
      
      // Reset form
      setEventDate(undefined)
      setEventType("Corporate Event")
      setGuests("")
      setSpecialRequests("")
      
      // Show success modal
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Failed to submit quote request:", error)
      alert("Failed to submit your request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const loadVenue = async () => {
      try {
        const docRef = doc(db, "venues", venueId)
        const docSnap = await getDoc(docRef)
        
        if (!docSnap.exists()) {
          setNotFound(true)
          setLoading(false)
          return
        }

        const data = docSnap.data() as any
        setVenue({
          name: data.name || "",
          description: data.description || "",
          capacity: Number(data.capacity ?? 0),
          image: data.image || data.images?.[0],
          images: data.images || (data.image ? [data.image] : []),
          setupStyles: data.setupStyles || [],
          facilities: data.facilities || [],
          // Do not derive dummy pricing; show only real packages from dashboard
          pricing: undefined,
          operatingHours: data.operatingHours || undefined,
          packages: (data.packages || []).map((pkg: any) => ({
            ...pkg,
            paymentUrl: pkg.paymentUrl || "",
          })),
          capacities: data.capacities || undefined,
        })
      } catch (error) {
        console.error("Error loading venue:", error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (venueId) {
      loadVenue()
    }
  }, [venueId])
  
  // Default select first package and time when venue loads
  useEffect(() => {
    setSelectedPackageId(venue?.packages?.[0]?.id || "")
    setStartTime(timeOptions[0] || "")
  }, [venue, timeOptions])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <p className="text-foreground/70">Loading venue...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-primary mb-4">Venue Not Found</h1>
            <Link href="/venues" className="text-accent hover:underline">
              Back to Venues
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        {/* Hero Image */}
        <div className="h-96 md:h-screen bg-cover bg-center" style={{ backgroundImage: `url('${venue.image || venue.images?.[0] || "/luxury-ballroom.jpg"}')` }} />

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Venue Details */}
            <div className="lg:col-span-2">
              <h1 className="font-serif text-4xl font-bold text-primary mb-4">{venue.name}</h1>
              <p className="text-foreground/70 text-lg leading-relaxed mb-8">{venue.description}</p>

              <div className="mb-8">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Capacity & Setup</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={20} className="text-accent" />
                      <span className="text-sm text-foreground/70">Maximum Capacity</span>
                    </div>
                    <p className="font-serif text-2xl font-bold text-primary">{venue.capacity} Guests</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={20} className="text-accent" />
                      <span className="text-sm text-foreground/70">Setup Styles</span>
                    </div>
                    <p className="font-semibold">{venue.setupStyles && venue.setupStyles.length > 0 ? venue.setupStyles.join(", ") : "Flexible"}</p>
                  </div>
                </div>
                {layoutEntries.length > 0 && (
                  <div className="mt-6 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap pr-2">
                    <span>{layoutLine}</span>
                  </div>
                )}
              </div>

              {venue.facilities && venue.facilities.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-serif text-2xl font-bold text-primary mb-4">Facilities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {venue.facilities.map((facility, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        {facility.includes("WiFi") && <Wifi size={20} className="text-accent" />}
                        {facility.includes("AV") && <Zap size={20} className="text-accent" />}
                        <span className="text-sm font-medium">{facility}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quote Form */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg shadow-lg p-6 sticky top-20">
                <h3 className="font-serif text-2xl font-bold text-primary mb-6">Request a Quote</h3>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {venue.packages && venue.packages.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Package</label>
                      <select
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {venue.packages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{typeof p.price === "number" ? ` • KES ${p.price}` : ""}{p.durationHours ? ` • ${p.durationHours}h` : ""}
                          </option>
                        ))}
                      </select>
                      {selectedPackageId && startTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Starts {startTime}{selectedPackage?.durationHours ? ` • Ends ${computedEndTime}` : ""}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                    >
                      <option>Wedding</option>
                      <option>Corporate Event</option>
                      <option>Conference</option>
                      <option>Party</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Event Date</label>
                    <div className="relative" ref={calWrapperRef}>
                      <button
                        type="button"
                        className="flex items-center w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-left bg-background"
                        onClick={() => setShowCal((s) => !s)}
                      >
                        <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                        <span className={eventDate && isValid(eventDate) ? "text-foreground" : "text-muted-foreground"}>
                          {eventDate && isValid(eventDate) ? format(eventDate, "dd/MM/yyyy") : "Select date"}
                        </span>
                      </button>
                      {showCal && (
                        <div className="absolute top-12 left-0 z-20 bg-card border rounded-lg shadow-lg p-2" tabIndex={0}>
                          <Calendar
                            mode="single"
                            selected={eventDate}
                            onSelect={(d) => {
                              if (!d) return
                              setEventDate(d)
                              setShowCal(false)
                            }}
                            defaultMonth={eventDate ?? today}
                            disabled={{ before: today }}
                            showOutsideDays
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {timeOptions.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Start Time</label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                      >
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Number of Guests</label>
                    <input
                      type="number"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      placeholder="Expected guests"
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Special Requests</label>
                    <textarea
                      rows={4}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Tell us about your event..."
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : (selectedPackage?.paymentUrl?.trim() ? "Proceed to Checkout" : "Request Quote")}
                  </button>
                </form>

                {(venue.packages && venue.packages.length > 0) ? (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-primary mb-3">Packages</h4>
                    <div className="flex flex-wrap gap-2">
                      {venue.packages.map((p) => (
                        <span key={p.id} className="text-xs px-2 py-1 rounded-full border border-border bg-background">
                          {p.name}{typeof p.price === "number" ? ` • KES ${p.price}` : ""}{p.durationHours ? ` • ${p.durationHours}h` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-muted-foreground">No packages added yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Success Confirmation Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-serif text-primary">
                Quote Request Submitted!
              </DialogTitle>
              <DialogDescription className="text-base space-y-3 pt-2">
                <span className="block text-foreground mb-2">
                  Thank you for your interest. Your quote request has been successfully submitted.
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
    </div>
  )
}
