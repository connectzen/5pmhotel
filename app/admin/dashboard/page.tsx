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
import { parseISO, isValid, isToday, startOfDay } from "date-fns"
import NotificationsOptIn from "@/components/admin/notifications-optin"
import { onAuthUser, getUserRole } from "@/lib/auth"

export default function DashboardPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [kpis, setKpis] = useState(mockKPIData)
  const [timeRange, setTimeRange] = useState<"6months" | "year">("6months")
  const [userInfo, setUserInfo] = useState<{ uid: string; role?: string } | null>(null)
  const [prevPending, setPrevPending] = useState<{ bookings: number; events: number }>({ bookings: 0, events: 0 })
  const [prevExpiring, setPrevExpiring] = useState<number>(0)

  useEffect(() => {
    const unsubAuth = onAuthUser(async (u) => {
      if (!u) {
        setUserInfo(null)
        return
      }
      const role = await getUserRole(u.uid)
      setUserInfo({ uid: u.uid, role: role ?? undefined })
    })
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
      unsubAuth()
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calculate today's check-ins using the same logic as revenue tracking
    // Count both bookings and events that were checked-in/approved today with completed payments
    // Use payment dates as the primary source, matching revenue tracking exactly
    const todayCheckIns = 
      // Count bookings checked in today - use payment date as primary source
      bookings.filter((b: any) => {
        // Must be checked-in status
        if (b.status !== "checked-in") return false
        // Exclude cancelled bookings
        if (b.status === "cancelled") return false
        
        // Check multiple sources to determine if check-in happened today
        let checkInDate: Date | null = null
        
        // Priority 1: Check booking's checkIn date field (most direct)
        if (b.checkIn) {
          const parsed = parseISO(b.checkIn)
          if (isValid(parsed)) {
            checkInDate = parsed
          }
        }
        
        // Priority 2: Check payment date (for consistency with revenue - this is the most reliable)
        const payment = payments.find((p: any) => 
          p.bookingId === b.id && 
          p.type === "booking" && 
          p.status === "completed"
        )
        
        if (payment) {
          // Use the same payment date logic as revenue tracking (EXACT same as todayRevenue)
          if (payment.date) {
            if (typeof payment.date === 'string') {
              if (payment.date.includes('-') && payment.date.length === 10) {
                const parsed = parseISO(payment.date)
                if (isValid(parsed)) {
                  checkInDate = parsed
                } else {
                  checkInDate = new Date(payment.date)
                }
              } else {
                checkInDate = new Date(payment.date)
              }
            } else if (payment.date instanceof Date) {
              checkInDate = payment.date
            } else {
              checkInDate = new Date(payment.date)
            }
          } else if (payment.createdAt?.toDate) {
            checkInDate = payment.createdAt.toDate()
          } else if (payment.updatedAt?.toDate) {
            checkInDate = payment.updatedAt.toDate()
          }
        }
        
        // Priority 3: Check booking's updatedAt (when status was changed to checked-in)
        if (!checkInDate && b.updatedAt?.toDate) {
          checkInDate = b.updatedAt.toDate()
        }
        
        // If still no date, try parsing from dates field
        if (!checkInDate && b.dates) {
          const dates = b.dates.split(" - ")
          if (dates.length > 0) {
            const checkInStr = dates[0].trim()
            const checkInParts = checkInStr.split("/")
            if (checkInParts.length === 3) {
              const [day, month, year] = checkInParts
              checkInDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
              if (isNaN(checkInDate.getTime())) checkInDate = null
            }
            if (!checkInDate) {
              const parsed = parseISO(checkInStr)
              if (isValid(parsed)) {
                checkInDate = parsed
              }
            }
          }
        }
        
        if (!checkInDate) return false
        
        // Normalize to start of day and compare with today
        checkInDate.setHours(0, 0, 0, 0)
        return checkInDate.getTime() === today.getTime()
      }).length +
      // Count events approved today (event approval = check-in for events)
      events.filter((e: any) => {
        // Must be approved status
        if (e.status !== "approved") return false
        
        // Check multiple sources to determine if approval/check-in happened today
        let approvalDate: Date | null = null
        
        // Priority 1: Check event's updatedAt (when status was changed to approved)
        if (e.updatedAt?.toDate) {
          approvalDate = e.updatedAt.toDate()
        }
        
        // Priority 2: Check payment date (for consistency with revenue)
        if (!approvalDate) {
          const payment = payments.find((p: any) => {
            if (p.type !== "event" || p.status !== "completed") return false
            // Match by event id or firestoreId
            return p.bookingId === e.id || 
                   p.bookingId === e.firestoreId ||
                   p.id === e.id ||
                   p.id === e.firestoreId
          })
          
          if (payment) {
            // Use the same payment date logic as revenue tracking
            if (payment.date) {
              if (typeof payment.date === 'string') {
                if (payment.date.includes('-') && payment.date.length === 10) {
                  approvalDate = parseISO(payment.date)
                  if (!isValid(approvalDate)) {
                    approvalDate = new Date(payment.date)
                  }
                } else {
                  approvalDate = new Date(payment.date)
                }
              } else if (payment.date instanceof Date) {
                approvalDate = payment.date
              } else {
                approvalDate = new Date(payment.date)
              }
            } else if (payment.createdAt?.toDate) {
              approvalDate = payment.createdAt.toDate()
            } else if (payment.updatedAt?.toDate) {
              approvalDate = payment.updatedAt.toDate()
            }
          }
        }
        
        // Priority 3: Check event date field as fallback
        if (!approvalDate && e.date) {
          const parsed = parseISO(e.date)
          if (isValid(parsed)) {
            approvalDate = parsed
          }
        }
        
        if (!approvalDate) return false
        
        // Normalize to start of day and compare with today
        approvalDate.setHours(0, 0, 0, 0)
        return approvalDate.getTime() === today.getTime()
      }).length
    
    // Calculate today's check-outs: only count bookings checked out TODAY
    // Check-outs only apply to bookings (events don't have check-out)
    // Use booking's updatedAt to determine when status was changed to checked-out today
    const todayCheckOuts = bookings.filter((b: any) => {
      // Must be checked-out status
      if (b.status !== "checked-out") return false
      
      // Use booking's updatedAt timestamp to determine when status was changed to checked-out
      // This is the most reliable way to know when check-out actually happened
      let checkOutDate: Date | null = null
      
      // Priority 1: Check booking's updatedAt (when status was changed to checked-out)
      if (b.updatedAt?.toDate) {
        checkOutDate = b.updatedAt.toDate()
      }
      // Priority 2: Check if booking has a checkOutDate field that was set today
      else if (b.checkOut) {
        const parsed = parseISO(b.checkOut)
        if (isValid(parsed)) {
          checkOutDate = parsed
        }
      }
      // Priority 3: Check payment's updatedAt (fallback if payment was updated when checking out)
      else {
        const payment = payments.find((p: any) => 
          p.bookingId === b.id && 
          p.type === "booking" && 
          p.status === "completed"
        )
        if (payment?.updatedAt?.toDate) {
          checkOutDate = payment.updatedAt.toDate()
        }
      }
      
      // If we still don't have a date, we can't determine if it's today's check-out
      if (!checkOutDate) return false
      
      // Normalize to start of day and compare with today (same as revenue logic)
      checkOutDate.setHours(0, 0, 0, 0)
      return checkOutDate.getTime() === today.getTime()
    }).length
    
    // Calculate today's revenue from completed payments created today
    // Works for both bookings and events - uses same logic as monthly revenue
    const todayRevenue = payments
      .filter((p: any) => {
        if (p.status !== "completed") return false
        
        // Get payment date - prioritize date field for updated payments
        // This ensures we use today's date when payments are approved/updated today
        let paymentDate: Date | null = null
        
        // Priority 1: Check date field (string format like "YYYY-MM-DD") - for updated/approved payments today
        // This is the most reliable for both bookings and events when they're approved today
        if (p.date) {
          // If date is a string in ISO format (YYYY-MM-DD), use parseISO
          if (typeof p.date === 'string') {
            // Check if it's ISO format (YYYY-MM-DD)
            if (p.date.includes('-') && p.date.length === 10) {
              paymentDate = parseISO(p.date)
              // If parseISO fails, fallback to regular Date
              if (!isValid(paymentDate)) {
                paymentDate = new Date(p.date)
              }
            } else {
              // Try parsing as regular date string
              paymentDate = new Date(p.date)
            }
          } else if (p.date instanceof Date) {
            paymentDate = p.date
          } else {
            paymentDate = new Date(p.date)
          }
        }
        // Priority 2: Check createdAt timestamp (Firebase Timestamp) - for newly created payments
        else if (p.createdAt?.toDate) {
          paymentDate = p.createdAt.toDate()
        }
        // Priority 3: Check updatedAt (fallback for updated payments without date field)
        else if (p.updatedAt?.toDate) {
          paymentDate = p.updatedAt.toDate()
        }
        
        if (!paymentDate) return false
        
        // Normalize to start of day and compare with today
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
      todayCheckIns: todayCheckIns, 
      todayCheckOuts: todayCheckOuts, 
      occupancyRate, 
      revenueThisMonth: revenue,
      todayRevenue,
      monthlyRevenue,
      pendingBookings: pendingBookingsCount,
      pendingEvents: pendingEventsCount,
      totalBookings: bookings.length
    })

    if (pendingBookingsCount > prevPending.bookings) {
      void fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New pending booking", body: `You have ${pendingBookingsCount} pending bookings`, role: "admin" }),
      })
    }
    if (pendingEventsCount > prevPending.events) {
      void fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New pending event", body: `You have ${pendingEventsCount} pending events`, role: "admin" }),
      })
    }
    setPrevPending({ bookings: pendingBookingsCount, events: pendingEventsCount })

    const expiringToday = bookings.filter((b: any) => {
      if (b.status !== "approved" && b.status !== "checked-in") return false
      const out = b.checkOut ? parseISO(b.checkOut) : null
      if (!out || !isValid(out)) return false
      out.setHours(0,0,0,0)
      const today = new Date(); today.setHours(0,0,0,0)
      return out.getTime() === today.getTime()
    }).length
    if (expiringToday > prevExpiring) {
      void fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Bookings expiring today", body: `${expiringToday} bookings expire today`, role: "admin" }),
      })
    }
    setPrevExpiring(expiringToday)
  }, [bookings, rooms, roomsWithAvailability, payments, events])

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="p-6 space-y-8 bg-background flex-1 overflow-y-auto">
      {userInfo && (
        <NotificationsOptIn userId={userInfo.uid} role={userInfo.role} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border/50">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome back to 5PM Hotel Admin</p>
        </div>
      </div>

      {/* Available Rooms Card - First Priority */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Link href="/admin/rooms?filter=available">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-l-primary bg-gradient-to-br from-card to-card/95 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-4 text-lg group-hover:text-primary transition-colors">Available Rooms</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground group-hover:text-accent transition-colors animate-pulse-tick">
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
              <div className="p-4 bg-accent/10 rounded-xl relative group-hover:bg-accent/20 transition-all shadow-sm">
                <Calendar className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
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
              <div className="p-4 bg-accent/10 rounded-xl relative group-hover:bg-accent/20 transition-all shadow-sm">
                <AlertCircle className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
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
          <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/50 bg-gradient-to-br from-card to-card/95 group">
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
    </div>
  )
}
