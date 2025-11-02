"use client"

import type React from "react"

import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminTopbar } from "@/components/admin/topbar"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthUser, getUserRole } from "@/lib/auth"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ThemeProvider>
  )
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load collapsed state from localStorage on initial render
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarCollapsed")
      return saved === "true"
    }
    return false
  })
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthUser(async (user) => {
      if (!user) {
        setAuthorized(false)
        router.replace("/auth/signin")
        return
      }
      const role = await getUserRole(user.uid)
      if (role === "admin") {
        setAuthorized(true)
      } else {
        setAuthorized(false)
        router.replace("/auth/signin")
      }
    })
    return () => unsubscribe()
  }, [router])

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed])

  // Add class to body and html to prevent scrolling when in admin pages
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.add("admin-layout-active")
      document.documentElement.classList.add("admin-layout-active")
      return () => {
        document.body.classList.remove("admin-layout-active")
        document.documentElement.classList.remove("admin-layout-active")
      }
    }
  }, [])

  if (authorized === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Checking access…</span>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="dark flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex transition-all duration-300">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile sidebar (overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl z-10">
            <AdminSidebar collapsed={false} onClose={() => setSidebarOpen(false)} isMobile={true} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 min-w-0">
        <AdminTopbar 
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-hidden min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  )
}
