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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all required fields
    const newErrors: {
      eventName?: boolean;
      venue?: boolean;
      date?: boolean;
      customerName?: boolean;
      customerEmail?: boolean;
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

    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    
    if (!selectedVenue) return
    
    setIsSubmitting(true)
    
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
    try {
      await addDoc(collection(db, "clientEvents"), {
        ...pending,
        createdAt: serverTimestamp(),
      })
      
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
    <section className="py-16 px-4 bg-background">
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
                  "Submit Request"
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
                  "Submit Request"
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
    </section>
  )
}


