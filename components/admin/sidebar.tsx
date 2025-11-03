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
  X,
  Menu,
} from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, showBadge: false },
  { href: "/admin/rooms", label: "Rooms", icon: DoorOpen, showBadge: false },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar, showBadge: true, badgeKey: "bookings" },
  { href: "/admin/venues", label: "Venues", icon: Building2, showBadge: false },
  { href: "/admin/events", label: "Events", icon: Calendar, showBadge: true, badgeKey: "events" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, showBadge: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, showBadge: false },
  { href: "/admin/gallery", label: "Gallery", icon: FileText, showBadge: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, showBadge: false },
]

interface AdminSidebarProps {
  collapsed?: boolean
  onClose?: () => void
  isMobile?: boolean
  onCollapse?: () => void
}

export function AdminSidebar({ collapsed = false, onClose, isMobile = false, onCollapse }: AdminSidebarProps) {
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
    <TooltipPrimitive.Provider delayDuration={200}>
      <aside className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col h-full transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        <div className={cn(
          "border-b border-sidebar-border transition-all duration-300 relative",
          collapsed ? "p-4" : "p-6"
        )}>
          {/* Close button for mobile */}
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-accent/20 text-sidebar-foreground transition-colors z-10"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Collapse button for desktop */}
          {!isMobile && !collapsed && onCollapse && (
            <button
              onClick={onCollapse}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-accent/20 text-sidebar-foreground transition-colors z-10 md:flex hidden"
              aria-label="Collapse sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Expand button for desktop when collapsed */}
          {!isMobile && collapsed && onCollapse && (
            <button
              onClick={onCollapse}
              className="w-full p-2 rounded-lg hover:bg-sidebar-accent/20 text-sidebar-foreground transition-colors flex items-center justify-center mb-2"
              aria-label="Expand sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {collapsed ? (
            <>
              <h1 className="text-xl font-serif font-bold text-sidebar-foreground text-center">5PM</h1>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">5PM Hotel</h1>
              <p className="text-sm text-sidebar-foreground/60">Admin Panel</p>
            </>
          )}
        </div>

        <nav className={cn(
          "flex-1 overflow-y-auto space-y-2 transition-all duration-300",
          collapsed ? "p-2" : "p-4"
        )}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const badgeCount = getBadgeCount(item.badgeKey)
            const effectiveBadgeCount = getEffectiveBadgeCount(item.badgeKey)
            const hasExpiredCheckouts = item.badgeKey === "bookings" && expiredCheckoutsCount > 0
            
            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-300 relative group overflow-hidden",
                  collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3",
                  "hover:scale-[1.02] hover:shadow-lg",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md scale-[1.02]"
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
                
                <div className={cn(
                  "flex items-center relative z-10",
                  collapsed ? "justify-center" : "gap-3"
                )}>
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
                  {!collapsed && (
                    <span className={cn(
                      "text-sm font-medium transition-all duration-300",
                      isActive 
                        ? "font-semibold" 
                        : "group-hover:font-semibold"
                    )}>
                      {item.label}
                    </span>
                  )}
                </div>
                {!collapsed && item.showBadge && effectiveBadgeCount > 0 && (
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
                {collapsed && item.showBadge && effectiveBadgeCount > 0 && (
                  <div className="absolute top-1 right-1 relative z-10">
                    <span
                      className={cn(
                        "flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-full text-[10px] font-bold",
                        hasExpiredCheckouts
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-red-500 text-white",
                      )}
                    >
                      {effectiveBadgeCount > 9 ? "9+" : effectiveBadgeCount}
                    </span>
                  </div>
                )}
              </Link>
            )
            
            if (collapsed) {
              return (
                <TooltipPrimitive.Root key={item.href}>
                  <TooltipPrimitive.Trigger asChild>
                    {linkContent}
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content 
                      side="right" 
                      className="bg-foreground text-background rounded-md px-3 py-1.5 text-xs z-50 flex items-center gap-2"
                      sideOffset={8}
                    >
                      <span>{item.label}</span>
                      {item.showBadge && effectiveBadgeCount > 0 && (
                        <span className={cn(
                          "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                          hasExpiredCheckouts
                            ? "bg-red-600 text-white"
                            : "bg-red-500 text-white",
                        )}>
                          {effectiveBadgeCount > 99 ? "99+" : effectiveBadgeCount}
                        </span>
                      )}
                      <TooltipPrimitive.Arrow className="fill-foreground" />
                    </TooltipPrimitive.Content>
                  </TooltipPrimitive.Portal>
                </TooltipPrimitive.Root>
              )
            }
            
            return <div key={item.href}>{linkContent}</div>
          })}
        </nav>
      </aside>
    </TooltipPrimitive.Provider>
  )
}
