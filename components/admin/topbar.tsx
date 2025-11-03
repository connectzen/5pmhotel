"use client"

import { useEffect, useState } from "react"
import { Menu, LogOut, Home, ChevronsLeft, ChevronsRight, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AdminTopbarProps {
  onToggleSidebar?: () => void
  onToggleCollapse?: () => void
  sidebarCollapsed?: boolean
}

export function AdminTopbar({ onToggleSidebar, onToggleCollapse, sidebarCollapsed = false }: AdminTopbarProps) {
  const [expiredCheckInsCount, setExpiredCheckInsCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every minute for real-time monitoring
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Listen to bookings and calculate expired check-ins
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      const bookings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      
      // Calculate expired check-ins
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
      
      setExpiredCheckInsCount(expired)
    })

    return () => {
      unsubBookings()
    }
  }, [currentTime])

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminEmail")
    window.location.href = "/admin/login"
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 flex-1">
        <button 
          className="md:hidden p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors z-10 flex items-center justify-center" 
          onClick={onToggleSidebar} 
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <button 
          className="hidden md:flex p-2 rounded hover:bg-muted transition-colors" 
          onClick={onToggleCollapse} 
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <ChevronsLeft className="w-5 h-5" />
          )}
        </button>
        <h2 className="text-lg font-semibold text-foreground">Admin Dashboard</h2>
      </div>

      {/* Centered "Back to Site" button */}
      <div className="flex-1 flex items-center justify-center">
        <Link
          href="/"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg font-medium text-sm"
        >
          <Home className="w-4 h-4" />
          Back to Site
        </Link>
        <Link
          href="/"
          className="sm:hidden p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          aria-label="Back to Site"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>

      {/* Right side with Notification and Logout */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Expired Check-ins Notification Icon */}
        {expiredCheckInsCount > 0 && (
          <Link
            href="/admin/bookings?filter=checked-in"
            className="relative p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300 hover:scale-110 group"
            aria-label={`${expiredCheckInsCount} expired check-in${expiredCheckInsCount > 1 ? 's' : ''} - Click to view`}
            title={`${expiredCheckInsCount} expired check-in${expiredCheckInsCount > 1 ? 's' : ''} need checkout`}
          >
            <Bell className="w-5 h-5 text-red-600 dark:text-red-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse shadow-lg ring-2 ring-red-200 dark:ring-red-800">
              {expiredCheckInsCount > 99 ? "99+" : expiredCheckInsCount}
            </span>
          </Link>
        )}
        
        <Button
          onClick={handleLogout}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-300 bg-card"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
        <Button
          onClick={handleLogout}
          size="icon"
          className="sm:hidden p-2 rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all bg-card"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
