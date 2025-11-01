"use client"

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts"

const COLORS = ["var(--color-accent)", "var(--color-chart-2)", "var(--color-chart-3)", "#FF8042", "#00C49F", "#FFBB28", "#FF6B6B"]

interface RoomDistributionChartProps {
  rooms?: Array<{ name: string; quantity?: number; bookedCount?: number }>
  bookings?: Array<{ room: string; status: string }>
}

export function RoomDistributionChart({ rooms = [], bookings = [] }: RoomDistributionChartProps) {
  // Calculate distribution based on bookings count per room (not percentage, use actual booking count)
  const data = rooms.map((room) => {
    const bookedCount = bookings.filter(
      (b: any) => b.room === room.name && (b.status === "approved" || b.status === "checked-in")
    ).length
    const totalRooms = room.quantity || 1
    return {
      name: room.name,
      value: bookedCount, // Use booking count instead of percentage
      bookings: bookedCount,
      total: totalRooms,
      percentage: totalRooms > 0 ? Math.round((bookedCount / totalRooms) * 100) : 0,
    }
  }).filter(item => item.total > 0 && item.value > 0) // Only show rooms with bookings

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No room booking data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            color: "var(--color-foreground)",
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value} bookings (${props.payload.percentage}% occupancy, ${props.payload.bookings}/${props.payload.total} rooms)`,
            props.payload.name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
