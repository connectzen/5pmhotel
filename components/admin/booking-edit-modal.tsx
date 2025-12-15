"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Booking } from "@/lib/admin-store"
import { X } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { differenceInCalendarDays, parseISO, isValid } from "date-fns"
import { TimePicker } from "@/components/admin/time-picker"

interface BookingEditModalProps {
  booking: Booking
  onSave: (next: Booking) => void
  onClose: () => void
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

export function BookingEditModal({ booking, onSave, onClose }: BookingEditModalProps) {
  const [form, setForm] = useState<Booking>({ ...booking })
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [checkInTime, setCheckInTime] = useState<string>((booking as any).checkInTime || "")
  const [checkOutTime, setCheckOutTime] = useState<string>((booking as any).checkOutTime || (booking as any).checkoutTime || "")

  // Load rooms from Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const roomsList = snap.docs.map((d) => {
        const data = d.data()
        const baseRate = computeBaseRate((data as any).ratePlans)
        return { id: d.id, name: data.name, price: Number(data.price ?? baseRate ?? 0) }
      })
      setRooms(roomsList)
    })
    return () => unsub()
  }, [])

  // Find matching room for current booking when rooms load
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId && form.room) {
      const matchingRoom = rooms.find(r => r.name === form.room)
      if (matchingRoom) {
        setSelectedRoomId(matchingRoom.id)
      }
    }
  }, [rooms, form.room, selectedRoomId])

  // Calculate nights from dates
  const nights = useMemo(() => {
    if (!form.dates) return 1
    
    const dates = (form.dates || "").split(" - ")
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
        return Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
      }
    }
    return 1
  }, [form.dates])

  // Calculate amount when room or nights change (but only update if selectedRoomId exists)
  useEffect(() => {
    if (selectedRoomId && rooms.length > 0) {
      const selectedRoom = rooms.find(r => r.id === selectedRoomId)
      if (selectedRoom) {
        const calculatedAmount = selectedRoom.price * nights
        setForm(prev => {
          // Only update if amount or room name is different to avoid unnecessary updates
          if (prev.amount !== calculatedAmount || prev.room !== selectedRoom.name) {
            return { ...prev, amount: calculatedAmount, room: selectedRoom.name }
          }
          return prev
        })
      }
    }
  }, [selectedRoomId, nights, rooms])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <Card className="w-full max-w-md my-4 shadow-xl">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Edit Booking</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground">Customer <span className="text-red-500">*</span></label>
              <input
                className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-secondary text-foreground"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground">Select Room <span className="text-red-500">*</span></label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value)
                  const selectedRoom = rooms.find(r => r.id === e.target.value)
                  if (selectedRoom) {
                    const calculatedAmount = selectedRoom.price * nights
                    setForm(prev => ({ ...prev, room: selectedRoom.name, amount: calculatedAmount }))
                  }
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-secondary text-foreground"
                required
              >
                <option value="">-- Select Room --</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} - KSh {room.price.toLocaleString()} per night
                  </option>
                ))}
              </select>
              {selectedRoomId && form.amount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Calculated Amount: KSh {form.amount.toLocaleString()} ({nights} night{nights !== 1 ? 's' : ''})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground">Dates <span className="text-red-500">*</span></label>
              <input
                className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-secondary text-foreground"
                value={form.dates}
                onChange={(e) => {
                  setForm({ ...form, dates: e.target.value })
                  // Recalculate amount when dates change
                  const dates = e.target.value.split(" - ")
                  if (dates.length >= 2 && selectedRoomId) {
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
                      const newNights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
                      const selectedRoom = rooms.find(r => r.id === selectedRoomId)
                      if (selectedRoom) {
                        const calculatedAmount = selectedRoom.price * newNights
                        setForm(prev => ({ ...prev, amount: calculatedAmount }))
                      }
                    }
                  }
                }}
                placeholder="DD/MM/YYYY - DD/MM/YYYY"
                required
              />
              {form.dates && nights > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {nights} night{nights !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground">
                Check-in Time
              </label>
              <TimePicker
                value={checkInTime}
                onChange={(time) => {
                  setCheckInTime(time)
                  // Auto-set checkout time if not already set
                  if (time && !checkOutTime) {
                    setCheckOutTime("11:00")
                  }
                }}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Set the check-in time for this booking</p>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground">
                Check-out Time
              </label>
              <TimePicker
                value={checkOutTime || "11:00"}
                onChange={(time) => {
                  setCheckOutTime(time)
                }}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Set the check-out time for this booking (default: 11:00 AM)</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">Cancel</Button>
            <Button
              onClick={() => {
                // Include times in the saved booking
                const updatedBooking = {
                  ...form,
                  checkInTime: checkInTime || null,
                  checkOutTime: checkOutTime || null,
                }
                onSave(updatedBooking as Booking)
                onClose()
              }}
              className="flex-1 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}


