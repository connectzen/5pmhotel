"use client"

import { Menu, LogOut, Home, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AdminTopbarProps {
  onToggleSidebar?: () => void
  onToggleCollapse?: () => void
  sidebarCollapsed?: boolean
}

export function AdminTopbar({ onToggleSidebar, onToggleCollapse, sidebarCollapsed = false }: AdminTopbarProps) {

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

      {/* Right side with Logout */}
      <div className="flex items-center gap-3 flex-1 justify-end">
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
