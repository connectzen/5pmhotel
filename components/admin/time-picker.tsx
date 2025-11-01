"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"

interface TimePickerProps {
  value: string // Format: "HH:MM"
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className = "" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, setHours] = useState(11)
  const [minutes, setMinutes] = useState(0)
  const pickerRef = useRef<HTMLDivElement>(null)
  const hoursRef = useRef<HTMLDivElement>(null)
  const minutesRef = useRef<HTMLDivElement>(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").map(Number)
      if (!isNaN(h) && h >= 0 && h <= 23) setHours(h)
      if (!isNaN(m) && m >= 0 && m <= 59) setMinutes(m)
    }
  }, [value])

  // Generate hour and minute options
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

  // Handle scroll to selected value
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hoursElement = hoursRef.current?.querySelector(`[data-hour="${hours}"]`)
        const minutesElement = minutesRef.current?.querySelector(`[data-minute="${minutes}"]`)
        hoursElement?.scrollIntoView({ block: "center", behavior: "smooth" })
        minutesElement?.scrollIntoView({ block: "center", behavior: "smooth" })
      }, 100)
    }
  }, [isOpen, hours, minutes])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleHourChange = (hour: number) => {
    setHours(hour)
    const newTime = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
    onChange(newTime)
    // Keep picker open so user can adjust minutes too
  }

  const handleMinuteChange = (minute: number) => {
    setMinutes(minute)
    const newTime = `${hours.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    onChange(newTime)
    // Keep picker open - user can click outside to close
  }

  const formatTime = (h: number, m: number) => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* Input Display (non-editable, clickable, no keyboard interaction) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground cursor-pointer flex items-center justify-between focus:outline-none"
        role="button"
        aria-label="Select time"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <span>{formatTime(hours, minutes)}</span>
        <svg
          className="w-5 h-5 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Time Picker Pop-up */}
      {isOpen && (
        <Card className="absolute bottom-full mb-2 left-0 z-50 w-64 p-4 bg-white shadow-lg max-h-[300px]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex gap-4">
            {/* Hours Column */}
            <div className="flex-1">
              <div className="text-xs font-medium text-center mb-2 text-muted-foreground">Hours</div>
              <div
                ref={hoursRef}
                className="h-40 overflow-y-auto scroll-smooth border border-border rounded-lg"
                style={{ scrollbarWidth: "thin" }}
              >
                {hourOptions.map((hour) => (
                  <div
                    key={hour}
                    data-hour={hour}
                    onClick={() => handleHourChange(hour)}
                    className={`px-4 py-2 text-center cursor-pointer transition-colors ${
                      hours === hour
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {hour.toString().padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex-1">
              <div className="text-xs font-medium text-center mb-2 text-muted-foreground">Minutes</div>
              <div
                ref={minutesRef}
                className="h-40 overflow-y-auto scroll-smooth border border-border rounded-lg"
                style={{ scrollbarWidth: "thin" }}
              >
                {minuteOptions.map((minute) => (
                  <div
                    key={minute}
                    data-minute={minute}
                    onClick={() => handleMinuteChange(minute)}
                    className={`px-4 py-2 text-center cursor-pointer transition-colors ${
                      minutes === minute
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {minute.toString().padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

