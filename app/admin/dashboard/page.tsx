"use client"

import { useEffect, useMemo, useState } from "react"
import { mockKPIData, mockBookings, mockRooms } from "@/lib/admin-store"
import { KPICard } from "@/components/admin/kpi-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Plus, Users, DollarSign, Calendar, AlertCircle } from "lucide-react"
import { OccupancyReportChart } from "@/components/admin/occupancy-report-chart";
import { RoomDistributionChart } from "@/components/admin/room-distribution-chart";
import { RevenueReportChart } from "@/components/admin/revenue-report-chart";
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DashboardPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [kpis, setKpis] = useState(mockKPIData)
  const [timeRange, setTimeRange] = useState<"6months" | "year">("6months")

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
    const unsubEvents = onSnapshot(collection(db, "clientEvents"), (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => {
      unsubBookings()
      unsubRooms()
      unsubPayments()
      unsubEvents()
    }
  }, [])

  const roomsWithAvailability = useMemo(() => {
    return rooms.map((room: any) => {
      const bookedCount = bookings.filter(
        (b: any) => b.room === room.name && (b.status === "approved" || b.status === "checked-in"),
      ).length
      const availableCount = (room.quantity ?? 0) - bookedCount
      const occupancyPercent = (room.quantity ?? 0) > 0 ? Math.round((bookedCount / room.quantity) * 100) : 0
      return { ...room, bookedCount, availableCount, occupancyPercent }
    })
  }, [rooms, bookings])

  useEffect(() => {
    const checkedIn = bookings.filter((b: any) => b.status === "checked-in").length
    const checkedOut = bookings.filter((b: any) => b.status === "checked-out").length
    // Calculate today's revenue from completed payments made today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayRevenue = payments
      .filter((p: any) => {
        if (p.status !== "completed") return false
        const paymentDate = p.createdAt?.toDate ? p.createdAt.toDate() : (p.date ? new Date(p.date) : null)
        if (!paymentDate) return false
        paymentDate.setHours(0, 0, 0, 0)
        return paymentDate.getTime() === today.getTime()
      })
      .reduce((sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0), 0)
    // Calculate monthly revenue from completed payments in current month
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyRevenue = payments
      .filter((p: any) => {
        if (p.status !== "completed") return false
        const paymentDate = p.createdAt?.toDate ? p.createdAt.toDate() : (p.date ? new Date(p.date) : null)
        if (!paymentDate) return false
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
      })
      .reduce((sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0), 0)
    // Calculate total revenue from completed payments
    const revenue = payments
      .filter((p: any) => p.status === "completed")
      .reduce((sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0), 0)
    const totalRooms = rooms.reduce((sum: number, r: any) => sum + (Number(r.quantity ?? 0) || 0), 0)
    const occupied = roomsWithAvailability.reduce((sum: number, r: any) => sum + r.bookedCount, 0)
    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0
    const pendingBookingsCount = bookings.filter((b: any) => b.status === "pending").length
    const pendingEventsCount = events.filter((e: any) => e.status === "pending").length
    setKpis({ 
      todayCheckIns: checkedIn, 
      todayCheckOuts: checkedOut, 
      occupancyRate, 
      revenueThisMonth: revenue,
      todayRevenue,
      monthlyRevenue,
      pendingBookings: pendingBookingsCount,
      pendingEvents: pendingEventsCount,
      totalBookings: bookings.length
    })
  }, [bookings, rooms, roomsWithAvailability, payments, events])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to 5PM Hotel Admin</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/bookings">
            <Button className="bg-accent text-accent-foreground hover:opacity-90">View Bookings</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Today's Check-ins" value={kpis.todayCheckIns} icon="CheckIn" trend="" />
        <KPICard title="Today's Check-outs" value={kpis.todayCheckOuts} icon="CheckOut" trend="" />
        <KPICard title="Today's Revenue" value={`KSh ${(kpis as any).todayRevenue?.toLocaleString() || 0}`} icon="Revenue" trend="" />
        <KPICard title="Monthly Revenue" value={`KSh ${(kpis as any).monthlyRevenue?.toLocaleString() || 0}`} icon="Revenue" trend="" />
      </div>

      {/* Pending Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/bookings">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground">Pending Bookings</h3>
                  {(kpis as any).pendingBookings > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                      {(kpis as any).pendingBookings > 99 ? "99+" : (kpis as any).pendingBookings}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-foreground">{(kpis as any).pendingBookings || 0}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg relative">
                <Calendar className="w-8 h-8 text-accent" />
                {(kpis as any).pendingBookings > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-card"></div>
                )}
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/admin/events">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-foreground">Pending Events</h3>
                  {(kpis as any).pendingEvents > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white">
                      {(kpis as any).pendingEvents > 99 ? "99+" : (kpis as any).pendingEvents}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-foreground">{(kpis as any).pendingEvents || 0}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg relative">
                <AlertCircle className="w-8 h-8 text-accent" />
                {(kpis as any).pendingEvents > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-card"></div>
                )}
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Link href="/admin/bookings">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground mb-2">View Bookings</h3>
                <p className="text-sm text-muted-foreground mb-2">Manage all room and venue bookings</p>
                <p className="text-2xl font-bold text-foreground">{(kpis as any).totalBookings || bookings.length}</p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* --- Report Summary Section (copied from reports page) --- */}
      <div className="pt-8 space-y-6">
        {/* Summary Stats (live) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Average Occupancy</p>
            <p className="text-3xl font-bold text-foreground">{kpis.occupancyRate}%</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-accent">KSh {kpis.revenueThisMonth.toLocaleString()}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Bookings</p>
            <p className="text-3xl font-bold text-foreground">{bookings.length}</p>
          </Card>
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Occupancy Trend</h2>
              <div className="flex gap-1">
                <Button
                  variant={timeRange === "6months" ? "default" : "outline"}
                  onClick={() => setTimeRange("6months")}
                  size="sm"
                  className="text-xs h-7"
                >
                  6M
                </Button>
                <Button
                  variant={timeRange === "year" ? "default" : "outline"}
                  onClick={() => setTimeRange("year")}
                  size="sm"
                  className="text-xs h-7"
                >
                  Year
                </Button>
              </div>
            </div>
            <OccupancyReportChart bookings={bookings} rooms={rooms} reportType="monthly" timeRange={timeRange} />
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Room Type Distribution</h2>
            <RoomDistributionChart rooms={roomsWithAvailability} bookings={bookings} />
          </Card>
        </div>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Revenue Trend</h2>
            <div className="flex gap-1">
              <Button
                variant={timeRange === "6months" ? "default" : "outline"}
                onClick={() => setTimeRange("6months")}
                size="sm"
                className="text-xs h-7"
              >
                6M
              </Button>
              <Button
                variant={timeRange === "year" ? "default" : "outline"}
                onClick={() => setTimeRange("year")}
                size="sm"
                className="text-xs h-7"
              >
                Year
              </Button>
            </div>
          </div>
          <RevenueReportChart payments={payments} reportType="monthly" timeRange={timeRange} />
        </Card>
      </div>
    </div>
  )
}
