"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Booking } from "@/lib/admin-store"
import { Eye, CheckCircle, LogIn, LogOut, Trash2, Pencil, AlertTriangle } from "lucide-react"
import { parseISO, isValid } from "date-fns"

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
    if (booking.status !== "checked-in") return false
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
    
    // Try to get checkout date from various possible fields
    let checkoutDate: Date | null = null
    
    const checkOut = (booking as any).checkOutDate || (booking as any).checkOut || (booking as any).checkoutDate
    if (checkOut) {
      checkoutDate = new Date(checkOut)
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
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
              day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
            checkoutDate = new Date(year, month - 1, day, 12, 0, 0, 0)
            if (isNaN(checkoutDate.getTime())) checkoutDate = null
          }
        } else {
          checkoutDate = new Date(checkoutStr)
          if (isNaN(checkoutDate.getTime())) {
            checkoutDate = null
          } else {
            checkoutDate.setHours(12, 0, 0, 0)
          }
        }
      }
    }
    
    if (!checkoutDate) return false
    
    checkoutDate.setHours(12, 0, 0, 0)
    return checkoutDate < today
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Customer Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Room</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Dates</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{(booking as any).email || booking.id}</td>
                <td className="px-6 py-4 text-sm text-foreground">{booking.customer}</td>
                <td className="px-6 py-4 text-sm text-foreground">{booking.room}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
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
                  {booking.status === "checked-in" && isBookingExpired(booking) && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-medium">Expired</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`capitalize ${getStatusColor(booking.status)}`}>{booking.status}</Badge>
                    {booking.status === "checked-in" && isBookingExpired(booking) && (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">KES {booking.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => onSelectBooking(booking)} className="gap-1">
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    {booking.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStatusChange(booking.id, "approved")}
                          className="gap-1 text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStatusChange(booking.id, "rejected")}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    {booking.status === "approved" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStatusChange(booking.id, "checked-in")}
                          className="gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <LogIn className="w-4 h-4" />
                          Check-in
                        </Button>
                      </>
                    )}
                    {booking.status === "checked-in" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(booking.id, "checked-out")}
                        className="gap-1 text-orange-600 hover:text-orange-700"
                      >
                        <LogOut className="w-4 h-4" />
                        Check-out
                      </Button>
                    )}
                    {booking.status === "rejected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(booking.id, "approved")}
                        className="gap-1 text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Re-approve
                      </Button>
                    )}
                    {booking.status === "cancelled" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(booking.id, "approved")}
                        className="gap-1 text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Reapprove
                      </Button>
                    )}
                    {booking.status !== "cancelled" && booking.status !== "rejected" && booking.status !== "checked-out" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStatusChange(booking.id, "cancelled")}
                        className="gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onEdit(booking)} className="gap-1">
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                    {(booking.status === "rejected" || booking.status === "checked-out" || booking.status === "cancelled") && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(booking.id)} className="gap-1 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
