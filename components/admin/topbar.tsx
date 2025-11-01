"use client"

import { useEffect, useState } from "react"
import { Bell, User, ChevronDown, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const [adminEmail, setAdminEmail] = useState("")

  useEffect(() => {
    const email = localStorage.getItem("adminEmail")
    if (email) setAdminEmail(email)
  }, [])

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 flex-1">
        <button className="md:hidden p-2 rounded hover:bg-muted" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Admin Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2 pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <User className="w-4 h-4 text-accent-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{adminEmail}</p>
            <p className="text-xs text-muted-foreground">Manager</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}
