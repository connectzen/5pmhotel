"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Room } from "@/lib/admin-store"
import { Edit, Trash2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface RoomWithAvailability extends Room {
  availableCount?: number
  bookedCount?: number
  isAvailable?: boolean
  isOutOfStock?: boolean
}

interface RoomsTableProps {
  rooms: RoomWithAvailability[]
  onEdit: (room: Room) => void
  onDelete: (roomId: string) => void
  busyId?: string
}

export function RoomsTable({ rooms, onEdit, onDelete, busyId }: RoomsTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Image</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Room Type</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Capacity</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Quantity</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Availability</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">
                Bed Only (KES)
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Amenities</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Status</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rooms.map((room, idx) => (
              <tr 
                key={(room.id || room.name || "room") + "-" + idx} 
                className={`hover:bg-muted/50 transition-colors ${
                  room.isOutOfStock ? "opacity-75" : ""
                }`}
              >
                <td className="px-3 sm:px-6 py-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden bg-muted">
                    {Boolean((room as any).image || (room.images && room.images[0])) ? (
                      <img
                        src={(room as any).image || room.images![0]}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-foreground">{room.name}</td>
                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-foreground">{room.capacity} guests</td>
                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <span>{room.quantity ?? 0}</span>
                    {room.bookedCount !== undefined && room.bookedCount > 0 && (
                      <span className="text-xs text-muted-foreground">({room.bookedCount} booked)</span>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4">
                  {room.isOutOfStock ? (
                    <Badge className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1 w-fit text-xs">
                      <XCircle className="w-3 h-3" />
                      <span className="hidden sm:inline">None Available</span>
                      <span className="sm:hidden">None</span>
                    </Badge>
                  ) : room.isAvailable ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 w-fit text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="hidden sm:inline">{room.availableCount ?? 0} Available</span>
                      <span className="sm:hidden">{room.availableCount ?? 0}</span>
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1 w-fit text-xs">
                      <AlertCircle className="w-3 h-3" />
                      <span className="hidden sm:inline">Low Stock</span>
                      <span className="sm:hidden">Low</span>
                    </Badge>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-4">
                  {(() => {
                    const ratePlans = (room as any).ratePlans
                    const bedOnly = ratePlans?.bedOnly
                    const bedOnlyPrice =
                      typeof bedOnly?.amount === "number" && bedOnly.amount > 0 ? bedOnly.amount : room.price ?? 0
                    const hasOtherPlans =
                      ratePlans &&
                      Object.keys(ratePlans).some((key) => key !== "bedOnly" && ratePlans[key]?.amount > 0)
                    return (
                      <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
                        <span className="font-medium text-foreground">
                          {bedOnlyPrice.toLocaleString()}
                        </span>
                        {hasOtherPlans && (
                          <span className="text-[11px] sm:text-xs text-muted-foreground">
                            Other plans available
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </td>
                <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">
                  <div className="flex flex-wrap gap-1">
                    {(room.amenities || []).slice(0, 3).map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {(room.amenities || []).length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(room.amenities || []).length - 3}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4">
                  <Badge
                    className={(room.status ?? "active") === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {room.status ?? "active"}
                  </Badge>
                </td>
                <td className="px-3 sm:px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busyId === room.id} variant="ghost" size="sm" onClick={() => onEdit(room)} className="gap-1 whitespace-nowrap">
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === room.id}
                      onClick={() => {
                        if (!room.id) return
                        onDelete(room.id)
                      }}
                      className="gap-1 text-red-600 hover:text-red-700 whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" />
                      {busyId === room.id ? "Deleting…" : "Delete"}
                    </Button>
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
