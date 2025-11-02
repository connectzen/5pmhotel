"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, showBadge: false },
  { href: "/admin/rooms", label: "Rooms", icon: DoorOpen, showBadge: false },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar, showBadge: true, badgeKey: "bookings" },
  { href: "/admin/venues", label: "Venues", icon: Building2, showBadge: false },
  { href: "/admin/events", label: "Events", icon: Calendar, showBadge: true, badgeKey: "events" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, showBadge: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, showBadge: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, showBadge: false },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0)
  const [pendingEventsCount, setPendingEventsCount] = useState(0)
  const [expiredCheckoutsCount, setExpiredCheckoutsCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every minute for real-time monitoring
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Listen to pending bookings
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      const bookings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      const pending = bookings.filter((b: any) => b.status === "pending").length
      setPendingBookingsCount(pending)

      // Calculate expired checkouts
      const now = currentTime
      const expired = bookings.filter((booking: any) => {
        if (booking.status !== "checked-in") return false
        
        const checkoutTime = booking.checkOutTime || booking.checkoutTime
        const checkoutDateStr = booking.checkOutDate || booking.checkOut || booking.checkoutDate
        
        let checkoutDate: Date | null = null
        if (checkoutDateStr) {
          checkoutDate = new Date(checkoutDateStr)
          if (isNaN(checkoutDate.getTime())) checkoutDate = null
        }
        
        if (!checkoutDate && booking.dates) {
          const dates = (booking.dates || "").split(" - ")
          if (dates.length >= 2) {
            const checkoutStr = dates[1].trim()
            const parts = checkoutStr.split("/")
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10)
              const month = parseInt(parts[1], 10)
              const year = parseInt(parts[2], 10)
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                checkoutDate = new Date(year, month - 1, day)
              }
            }
          }
        }
        
        if (!checkoutDate) return false
        
        let checkoutDateTime: Date | null = null
        if (checkoutTime && typeof checkoutTime === 'string' && checkoutTime.includes(':')) {
          const [hours, minutes] = checkoutTime.split(':').map(Number)
          if (!isNaN(hours) && !isNaN(minutes)) {
            checkoutDateTime = new Date(checkoutDate)
            checkoutDateTime.setHours(hours, minutes, 0, 0)
          }
        }
        
        if (!checkoutDateTime) {
          checkoutDateTime = new Date(checkoutDate)
          checkoutDateTime.setHours(11, 0, 0, 0)
        }
        
        return now > checkoutDateTime
      }).length
      
      setExpiredCheckoutsCount(expired)
    })

    // Listen to pending events
    const unsubEvents = onSnapshot(collection(db, "clientEvents"), (snap) => {
      const pending = snap.docs.filter((d) => {
        const data = d.data()
        return data.status === "pending"
      }).length
      setPendingEventsCount(pending)
    })

    return () => {
      unsubBookings()
      unsubEvents()
    }
  }, [currentTime])

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "bookings") return pendingBookingsCount
    if (badgeKey === "events") return pendingEventsCount
    return 0
  }
  
  // Add expired checkouts badge to bookings if any
  const getEffectiveBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "bookings") {
      return pendingBookingsCount + (expiredCheckoutsCount > 0 ? expiredCheckoutsCount : 0)
    }
    return getBadgeCount(badgeKey)
  }

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">5PM Hotel</h1>
        <p className="text-sm text-sidebar-foreground/60">Admin Panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const badgeCount = getBadgeCount(item.badgeKey)
          const effectiveBadgeCount = getEffectiveBadgeCount(item.badgeKey)
          const hasExpiredCheckouts = item.badgeKey === "bookings" && expiredCheckoutsCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative group overflow-hidden",
                "hover:scale-[1.02] hover:translate-x-1 hover:shadow-lg",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md scale-[1.02] translate-x-1"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/20",
              )}
            >
              {/* Animated left border indicator */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 bg-accent transition-all duration-300 rounded-r-full",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 scale-y-0 group-hover:scale-y-100"
              )} />
              
              {/* Background glow effect */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent transition-opacity duration-300 rounded-lg",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )} />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  isActive 
                    ? "bg-sidebar-primary-foreground/20" 
                    : "bg-transparent group-hover:bg-sidebar-accent/30"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive 
                      ? "scale-110" 
                      : "group-hover:scale-110 group-hover:rotate-3"
                  )} />
                </div>
                <span className={cn(
                  "text-sm font-medium transition-all duration-300",
                  isActive 
                    ? "font-semibold" 
                    : "group-hover:font-semibold"
                )}>
                  {item.label}
                </span>
              </div>
              {item.showBadge && effectiveBadgeCount > 0 && (
                <div className="flex items-center gap-1 relative z-10">
                  {hasExpiredCheckouts && (
                    <span className="text-xs font-bold text-red-600 animate-pulse">🚨</span>
                  )}
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-[22px] h-6 px-2 rounded-full text-xs font-bold transition-all duration-300",
                      isActive
                        ? "bg-sidebar-primary-foreground/30 text-sidebar-primary-foreground scale-110"
                        : hasExpiredCheckouts
                        ? "bg-red-600 text-white group-hover:scale-110 group-hover:shadow-md animate-pulse"
                        : "bg-red-500 text-white group-hover:scale-110 group-hover:shadow-md",
                    )}
                  >
                    {effectiveBadgeCount > 99 ? "99+" : effectiveBadgeCount}
                  </span>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

    </aside>
  )
}
