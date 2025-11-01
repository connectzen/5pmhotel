"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Payment } from "@/lib/admin-store"

interface PaymentsTableProps {
  payments: Payment[]
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMethodLabel = (method: string) => {
    if (method === "mpesa") return "M-Pesa"
    if (method === "cash") return "Cash"
    return "Card"
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Booking/Event ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Details</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount (KES)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Method</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((payment) => {
              const amount = payment.amount != null ? Number(payment.amount) : 0
              const formattedAmount = isNaN(amount) ? '-' : amount.toLocaleString()
              const paymentType = payment.type || 'booking'
              
              // Build details string based on payment type
              let details = ''
              if (paymentType === 'event') {
                const parts = []
                if (payment.eventName) parts.push(payment.eventName)
                if (payment.venueName) parts.push(`@ ${payment.venueName}`)
                if (payment.customerName) parts.push(`by ${payment.customerName}`)
                details = parts.join(' | ') || '-'
              } else if (paymentType === 'booking') {
                const parts = []
                if (payment.room) parts.push(payment.room)
                if (payment.customerName) parts.push(payment.customerName)
                details = parts.join(' | ') || '-'
              } else {
                details = payment.customerName || payment.venueName || '-'
              }
              
              return (
              <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{payment.bookingId || '-'}</td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <Badge variant="outline" className="capitalize">
                    {paymentType === 'event' ? 'Event' : paymentType === 'venue' ? 'Venue' : 'Booking'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate" title={details}>
                  {details}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">KES {formattedAmount}</td>
                <td className="px-6 py-4 text-sm text-foreground">{getMethodLabel(payment.method || 'card')}</td>
                <td className="px-6 py-4">
                  <Badge className={`capitalize ${getStatusColor(payment.status || 'pending')}`}>{payment.status || 'pending'}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{payment.date || '-'}</td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
