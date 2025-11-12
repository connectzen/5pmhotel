"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, CalendarIcon, Loader2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid } from "date-fns"
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import type { Venue } from "@/lib/admin-store"

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type ValidationErrors = {
  eventName?: boolean
  venue?: boolean
  date?: boolean
  customerName?: boolean
  customerEmail?: boolean
  package?: boolean
  startTime?: boolean
}

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string>("")
  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId),
    [venues, selectedVenueId],
  )
  const [selectedPackageId, setSelectedPackageId] = useState<string>("")
  const selectedPackage = useMemo(
    () => selectedVenue?.packages?.find((p) => p.id === selectedPackageId),
    [selectedVenue, selectedPackageId],
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [timeStepMinutes, setTimeStepMinutes] = useState<number>(30)
  const [startTime, setStartTime] = useState<string>("")
  const [showTimeOverflowWarning, setShowTimeOverflowWarning] = useState(false)

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
      return venueEnd
    }

    setShowTimeOverflowWarning(false)
    const endH = Math.floor(endTotal / 60) % 24
    const endM = endTotal % 60
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
  }, [startTime, selectedPackage, selectedVenue])

  const totalPrice = useMemo(() => {
    const base = typeof selectedVenue?.price === "number" ? selectedVenue.price : 0
    const pkg = typeof selectedPackage?.price === "number" ? selectedPackage.price ?? 0 : 0
    return base + pkg
  }, [selectedVenue, selectedPackage])

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
      setErrors({})
      setSelectedVenueId("")
      setSelectedPackageId("")
      setStartTime("")
      setTimeStepMinutes(30)
      setShowCal(false)
      return
    }

    const unsub = onSnapshot(collection(db, "venues"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Venue) }))
      setVenues(list)
      if (!selectedVenueId && list.length) {
        setSelectedVenueId(list[0].id)
      }
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id)
    }
  }, [selectedVenueId, venues])

  useEffect(() => {
    setSelectedPackageId(selectedVenue?.packages?.[0]?.id || "")
    setStartTime(timeOptions[0] || "")
  }, [selectedVenue, timeOptions])

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

    const newErrors: ValidationErrors = {}
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
    if (selectedVenue?.packages && selectedVenue.packages.length > 0 && !selectedPackageId) {
      newErrors.package = true
      hasErrors = true
    }
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
    if (!eventDate || !isValid(eventDate)) return

    setIsSubmitting(true)

    try {
      await addDoc(collection(db, "clientEvents"), {
        id: `CEV-${Date.now()}`,
        name: eventName.trim(),
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        date: format(eventDate, "yyyy-MM-dd"),
        guests: Number(guests),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || null,
        note: note.trim() || null,
        packageId: selectedPackage?.id ?? null,
        packageName: selectedPackage?.name ?? null,
        packagePrice: typeof selectedPackage?.price === "number" ? selectedPackage.price : null,
        packageDurationHours: selectedPackage?.durationHours ?? null,
        startTime: startTime || null,
        endTime: computedEndTime || null,
        timeStepMinutes,
        totalPrice,
        status: "pending",
        createdBy: "admin",
        createdAt: serverTimestamp(),
      })

      toast({
        title: "Event created",
        description: "The event request has been recorded and is pending approval.",
      })
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
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-5xl mt-6 mb-10 shadow-xl">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <h2 className="text-2xl font-semibold text-foreground">Create New Event</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Event Name</label>
                <Input
                  value={eventName}
                  onChange={(e) => {
                    setEventName(e.target.value)
                    if (errors.eventName) setErrors((prev) => ({ ...prev, eventName: false }))
                  }}
                  placeholder="e.g., Corporate Gala"
                  className={errors.eventName ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Venue</label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => {
                    setSelectedVenueId(e.target.value)
                    if (errors.venue) setErrors((prev) => ({ ...prev, venue: false }))
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                    errors.venue ? "border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500" : "border-border"
                  }`}
                  required
                >
                  <option value="">Select a venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {errors.venue && <p className="text-xs text-red-600 mt-1">Please select a venue.</p>}
              </div>

              {selectedVenue?.packages && selectedVenue.packages.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Package</label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => {
                      setSelectedPackageId(e.target.value)
                      if (errors.package) setErrors((prev) => ({ ...prev, package: false }))
                    }}
                    className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                      errors.package ? "border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500" : "border-border"
                    }`}
                  >
                    {selectedVenue.packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {typeof p.price === "number" ? ` • KES ${p.price}` : ""}
                        {p.durationHours ? ` • ${p.durationHours}h` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedPackage && startTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Starts {startTime}
                      {selectedPackage.durationHours ? ` • Ends ${computedEndTime}` : ""}
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
                      errors.date ? "border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500" : "border-border"
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
                          if (errors.date) setErrors((prev) => ({ ...prev, date: false }))
                        }}
                        defaultMonth={eventDate ?? today}
                        disabled={{ before: today }}
                        showOutsideDays
                      />
                    </div>
                  )}
                </div>
                {errors.date && <p className="text-xs text-red-600 mt-1">Please choose a date.</p>}
              </div>

              {timeOptions.length > 0 && (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-1">Start Time</label>
                      <select
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value)
                          if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: false }))
                        }}
                        className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                          errors.startTime
                            ? "border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                            : "border-border"
                        }`}
                      >
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {errors.startTime && <p className="text-xs text-red-600 mt-1">Select a start time.</p>}
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
                <Input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value || "0", 10) || 1)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Client Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value)
                    if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: false }))
                  }}
                  className={errors.customerName ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value)
                    if (errors.customerEmail) setErrors((prev) => ({ ...prev, customerEmail: false }))
                  }}
                  className={errors.customerEmail ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Phone</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+254..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground min-h-24"
                  placeholder="Any special requirements?"
                />
              </div>
              <div className="lg:hidden">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-accent text-accent-foreground rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/40">
                <h3 className="font-semibold mb-2">Venue Summary</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Name:</strong> {selectedVenue?.name ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Capacity:</strong> {selectedVenue?.capacity ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Base Price:</strong>{" "}
                  {typeof selectedVenue?.price === "number" ? `KES ${selectedVenue.price.toLocaleString()}` : "—"}
                </p>
                {selectedPackage && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Package:</strong> {selectedPackage.name}
                    {typeof selectedPackage.price === "number" ? ` (KES ${selectedPackage.price})` : ""}
                  </p>
                )}
                {startTime && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Start:</strong> {startTime}
                    {computedEndTime ? ` • End: ${computedEndTime}` : ""}
                  </p>
                )}
                {selectedVenue?.operatingHours?.start && selectedVenue?.operatingHours?.end && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Hours:</strong> {selectedVenue.operatingHours.start} – {selectedVenue.operatingHours.end}
                  </p>
                )}
                {selectedVenue?.capacities && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Layouts:</strong> Theatre {selectedVenue.capacities.theatre ?? 0}, Classroom{" "}
                    {selectedVenue.capacities.classroom ?? 0}, U-Shape {selectedVenue.capacities.uShape ?? 0}, Boardroom{" "}
                    {selectedVenue.capacities.boardroom ?? 0}
                  </p>
                )}
                {selectedVenue?.description && <p className="text-sm mt-2">{selectedVenue.description}</p>}
                <p className="text-sm text-foreground mt-2">
                  <strong>Total:</strong> KES {totalPrice.toLocaleString()}
                </p>
              </div>

              <div className="hidden lg:block">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-accent text-accent-foreground rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
