"use client"

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "checked-in":
        return "bg-blue-100 text-blue-800"
      case "checked-out":
        return "bg-purple-100 text-purple-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isBookingExpired = (booking: Booking) => {
    if (booking.status !== "checked-in") return { expired: false, elapsed: null }
    
    const now = new Date()
    let checkoutDateTime: Date | null = null

    // Try to get checkout time (HH:MM format)
    const checkoutTime = (booking as any).checkOutTime || (booking as any).checkoutTime
    const checkoutDateStr = (booking as any).checkOutDate || (booking as any).checkOut || (booking as any).checkoutDate

    // Parse checkout date
    let checkoutDate: Date | null = null
    if (checkoutDateStr) {
      checkoutDate = new Date(checkoutDateStr)
      if (isNaN(checkoutDate.getTime())) checkoutDate = null
    }

    // If not found, try parsing from dates field
    if (!checkoutDate && booking.dates) {
      const dates = (booking.dates || "").split(" - ")
      if (dates.length >= 2) {
        const checkoutStr = dates[1].trim()
        const parts = checkoutStr.split("/")
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10)
          const year = parseInt(parts[2], 10)
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            checkoutDate = new Date(year, month - 1, day)
          }
        } else {
          checkoutDate = new Date(checkoutStr)
        }
        if (isNaN(checkoutDate.getTime())) checkoutDate = null
      }
    }

    if (!checkoutDate) return { expired: false, elapsed: null }

    // Parse checkout time (HH:MM format) if available
    if (checkoutTime && typeof checkoutTime === 'string' && checkoutTime.includes(':')) {
      const [hours, minutes] = checkoutTime.split(':').map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        checkoutDateTime = new Date(checkoutDate)
        checkoutDateTime.setHours(hours, minutes, 0, 0)
      }
    }

    // If no checkout time specified, default to 11:00 AM
    if (!checkoutDateTime) {
      checkoutDateTime = new Date(checkoutDate)
      checkoutDateTime.setHours(11, 0, 0, 0)
    }

    const expired = now > checkoutDateTime
    const elapsed = expired ? Math.floor((now.getTime() - checkoutDateTime.getTime()) / (1000 * 60)) : null // in minutes

    return { expired, elapsed }
  }

  return (
    <Card className="overflow-hidden">
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
              return (
              <tr 
                key={booking.id} 
                className={`hover:bg-muted/50 transition-colors ${
                  isExpired ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                }`}
              >
                <td className="px-4 py-4 text-sm font-medium text-foreground">{(booking as any).email || booking.id}</td>
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
                        // Try to extract checkout time from dates if available
                        if (booking.dates) {
                          const dates = booking.dates.split(" - ")
                          if (dates.length >= 2) {
                            return (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Check-out:</span> {dates[1].trim()} (expected)
                              </div>
                            )
                          }
                        }
                        return null
                      })()}
                    </div>
                  )}
                  {booking.status === "checked-in" && expiration.expired && (
                    <div className="mt-1 flex items-center gap-1 text-xs bg-red-100 px-2 py-1 rounded border border-red-300 w-fit">
                      <AlertTriangle className="w-3 h-3 text-red-600 animate-pulse" />
                      <span className="font-bold text-red-700">
                        EXPIRED
                        {expiration.elapsed !== null && (
                          <span className="ml-1">
                            ({expiration.elapsed >= 60 
                              ? `${Math.floor(expiration.elapsed / 60)}h ${expiration.elapsed % 60}m`
                              : `${expiration.elapsed}m`
                            } ago)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`capitalize ${getStatusColor(booking.status)}`}>{booking.status}</Badge>
                    {booking.status === "checked-in" && expiration.expired && (
                      <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                    )}
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
