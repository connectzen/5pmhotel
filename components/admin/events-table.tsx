"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, Edit, Trash2, CheckCircle2, XCircle, RotateCcw, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClientEvent {
  id: string
  firestoreId?: string
  name: string
  venueId: string
  venueName: string
  date: string
  guests: number
  customerName: string
  customerEmail: string
  customerPhone?: string
  note?: string
  eventType?: string
  type?: string
  status: "pending" | "approved" | "rejected"
}

interface EventsTableProps {
  events: ClientEvent[]
  onApprove: (event: ClientEvent) => void
  onReject: (event: ClientEvent) => void
  onUnapprove: (event: ClientEvent) => void
  onEdit: (event: ClientEvent) => void
  onDelete: (event: ClientEvent) => void
  onApproveRejected: (event: ClientEvent) => void
  processingIds: Set<string>
}

export function EventsTable({
  events,
  onApprove,
  onReject,
  onUnapprove,
  onEdit,
  onDelete,
  onApproveRejected,
  processingIds,
}: EventsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  return (
    <Card>
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full min-w-[1000px] sm:min-w-[1200px] md:min-w-[1400px]">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[200px]">Event Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[150px]">Venue</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[120px]">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[100px]">Guests</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[180px]">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[150px]">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[100px]">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => {
              const isPending = event.status === "pending"
              const isApproved = event.status === "approved"
              const isRejected = event.status === "rejected"
              const isProcessing = processingIds.has(event.id)

              return (
                <tr key={event.firestoreId || event.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-4 text-sm font-medium text-foreground">
                    <div>
                      <div className="font-semibold">{event.name}</div>
                      {event.eventType && (
                        <div className="text-xs text-muted-foreground mt-1">{event.eventType}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">{event.venueName}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{event.date}</td>
                  <td className="px-4 py-4 text-sm text-foreground">{event.guests}</td>
                  <td className="px-4 py-4 text-sm text-foreground">
                    <div>
                      <div className="font-medium">{event.customerName}</div>
                      <div className="text-xs text-muted-foreground">{event.customerEmail}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">
                    {event.customerPhone ? (
                      <a
                        href={`tel:${event.customerPhone.replace(/\s|-/g, "")}`}
                        className="flex items-center gap-1 text-accent hover:text-accent/80 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3" />
                        {event.customerPhone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={`capitalize ${getStatusColor(event.status)}`}>{event.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isProcessing}>
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {isPending && (
                          <>
                            <DropdownMenuItem onClick={() => onApprove(event)} disabled={isProcessing}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReject(event)} disabled={isProcessing}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {isApproved && (
                          <>
                            <DropdownMenuItem onClick={() => onUnapprove(event)} disabled={isProcessing}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Unapprove
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {isRejected && (
                          <>
                            <DropdownMenuItem onClick={() => onApproveRejected(event)} disabled={isProcessing}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(event)} disabled={isProcessing} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => onEdit(event)} disabled={isProcessing}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {events.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">No events found.</div>
      )}
    </Card>
  )
}

