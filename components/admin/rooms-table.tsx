"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Room } from "@/lib/admin-store"
import { Edit, Trash2 } from "lucide-react"

interface RoomsTableProps {
  rooms: Room[]
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Image</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Room Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Capacity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Price (KES)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amenities</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rooms.map((room, idx) => (
              <tr key={(room.id || room.name || "room") + "-" + idx} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-12 h-12 rounded overflow-hidden bg-muted">
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
                <td className="px-6 py-4 text-sm font-medium text-foreground">{room.name}</td>
                <td className="px-6 py-4 text-sm text-foreground">{room.capacity} guests</td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">{(room.price ?? 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {(room.amenities || []).map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={(room.status ?? "active") === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {room.status ?? "active"}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button disabled={busyId === room.id} variant="ghost" size="sm" onClick={() => onEdit(room)} className="gap-1">
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
                      className="gap-1 text-red-600 hover:text-red-700"
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
