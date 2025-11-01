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
  LogOut,
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

  useEffect(() => {
    // Listen to pending bookings
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      const pending = snap.docs.filter((d) => {
        const data = d.data()
        return data.status === "pending"
      }).length
      setPendingBookingsCount(pending)
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
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminEmail")
    window.location.href = "/admin/login"
  }

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "bookings") return pendingBookingsCount
    if (badgeKey === "events") return pendingEventsCount
    return 0
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2 rounded-lg transition-colors relative",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/10",
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.showBadge && badgeCount > 0 && (
                <span
                  className={cn(
                    "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                    isActive
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                      : "bg-red-500 text-white"
                  )}
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Link
          href="/"
          className="block text-center px-4 py-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 transition-colors"
        >
          Back to Site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
