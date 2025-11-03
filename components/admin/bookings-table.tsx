"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Booking } from "@/lib/admin-store"
import { Eye, CheckCircle, LogIn, LogOut, Trash2, Pencil, AlertTriangle, Phone, MoreVertical } from "lucide-react"
import { parseISO, isValid } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BookingsTableProps {
  bookings: Booking[]
  onSelectBooking: (booking: Booking) => void
  onStatusChange: (
    bookingId: string,
    newStatus: "pending" | "approved" | "rejected" | "checked-in" | "checked-out" | "cancelled",
  ) => void
  onEdit: (booking: Booking) => void
  onDelete: (bookingId: string) => void
}

export function BookingsTable({ bookings, onSelectBooking, onStatusChange, onEdit, onDelete }: BookingsTableProps) {
  // Real-time clock for monitoring expiration
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every 5 seconds for real-time monitoring of expired bookings
    // This ensures expired bookings are detected quickly
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 5000) // Update every 5 seconds for faster detection

    // Also update immediately on mount to check current status
    setCurrentTime(new Date())

    return () => clearInterval(interval)
  }, [])

  // Force re-render when bookings change to ensure expiration is recalculated
  useEffect(() => {
    setCurrentTime(new Date())
  }, [bookings])
  const getStatusColor = (status: string, isExpired: boolean = false) => {
    // If checked-in and expired, show red instead of blue
    if (status === "checked-in" && isExpired) {
      return "bg-red-600 text-white dark:bg-red-700 dark:text-white"
    }
    
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "checked-in":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "checked-out":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const isBookingExpired = (booking: Booking) => {
    // Only check expiration for checked-in bookings
    if (booking.status !== "checked-in") return { expired: false, elapsed: null }
    
    // Use currentTime state instead of new Date() to trigger re-renders
    const now = new Date(currentTime.getTime()) // Create new Date instance to avoid mutability issues
    let checkoutDateTime: Date | null = null

    // Try to get checkout time (HH:MM format) - check multiple possible field names
    // IMPORTANT: checkOutTime field is the primary field name used in the system
    const checkoutTime = (booking as any).checkOutTime || (booking as any).checkoutTime || (booking as any).checkOut || null
    const checkoutDateStr = (booking as any).checkOutDate || (booking as any).checkOut || (booking as any).checkoutDate || null
    
    // DEBUG: Log ALL booking fields to see what we actually have
    console.log('[EXPIRATION DEBUG]', {
      bookingId: booking.id,
      customer: booking.customer,
      status: booking.status,
      dates: booking.dates,
      ALL_FIELDS: booking,
      checkOutTime: checkoutTime,
      checkOutDateStr: checkoutDateStr,
      now: now.toISOString(),
    })

    // Parse checkout date
    let checkoutDate: Date | null = null
    
    // First, try to parse from checkoutDateStr if available
    if (checkoutDateStr) {
      // Try ISO format first (YYYY-MM-DD) but parse as LOCAL date to avoid UTC shift
      if (checkoutDateStr.includes('-') && checkoutDateStr.length === 10) {
        const [y, m, d] = checkoutDateStr.split('-').map((v) => parseInt(v, 10))
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          checkoutDate = new Date(y, m - 1, d)
        }
      } else {
        checkoutDate = new Date(checkoutDateStr)
        if (isNaN(checkoutDate.getTime())) checkoutDate = null
      }
    }

    // If not found, try parsing from dates field (DD/MM/YYYY format) - this is the main format used
    if (!checkoutDate && booking.dates) {
      const dates = (booking.dates || "").split(" - ")
      if (dates.length >= 2) {
        const checkoutStr = dates[1].trim()
        // Parse DD/MM/YYYY format (e.g., "03/11/2025")
        const parts = checkoutStr.split("/")
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10)
          const year = parseInt(parts[2], 10)
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && month > 0 && month <= 12 && year > 2000) {
            checkoutDate = new Date(year, month - 1, day)
            // Validate the date was created correctly
            if (isNaN(checkoutDate.getTime()) || checkoutDate.getFullYear() !== year) {
              checkoutDate = null
            }
          }
        }
        
        // If DD/MM/YYYY parsing failed, try ISO format
        if (!checkoutDate) {
          checkoutDate = parseISO(checkoutStr)
          if (!isValid(checkoutDate)) checkoutDate = null
        }
      }
    }

    if (!checkoutDate) return { expired: false, elapsed: null }

    // Parse checkout time (HH:MM format) if available
    // Check multiple places: booking.checkOutTime, or extract from dates display
    let timeToUse = checkoutTime
    
    // If no explicit checkoutTime field, try to extract from dates display format
    if (!timeToUse && booking.dates) {
      // Look for time pattern in the dates string (e.g., "03/11/2025 07:00")
      const timeMatch = booking.dates.match(/(\d{1,2}):(\d{2})/)
      if (timeMatch) {
        timeToUse = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
      }
    }
    
    // Also check if checkout time is displayed in the booking object's dates section
    if (!timeToUse && (booking as any).datesDisplay) {
      const timeMatch = (booking as any).datesDisplay.match(/(\d{1,2}):(\d{2})/)
      if (timeMatch) {
        timeToUse = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
      }
    }

    // Parse the time
    if (timeToUse && typeof timeToUse === 'string' && timeToUse.includes(':')) {
      const timeParts = timeToUse.split(':')
      const hours = parseInt(timeParts[0], 10)
      const minutes = parseInt(timeParts[1] || '0', 10)
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        checkoutDateTime = new Date(checkoutDate)
        checkoutDateTime.setHours(hours, minutes, 0, 0)
      }
    }

    // If no checkout time specified, default to 11:00 AM
    if (!checkoutDateTime) {
      checkoutDateTime = new Date(checkoutDate)
      checkoutDateTime.setHours(11, 0, 0, 0)
    }

    // Compare dates properly
    const expired = now.getTime() > checkoutDateTime.getTime()
    const elapsed = expired ? Math.floor((now.getTime() - checkoutDateTime.getTime()) / (1000 * 60)) : null // in minutes

    // DEBUG: Always log the result
    console.log('[EXPIRATION RESULT]', {
      bookingId: booking.id,
      customer: booking.customer,
      expired,
      elapsed,
      now: now.toISOString(),
      nowLocal: now.toString(),
      checkoutDateTime: checkoutDateTime.toISOString(),
      checkoutDateTimeLocal: checkoutDateTime.toString(),
      timeDiffMs: now.getTime() - checkoutDateTime.getTime(),
      timeDiffMinutes: elapsed,
    })

    return { expired, elapsed }
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[180px]">Customer Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[120px]">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[130px]">Mobile Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[100px]">Room</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[180px]">Dates</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[100px]">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[100px]">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map((booking) => {
              const expiration = isBookingExpired(booking)
              const isExpired = expiration.expired
              
              // Additional check: if booking is checked-in but no checkOutTime, show warning
              const isCheckedInWithoutTime = booking.status === "checked-in" && !(booking as any).checkOutTime && !(booking as any).checkoutTime
              
              return (
              <tr 
                key={booking.id} 
                className={`hover:bg-muted/50 transition-colors ${
                  isExpired ? '!bg-red-50 dark:!bg-red-950/40 !border-l-4 !border-l-red-600' : ''
                } ${isCheckedInWithoutTime ? '!bg-yellow-50 dark:!bg-yellow-950/30 !border-l-4 !border-l-yellow-500' : ''}`}
              >
                <td className="px-4 py-4 text-sm font-medium text-foreground">
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-300 mr-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Overdue
                    </span>
                  )}
                  {isCheckedInWithoutTime && !isExpired && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-700 dark:text-yellow-300 mr-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Missing Check-out Time
                    </span>
                  )}
                  {(booking as any).email || booking.id}
                </td>
                <td className="px-4 py-4 text-sm text-foreground">{booking.customer}</td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {(booking as any).phone ? (
                    <a 
                      href={`tel:${(booking as any).phone.replace(/\s|-/g, '')}`}
                      className="flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-3 h-3" />
                      {(booking as any).phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-foreground">{booking.room}</td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {booking.dates}
                  {booking.status === "checked-in" && (
                    <div className="mt-1 space-y-0.5">
                      {(booking as any).checkInTime && (
                        <div className="text-xs text-foreground">
                          <span className="font-medium">Check-in:</span> {(booking as any).checkInTime}
                        </div>
                      )}
                      {(() => {
                        const checkOut = (booking as any).checkOutTime || (booking as any).checkoutTime
                        if (checkOut) {
                          return (
                            <div className="text-xs text-foreground">
                              <span className="font-medium">Check-out:</span> {checkOut}
                            </div>
                          )
                        }
                        // For checked-in bookings without checkOutTime, show default time (11:00) with checkout date
                        if (booking.dates) {
                          const dates = booking.dates.split(" - ")
                          if (dates.length >= 2) {
                            return (
                              <div className="text-xs text-foreground">
                                <span className="font-medium">Check-out:</span> 11:00
                              </div>
                            )
                          }
                        }
                        // Fallback: show default time if no dates available
                        return (
                          <div className="text-xs text-foreground">
                            <span className="font-medium">Check-out:</span> 11:00
                          </div>
                        )
                      })()}
                      {isExpired && (
                        <div className="text-[11px] font-medium text-red-700 dark:text-red-300">
                          {`Expired ${expiration.elapsed !== null ? (expiration.elapsed >= 60 ? `${Math.floor(expiration.elapsed / 60)}h ${expiration.elapsed % 60}m` : `${expiration.elapsed}m`) : ''}`}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`capitalize ${getStatusColor(booking.status, expiration.expired)} ${expiration.expired ? '!ring-2 !ring-red-400 dark:!ring-red-500' : ''}`}>
                      {expiration.expired ? 'Expired • ' : ''}{booking.status}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-foreground">KES {booking.amount.toLocaleString()}</td>
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onSelectBooking(booking)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(booking)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {booking.status === "pending" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onStatusChange(booking.id, "approved")}
                            className="text-green-600 focus:text-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange(booking.id, "rejected")}
                            variant="destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {booking.status === "approved" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onStatusChange(booking.id, "checked-in")}
                            className="text-blue-600 focus:text-blue-700"
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Check-in
                          </DropdownMenuItem>
                        </>
                      )}
                      {booking.status === "checked-in" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onStatusChange(booking.id, "checked-out")}
                            className="text-orange-600 focus:text-orange-700"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Check-out
                          </DropdownMenuItem>
                        </>
                      )}
                      {(booking.status === "rejected" || booking.status === "cancelled") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onStatusChange(booking.id, "approved")}
                            className="text-green-600 focus:text-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Re-approve
                          </DropdownMenuItem>
                        </>
                      )}
                      {booking.status !== "cancelled" && booking.status !== "rejected" && booking.status !== "checked-out" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onStatusChange(booking.id, "cancelled")}
                            variant="destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                        </>
                      )}
                      {(booking.status === "rejected" || booking.status === "checked-out" || booking.status === "cancelled") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(booking.id)}
                            variant="destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
