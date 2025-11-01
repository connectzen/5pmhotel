"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Booking } from "@/lib/admin-store"
import { X } from "lucide-react"

interface BookingDetailModalProps {
  booking: Booking
  onClose: () => void
  onStatusChange?: (
    bookingId: string,
    newStatus: "pending" | "approved" | "rejected" | "checked-in" | "checked-out" | "cancelled",
  ) => void
  onApprove?: () => void
}

export function BookingDetailModal({ booking, onClose, onStatusChange, onApprove }: BookingDetailModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Booking Details</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-medium text-foreground">{booking.id}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Customer Name</p>
              <p className="font-medium text-foreground">{booking.customer}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Room Type</p>
              <p className="font-medium text-foreground">{booking.room}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Check-in / Check-out</p>
              <p className="font-medium text-foreground">{booking.dates}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={`capitalize ${getStatusColor(booking.status)}`}>{booking.status}</Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-medium text-foreground">KES {booking.amount.toLocaleString()}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <Badge className="bg-green-100 text-green-800">Completed</Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground">Standard booking with no special requests</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Close
            </Button>
            {booking.status === "pending" && (
              <>
                {onApprove ? (
                  <Button
                    onClick={() => {
                      onClose()
                      onApprove()
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                ) : onStatusChange ? (
                  <Button
                    onClick={() => {
                      onStatusChange(booking.id, "approved")
                      onClose()
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                ) : null}
                {onStatusChange && (
                  <Button
                    onClick={() => {
                      onStatusChange(booking.id, "rejected")
                      onClose()
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    Reject
                  </Button>
                )}
              </>
            )}
            {booking.status === "approved" && onStatusChange && (
              <Button
                onClick={() => {
                  onStatusChange(booking.id, "checked-in")
                  onClose()
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Check-in
              </Button>
            )}
            {booking.status === "checked-in" && onStatusChange && (
              <Button
                onClick={() => {
                  onStatusChange(booking.id, "checked-out")
                  onClose()
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Check-out
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
