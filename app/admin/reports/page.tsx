"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { OccupancyReportChart } from "@/components/admin/occupancy-report-chart"
import { RoomDistributionChart } from "@/components/admin/room-distribution-chart"
import { RevenueReportChart } from "@/components/admin/revenue-report-chart"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"weekly" | "monthly">("monthly")
  const [timeRange, setTimeRange] = useState<"6months" | "year">("6months")
  const [bookings, setBookings] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => {
      unsubBookings()
      unsubRooms()
      unsubPayments()
    }
  }, [])

  // Calculate statistics from Firebase data
  const stats = useMemo(() => {
    // Calculate average occupancy
    const totalRooms = rooms.reduce((sum: number, r: any) => sum + (Number(r.quantity ?? 0) || 0), 0)
    const bookedRooms = bookings.filter(
      (b: any) => b.status === "approved" || b.status === "checked-in"
    ).length
    const averageOccupancy = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0

    // Calculate total revenue from completed payments
    const totalRevenue = payments
      .filter((p: any) => p.status === "completed")
      .reduce((sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0), 0)

    // Total bookings count
    const totalBookings = bookings.length

    return {
      averageOccupancy,
      totalRevenue,
      totalBookings,
    }
  }, [bookings, rooms, payments])

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Generate occupancy and revenue reports</p>
        </div>
        <div className="flex gap-2">
          {(["weekly", "monthly"] as const).map((type) => (
            <Button
              key={type}
              variant={reportType === type ? "default" : "outline"}
              onClick={() => setReportType(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
          {reportType === "monthly" && (
            <div className="flex gap-1 ml-2 border-l pl-2 border-border">
              <Button
                variant={timeRange === "6months" ? "default" : "outline"}
                onClick={() => setTimeRange("6months")}
                size="sm"
                className="text-xs"
              >
                6 Months
              </Button>
              <Button
                variant={timeRange === "year" ? "default" : "outline"}
                onClick={() => setTimeRange("year")}
                size="sm"
                className="text-xs"
              >
                Last Year
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Average Occupancy</p>
          <p className="text-3xl font-bold text-foreground">{stats.averageOccupancy}%</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-accent">KES {stats.totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Bookings</p>
          <p className="text-3xl font-bold text-foreground">{stats.totalBookings}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Occupancy Trend</h2>
          <OccupancyReportChart bookings={bookings} rooms={rooms} reportType={reportType} timeRange={timeRange} />
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Room Type Distribution</h2>
          <RoomDistributionChart rooms={rooms} bookings={bookings} />
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Revenue Trend</h2>
        <RevenueReportChart payments={payments} reportType={reportType} timeRange={timeRange} />
      </Card>
      </div>
    </div>
  )
}
