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
  // Initialize with cached auth state if available, otherwise null
  const [authorized, setAuthorized] = useState<boolean | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("adminAuthorized")
      return cached === "true" ? true : cached === "false" ? false : null
    }
    return null
  })
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    const unsubscribe = onAuthUser(async (user) => {
      if (!isMounted) return
      
      if (!user) {
        if (isMounted) {
          setAuthorized(false)
          sessionStorage.setItem("adminAuthorized", "false")
          router.replace("/auth/signin")
        }
        return
      }
      
      try {
        const role = await getUserRole(user.uid)
        if (isMounted) {
          if (role === "admin") {
            setAuthorized(true)
            sessionStorage.setItem("adminAuthorized", "true")
          } else {
            setAuthorized(false)
            sessionStorage.setItem("adminAuthorized", "false")
            router.replace("/auth/signin")
          }
        }
      } catch (error) {
        console.error("Error checking admin role:", error)
        if (isMounted) {
          setAuthorized(false)
          sessionStorage.setItem("adminAuthorized", "false")
        }
      }
    })
    
    return () => {
      isMounted = false
      unsubscribe()
    }
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

  // If we have cached authorization, show content immediately
  // The auth check will run in background and update if needed
  if (authorized === false) {
    return null
  }
  
  // Show loading only if we truly don't know the auth state (first load, no cache)
  if (authorized === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Checking access…</span>
      </div>
    )
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
