"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface OccupancyReportChartProps {
  bookings?: Array<{ checkIn?: string; status?: string; createdAt?: any }>
  rooms?: Array<{ quantity?: number }>
  reportType?: "weekly" | "monthly"
  timeRange?: "6months" | "year"
}

export function OccupancyReportChart({ bookings = [], rooms = [], reportType = "monthly", timeRange = "6months" }: OccupancyReportChartProps) {
  // Calculate occupancy by period
  const getOccupancyByPeriod = () => {
    const now = new Date()
    const totalRooms = rooms.reduce((sum: number, r: any) => sum + (Number(r.quantity ?? 0) || 0), 0)
    const periods: Array<{ period: string; occupancy: number }> = []
    
    if (reportType === "monthly") {
      // Dynamic: Last 6 months or last 12 months (year) including current month
      const monthsToShow = timeRange === "year" ? 12 : 6
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: timeRange === "year" ? "2-digit" : undefined 
        })
        
        // Count bookings for this month
        const monthBookings = bookings.filter((booking: any) => {
          let bookingDate: Date
          if (booking.createdAt?.toDate) {
            bookingDate = booking.createdAt.toDate()
          } else if (booking.checkIn) {
            bookingDate = new Date(booking.checkIn)
          } else {
            return false
          }
          
          return bookingDate.getMonth() === date.getMonth() && 
                 bookingDate.getFullYear() === date.getFullYear() &&
                 (booking.status === "approved" || booking.status === "checked-in")
        })
        
        const occupancy = totalRooms > 0 
          ? Math.round((monthBookings.length / totalRooms) * 100) 
          : 0
        periods.push({ period: monthKey, occupancy })
      }
    } else {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - (i * 7))
        const weekKey = `Week ${4 - i}`
        
        // Count bookings for this week
        const weekBookings = bookings.filter((booking: any) => {
          let bookingDate: Date
          if (booking.createdAt?.toDate) {
            bookingDate = booking.createdAt.toDate()
          } else if (booking.checkIn) {
            bookingDate = new Date(booking.checkIn)
          } else {
            return false
          }
          
          const weeksAgo = Math.floor((now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
          return weeksAgo === (3 - i) && (booking.status === "approved" || booking.status === "checked-in")
        })
        
        const occupancy = totalRooms > 0 
          ? Math.round((weekBookings.length / totalRooms) * 100) 
          : 0
        periods.push({ period: weekKey, occupancy })
      }
    }
    
    return periods
  }

  const data = getOccupancyByPeriod()

  if (data.length === 0 || rooms.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No occupancy data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="period" stroke="var(--color-muted-foreground)" />
        <YAxis stroke="var(--color-muted-foreground)" domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            color: "var(--color-foreground)",
          }}
          formatter={(value: number) => [`${value}%`, "Occupancy"]}
          labelFormatter={(label) => `Period: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="occupancy"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={{ fill: "var(--color-accent)", r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
