"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid } from "date-fns"
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  const [venues, setVenues] = useState<any[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string>("")
  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId),
    [venues, selectedVenueId],
  )

  const [eventName, setEventName] = useState("")
  const [eventDate, setEventDate] = useState<Date | undefined>()
  const [showCal, setShowCal] = useState(false)
  const calWrapperRef = useRef<HTMLDivElement | null>(null)
  const [guests, setGuests] = useState(50)
  const [eventType, setEventType] = useState("Corporate Event")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    eventName?: boolean;
    venue?: boolean;
    date?: boolean;
    customerName?: boolean;
    customerEmail?: boolean;
  }>({})

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setEventName("")
      setEventDate(undefined)
      setGuests(50)
      setCustomerName("")
      setCustomerEmail("")
      setCustomerPhone("")
      setNote("")
      setEventType("Corporate Event")
      setErrors({})
      setSelectedVenueId("")
    }
  }, [isOpen])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "venues"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setVenues(list)
      if (!selectedVenueId && list.length) setSelectedVenueId(list[0].id)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id)
    }
  }, [selectedVenueId, venues])

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
    
    try {
      const eventData = {
        id: `CEV-${Date.now()}`,
        name: eventName,
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        date: format(eventDate!, "yyyy-MM-dd"),
        guests: Number(guests),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        note: note.trim() || undefined,
        eventType: eventType,
        status: "pending",
        createdAt: serverTimestamp(),
      }
      
      await addDoc(collection(db, "clientEvents"), eventData)
      
      toast({ title: "Event created successfully!", description: "The event has been added and is now pending approval." })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error("Failed to create event:", err)
      toast({ title: "Failed to create event", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Create New Event</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Event Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value)
                  if (errors.eventName) setErrors(prev => ({ ...prev, eventName: false }))
                }}
                placeholder="Enter event name"
                className={errors.eventName ? "border-red-500" : ""}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Venue <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => {
                  setSelectedVenueId(e.target.value)
                  if (errors.venue) setErrors(prev => ({ ...prev, venue: false }))
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-secondary text-foreground ${
                  errors.venue ? "border-red-500" : "border-border"
                }`}
                required
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative" ref={calWrapperRef}>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Event Date <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCal(!showCal)}
                className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between bg-secondary text-foreground ${
                  errors.date ? "border-red-500" : "border-border"
                }`}
              >
                <span>{eventDate ? format(eventDate, "dd/MM/yyyy") : "Select date"}</span>
                <CalendarIcon className="w-4 h-4" />
              </button>
              {showCal && (
                <div className="absolute top-full mt-1 z-10 bg-white border rounded-lg shadow-lg">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(date) => {
                      setEventDate(date)
                      setShowCal(false)
                      if (errors.date) setErrors(prev => ({ ...prev, date: false }))
                    }}
                    disabled={{ before: today }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Number of Guests <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground"
              >
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
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (errors.customerName) setErrors(prev => ({ ...prev, customerName: false }))
                }}
                placeholder="Enter customer name"
                className={errors.customerName ? "border-red-500" : ""}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Customer Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value)
                  if (errors.customerEmail) setErrors(prev => ({ ...prev, customerEmail: false }))
                }}
                placeholder="Enter customer email"
                className={errors.customerEmail ? "border-red-500" : ""}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Customer Phone
              </label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter customer phone (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Special Requests / Notes
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special requests or requirements..."
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground resize-none"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

