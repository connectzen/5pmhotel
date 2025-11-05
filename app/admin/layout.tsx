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
  // Initialize with cached auth state - default to true if cache exists, null only on first load
  const [authorized, setAuthorized] = useState<boolean | null>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("adminAuthorized")
      // If we have a cached value (even false), use it immediately
      // Only show loading if there's no cache at all (first visit)
      if (cached === "true") return true
      if (cached === "false") return false
      // No cache - check localStorage as fallback (more persistent)
      const persistentCache = localStorage.getItem("adminAuthorized")
      if (persistentCache === "true") {
        // Set sessionStorage too for consistency
        sessionStorage.setItem("adminAuthorized", "true")
        return true
      }
      if (persistentCache === "false") {
        sessionStorage.setItem("adminAuthorized", "false")
        return false
      }
    }
    return null
  })
  const router = useRouter()
  // Use localStorage to persist initial check state across remounts (especially on mobile)
  const [isInitialCheck, setIsInitialCheck] = useState(() => {
    if (typeof window !== "undefined") {
      // If we've done the initial check before, we're not in initial check anymore
      return localStorage.getItem("adminInitialCheckDone") !== "true"
    }
    return true
  })

  useEffect(() => {
    let isMounted = true
    
    const unsubscribe = onAuthUser(async (user) => {
      if (!isMounted) return
      
      if (!user) {
        if (isMounted) {
          setAuthorized(false)
          sessionStorage.setItem("adminAuthorized", "false")
          localStorage.setItem("adminAuthorized", "false")
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
            localStorage.setItem("adminAuthorized", "true")
            // Mark initial check as done
            localStorage.setItem("adminInitialCheckDone", "true")
          } else {
            setAuthorized(false)
            sessionStorage.setItem("adminAuthorized", "false")
            localStorage.setItem("adminAuthorized", "false")
            router.replace("/auth/signin")
          }
        }
      } catch (error) {
        console.error("Error checking admin role:", error)
        if (isMounted) {
          // On error, if we have a cached true value, keep it
          // Only set to false if we don't have a cache
          const cached = sessionStorage.getItem("adminAuthorized")
          if (cached !== "true") {
            setAuthorized(false)
            sessionStorage.setItem("adminAuthorized", "false")
            localStorage.setItem("adminAuthorized", "false")
          } else {
            // Even on error, if we have a cached auth, mark initial check as done
            localStorage.setItem("adminInitialCheckDone", "true")
          }
        }
      } finally {
        if (isMounted) {
          setIsInitialCheck(false)
          // Mark initial check as done in localStorage
          localStorage.setItem("adminInitialCheckDone", "true")
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
  
  // Show loading only if we truly don't know the auth state AND it's truly the first check ever
  // After initial check is done (tracked in localStorage), always show content (auth runs in background)
  const initialCheckDone = typeof window !== "undefined" && localStorage.getItem("adminInitialCheckDone") === "true"
  
  // Also check if we have any cached auth value (even if authorized state is null due to remount)
  const hasCachedAuth = typeof window !== "undefined" && (
    sessionStorage.getItem("adminAuthorized") === "true" || 
    localStorage.getItem("adminAuthorized") === "true"
  )
  
  // Only show loading if:
  // 1. We have no cached auth value
  // 2. Initial check hasn't been done before
  // 3. We're currently in initial check state
  if (authorized === null && !hasCachedAuth && isInitialCheck && !initialCheckDone) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Checking access…</span>
      </div>
    )
  }
  
  // If authorized is null but initial check is done OR we have cached auth, show content anyway
  // (This handles edge cases where cache might be temporarily unavailable or component remounts)
  // The auth check will run in background and update if needed

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
