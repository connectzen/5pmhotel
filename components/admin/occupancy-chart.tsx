"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "Mon", occupancy: 65 },
  { date: "Tue", occupancy: 72 },
  { date: "Wed", occupancy: 78 },
  { date: "Thu", occupancy: 85 },
  { date: "Fri", occupancy: 92 },
  { date: "Sat", occupancy: 95 },
  { date: "Sun", occupancy: 87 },
]

export function OccupancyChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
        <YAxis stroke="var(--color-muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
          }}
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
