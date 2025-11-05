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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false)
  
  // Initialize authorized state - default to null for SSR, will be set after hydration
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const router = useRouter()
  
  // Track if initial check is done
  const [isInitialCheck, setIsInitialCheck] = useState(true)
  const [hasCachedAuth, setHasCachedAuth] = useState(false)
  
  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setIsMounted(true)
    
    // Load sidebar collapsed state
    const saved = localStorage.getItem("sidebarCollapsed")
    if (saved === "true") {
      setSidebarCollapsed(true)
    }
    
    // Load auth state from cache
    const cached = sessionStorage.getItem("adminAuthorized")
    if (cached === "true") {
      setAuthorized(true)
      setHasCachedAuth(true)
    } else if (cached === "false") {
      setAuthorized(false)
    } else {
      // Fallback to localStorage
      const persistentCache = localStorage.getItem("adminAuthorized")
      if (persistentCache === "true") {
        sessionStorage.setItem("adminAuthorized", "true")
        setAuthorized(true)
        setHasCachedAuth(true)
      } else if (persistentCache === "false") {
        sessionStorage.setItem("adminAuthorized", "false")
        setAuthorized(false)
      }
    }
    
    // Check if initial check was done before
    const initialCheckDone = localStorage.getItem("adminInitialCheckDone") === "true"
    if (initialCheckDone) {
      setIsInitialCheck(false)
      // If we have no auth cache but initial check was done, assume authorized
      // Check the actual localStorage values, not state (which hasn't updated yet)
      const hasCache = cached === "true" || persistentCache === "true"
      if (!hasCache) {
        setAuthorized(true)
      }
    }
  }, [])

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

  // If not authorized, don't render (will redirect)
  if (authorized === false) {
    return null
  }
  
  // Check if initial check was done before (persistent across remounts)
  const initialCheckDonePersistent = typeof window !== "undefined" && 
    localStorage.getItem("adminInitialCheckDone") === "true"
  
  // Only show loading screen on client after mount if:
  // 1. We're mounted (hydration complete)
  // 2. We have no cached auth AND initial check hasn't been done (true first visit)
  // 3. Initial check was NOT done before (persistent check)
  // Never show loading during SSR to avoid hydration mismatch
  // NEVER show loading if initial check was done before (even if state is reset)
  const shouldShowLoading = isMounted && 
    authorized === null && 
    isInitialCheck && 
    !hasCachedAuth &&
    !initialCheckDonePersistent
  
  if (shouldShowLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Checking access…</span>
      </div>
    )
  }
  
  // Show content - either we have cache/previous check, or authorized is true
  // Default to showing layout on SSR to avoid hydration mismatch

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

