"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface RevenueReportChartProps {
  payments?: Array<{ amount?: number; status?: string; date?: string; createdAt?: any }>
  reportType?: "weekly" | "monthly"
  timeRange?: "6months" | "year"
}

export function RevenueReportChart({ payments = [], reportType = "monthly", timeRange = "6months" }: RevenueReportChartProps) {
  // Get completed payments only
  const completedPayments = payments.filter((p: any) => p.status === "completed")
  
  // Group revenue by time period
  const getRevenueByPeriod = () => {
    const now = new Date()
    const periods: Record<string, number> = {}
    
    if (reportType === "monthly") {
      // Dynamic: Last 6 months or last 12 months (year) including current month
      const monthsToShow = timeRange === "year" ? 12 : 6
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: timeRange === "year" ? "2-digit" : undefined })
        periods[monthKey] = 0
      }
      
      completedPayments.forEach((payment: any) => {
        let paymentDate: Date
        if (payment.createdAt?.toDate) {
          paymentDate = payment.createdAt.toDate()
        } else if (payment.date) {
          paymentDate = new Date(payment.date)
        } else {
          // If no date, use current date
          paymentDate = now
        }
        
        const monthsToShow = timeRange === "year" ? 12 : 6
        const monthKey = paymentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          year: timeRange === "year" ? "2-digit" : undefined 
        })
        const paymentMonth = paymentDate.getMonth()
        const paymentYear = paymentDate.getFullYear()
        
        // Check if payment is in the selected time range
        const monthsToCheck: string[] = []
        for (let i = monthsToShow - 1; i >= 0; i--) {
          const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const checkKey = checkDate.toLocaleDateString('en-US', { 
            month: 'short', 
            year: timeRange === "year" ? "2-digit" : undefined 
          })
          monthsToCheck.push(checkKey)
        }
        
        if (monthsToCheck.includes(monthKey)) {
          periods[monthKey] += Number(payment.amount || 0)
        }
      })
    } else {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - (i * 7))
        const weekKey = `Week ${4 - i}`
        periods[weekKey] = 0
      }
      
      completedPayments.forEach((payment: any) => {
        let paymentDate: Date
        if (payment.createdAt?.toDate) {
          paymentDate = payment.createdAt.toDate()
        } else if (payment.date) {
          paymentDate = new Date(payment.date)
        } else {
          return
        }
        
        const weeksAgo = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
        if (weeksAgo >= 0 && weeksAgo <= 3) {
          const weekKey = `Week ${4 - weeksAgo}`
          if (periods.hasOwnProperty(weekKey)) {
            periods[weekKey] += Number(payment.amount || 0)
          }
        }
      })
    }
    
    return Object.entries(periods).map(([period, revenue]) => ({
      period,
      revenue: Math.round(revenue),
    }))
  }

  const data = getRevenueByPeriod()

  if (data.length === 0 || data.every(d => d.revenue === 0)) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No revenue data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="period" stroke="var(--color-muted-foreground)" />
        <YAxis stroke="var(--color-muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            color: "var(--color-foreground)",
          }}
          formatter={(value: number) => [`KSh ${value.toLocaleString()}`, "Revenue"]}
          labelFormatter={(label) => `Period: ${label}`}
        />
        <Legend />
        <Bar dataKey="revenue" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
