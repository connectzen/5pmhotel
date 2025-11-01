"use client"

import { useEffect, useState } from "react"
import { Bell, User, ChevronDown, Menu, LogOut, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function AdminTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const [adminEmail, setAdminEmail] = useState("")

  useEffect(() => {
    const email = localStorage.getItem("adminEmail")
    if (email) setAdminEmail(email)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminEmail")
    window.location.href = "/admin/login"
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 flex-1">
        <button className="md:hidden p-2 rounded hover:bg-muted" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Admin Dashboard</h2>
      </div>

      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-4 pl-4 border-l border-border">
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <User className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{adminEmail}</p>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </div>
        </div>
      </div>
    </header>
  )
}
