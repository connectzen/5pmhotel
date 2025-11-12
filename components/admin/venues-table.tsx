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
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Max Capacity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Capacity by Layout</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Packages</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Images</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {venues.map((venue) => (
              <tr key={venue.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{venue.name}</td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {Math.max(
                    Number(venue.capacities?.theatre || 0),
                    Number(venue.capacities?.classroom || 0),
                    Number(venue.capacities?.uShape || 0),
                    Number(venue.capacities?.boardroom || 0),
                    Number(venue.capacity || 0)
                  )}{" "}
                  guests
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {(() => {
                    const layoutEntries = [
                      { key: "theatre", label: "Theatre", value: venue.capacities?.theatre },
                      { key: "classroom", label: "Classroom", value: venue.capacities?.classroom },
                      { key: "uShape", label: "U-Shape", value: venue.capacities?.uShape },
                      { key: "boardroom", label: "Boardroom", value: venue.capacities?.boardroom },
                    ].filter((layout) => typeof layout.value === "number" && Number(layout.value) > 0)

                    if (layoutEntries.length === 0) {
                      return <span className="text-xs text-muted-foreground block">Not provided</span>
                    }

                    return (
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {layoutEntries.map((layout) => (
                          <div key={layout.key} className="flex items-center justify-between rounded-md bg-background/40 border border-border/40 px-2 py-1">
                            <span className="font-medium text-foreground">{layout.label}</span>
                            <span>{layout.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  {venue.packages && venue.packages.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {venue.packages.slice(0, 3).map((p) => (
                        <span key={p.id} className="text-xs px-2 py-1 rounded-full border border-border bg-background">
                          {p.name}{typeof p.price === "number" ? ` • KES ${p.price}` : ""}{p.durationHours ? ` • ${p.durationHours}h` : ""}
                        </span>
                      ))}
                      {venue.packages.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-full border border-dashed border-border bg-background/60">
                          +{venue.packages.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No packages</span>
                  )}
                </td>
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
