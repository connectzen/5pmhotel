"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Venue } from "@/lib/admin-store"
import { Edit, Trash2 } from "lucide-react"

interface VenuesTableProps {
  venues: Venue[]
  onEdit: (venue: Venue) => void
  onDelete: (venueId: string) => void
}

export function VenuesTable({ venues, onEdit, onDelete }: VenuesTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Venue Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Capacity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Base Price (KES)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Images</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {venues.map((venue) => (
              <tr key={venue.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{venue.name}</td>
                <td className="px-6 py-4 text-sm text-foreground">{venue.capacity} guests</td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">{venue.price.toLocaleString()}</td>
                <td className="px-6 py-4">
                  {venue.images && venue.images.length > 0 ? (
                    <div className="flex gap-1">
                      {venue.images.slice(0, 3).map((img, idx) => (
                        <img key={idx} src={img} alt={`${venue.name} ${idx + 1}`} className="w-12 h-12 object-cover rounded border border-border" />
                      ))}
                      {venue.images.length > 3 && (
                        <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{venue.images.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No images</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={venue.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {venue.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(venue)} className="gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(venue.id)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
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
