"use client"

import { useEffect, useMemo, useState } from "react"
import { mockKPIData, mockBookings, mockRooms } from "@/lib/admin-store"
import { KPICard } from "@/components/admin/kpi-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Plus, Users, DollarSign, Calendar, AlertCircle, Bed } from "lucide-react"
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
    <div className="p-6 space-y-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome back to 5PM Hotel Admin</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/bookings">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-all">
              View Bookings
            </Button>
          </Link>
        </div>
      </div>

      {/* Available Rooms Card - First Priority */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Link href="/admin/rooms?filter=available">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-l-primary bg-gradient-to-br from-card to-card/95 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2 text-lg group-hover:text-primary transition-colors">Available Rooms</h3>
                <p className="text-sm text-muted-foreground mb-4">Browse and manage all available room accommodations</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground group-hover:text-accent transition-colors">
                    {roomsWithAvailability.reduce((sum: number, r: any) => sum + (r.availableCount || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Rooms Available</p>
                </div>
              </div>
              <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-all">
                <Bed className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Pending Cards - Second Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/bookings?filter=pending">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer relative border-l-4 border-l-red-500/50 bg-gradient-to-br from-card to-card/95 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-foreground text-lg">Pending Room Bookings</h3>
                  {(kpis as any).pendingBookings > 0 && (
                    <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold bg-red-500 text-white shadow-md animate-pulse">
                      {(kpis as any).pendingBookings > 99 ? "99+" : (kpis as any).pendingBookings}
                    </span>
                  )}
                </div>
                <p className="text-4xl font-bold text-foreground group-hover:text-red-500 transition-colors">{(kpis as any).pendingBookings || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">Requires attention</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-xl relative group-hover:bg-red-500/20 transition-all shadow-sm">
                <Calendar className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                {(kpis as any).pendingBookings > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-card shadow-lg animate-ping"></div>
                )}
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/admin/events?view=created">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer relative border-l-4 border-l-orange-500/50 bg-gradient-to-br from-card to-card/95 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-foreground text-lg">Pending Events</h3>
                  {(kpis as any).pendingEvents > 0 && (
                    <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold bg-orange-500 text-white shadow-md animate-pulse">
                      {(kpis as any).pendingEvents > 99 ? "99+" : (kpis as any).pendingEvents}
                    </span>
                  )}
                </div>
                <p className="text-4xl font-bold text-foreground group-hover:text-orange-500 transition-colors">{(kpis as any).pendingEvents || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">Requires attention</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-xl relative group-hover:bg-orange-500/20 transition-all shadow-sm">
                <AlertCircle className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
                {(kpis as any).pendingEvents > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-card shadow-lg animate-ping"></div>
                )}
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Today's Check-ins" value={kpis.todayCheckIns} icon="CheckIn" trend="" />
        <KPICard title="Today's Check-outs" value={kpis.todayCheckOuts} icon="CheckOut" trend="" />
        <KPICard title="Today's Revenue" value={`KSh ${(kpis as any).todayRevenue?.toLocaleString() || 0}`} icon="Revenue" trend="" />
        <KPICard title="Monthly Revenue" value={`KSh ${(kpis as any).monthlyRevenue?.toLocaleString() || 0}`} icon="Revenue" trend="" />
      </div>

      {/* --- Report Summary Section (copied from reports page) --- */}
      <div className="pt-8 space-y-6">
        <h2 className="text-2xl font-bold text-foreground font-serif mb-4">Performance Overview</h2>
        {/* Summary Stats (live) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500/50 bg-gradient-to-br from-card to-card/95 group">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Average Occupancy</p>
            <p className="text-3xl font-bold text-foreground group-hover:text-blue-500 transition-colors">{kpis.occupancyRate}%</p>
            <p className="text-xs text-muted-foreground mt-2">Room utilization rate</p>
          </Card>
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-accent/50 bg-gradient-to-br from-card to-card/95 group">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Total Revenue</p>
            <p className="text-3xl font-bold text-accent group-hover:scale-105 transition-transform inline-block">KSh {kpis.revenueThisMonth.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">All-time revenue</p>
          </Card>
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500/50 bg-gradient-to-br from-card to-card/95 group">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Total Bookings</p>
            <p className="text-3xl font-bold text-foreground group-hover:text-green-500 transition-colors">{bookings.length}</p>
            <p className="text-xs text-muted-foreground mt-2">All bookings</p>
          </Card>
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/95">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
              <h2 className="text-xl font-semibold text-foreground font-serif">Occupancy Trend</h2>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === "6months" ? "default" : "outline"}
                  onClick={() => setTimeRange("6months")}
                  size="sm"
                  className="text-xs h-8 px-3"
                >
                  6M
                </Button>
                <Button
                  variant={timeRange === "year" ? "default" : "outline"}
                  onClick={() => setTimeRange("year")}
                  size="sm"
                  className="text-xs h-8 px-3"
                >
                  Year
                </Button>
              </div>
            </div>
            <OccupancyReportChart bookings={bookings} rooms={rooms} reportType="monthly" timeRange={timeRange} />
          </Card>
          <Card className="p-6 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/95">
            <div className="mb-6 pb-4 border-b border-border/50">
              <h2 className="text-xl font-semibold text-foreground font-serif">Room Type Distribution</h2>
            </div>
            <RoomDistributionChart rooms={roomsWithAvailability} bookings={bookings} />
          </Card>
        </div>
        <Card className="p-6 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card to-card/95">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
            <h2 className="text-xl font-semibold text-foreground font-serif">Revenue Trend</h2>
            <div className="flex gap-2">
              <Button
                variant={timeRange === "6months" ? "default" : "outline"}
                onClick={() => setTimeRange("6months")}
                size="sm"
                className="text-xs h-8 px-3"
              >
                6M
              </Button>
              <Button
                variant={timeRange === "year" ? "default" : "outline"}
                onClick={() => setTimeRange("year")}
                size="sm"
                className="text-xs h-8 px-3"
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
