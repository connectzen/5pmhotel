"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X, LayoutDashboard, Download } from "lucide-react"
import { onAuthUser } from "@/lib/auth"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const unsub = onAuthUser((u) => setIsAuthed(!!u))
    return () => unsub()
  }, [])

  useEffect(() => {
    const loadBrochure = async () => {
      try {
        const brochureDoc = await getDoc(doc(db, "hotelSettings", "brochure"))
        if (brochureDoc.exists()) {
          const data = brochureDoc.data()
          if (data.url) {
            setBrochureUrl(data.url)
          }
        }
      } catch (error) {
        console.error("Error loading brochure:", error)
      }
    }
    loadBrochure()
  }, [])

  const handleDownloadBrochure = async () => {
    if (!brochureUrl) return
    
    try {
      // Use backend API route to proxy the download (bypasses CORS)
      const response = await fetch("/api/download/brochure", {
        method: "GET",
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch brochure")
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "5PM-Hotel-Brochure.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
      // Fallback: if API fails, try direct download
      window.open(brochureUrl, "_blank", "noopener,noreferrer")
    }
  }

  // Auto-fade animation for tooltip
  useEffect(() => {
    if (!brochureUrl) return
    
    // Show tooltip initially after a short delay
    const showTimeout = setTimeout(() => {
      setShowTooltip(true)
    }, 1000)
    
    // Hide after 3 seconds
    const hideTimeout = setTimeout(() => {
      setShowTooltip(false)
    }, 4000)
    
    // Cycle animation every 8 seconds
    const interval = setInterval(() => {
      setShowTooltip(true)
      setTimeout(() => {
        setShowTooltip(false)
      }, 3000)
    }, 8000)
    
    return () => {
      clearTimeout(showTimeout)
      clearTimeout(hideTimeout)
      clearInterval(interval)
    }
  }, [brochureUrl])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="font-serif text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            5PM Hotel
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8">
            <Link href="/" className="text-foreground hover:text-accent transition-colors font-medium relative group">
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/rooms" className="text-foreground hover:text-accent transition-colors font-medium relative group">
              Rooms
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/venues" className="text-foreground hover:text-accent transition-colors font-medium relative group">
              Venues & Events
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/gallery" className="text-foreground hover:text-accent transition-colors font-medium relative group">
              Gallery
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/about" className="text-foreground hover:text-accent transition-colors font-medium relative group">
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/contact" className="text-foreground hover:text-accent transition-colors font-medium relative group">
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
            </Link>
            {brochureUrl && (
              <div className="relative">
                <button
                  onClick={handleDownloadBrochure}
                  className="text-foreground hover:text-accent transition-all duration-300 font-medium relative flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/10"
                  aria-label="Download brochure"
                >
                  <Download className="w-4 h-4 transition-transform duration-300 hover:scale-110" />
                </button>
                {/* Auto-fade in/out tooltip animation */}
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-[100] ${
                    showTooltip ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                  } transition-all duration-500 ease-in-out`}
                >
                  Download our brochure
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45"></div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex gap-3 items-center">
            {isAuthed ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>
                <Link
                  href="/auth/logout"
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted hover:border-accent/50 transition-all"
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted hover:border-accent/50 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/booking?room=Deluxe%20Single&price=150&nights=1"
                  className="bg-accent text-accent-foreground px-6 py-2 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Book Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 pt-2">
            <Link href="/" className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2">
              Home
            </Link>
            <Link href="/rooms" className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2">
              Rooms
            </Link>
            <Link href="/venues" className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2">
              Venues & Events
            </Link>
            <Link href="/gallery" className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2">
              Gallery
            </Link>
            <Link href="/about" className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2">
              About
            </Link>
            <Link href="/contact" className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2">
              Contact
            </Link>
            {brochureUrl && (
              <button
                onClick={handleDownloadBrochure}
                className="block py-2 text-foreground hover:text-accent transition-colors font-medium rounded-lg hover:bg-muted/50 px-2 w-full text-left flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Brochure
              </button>
            )}
            {isAuthed ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center font-semibold shadow-md hover:shadow-lg transition-all mt-4"
                >
                  Dashboard
                </Link>
                <Link href="/auth/logout" className="block px-4 py-2 rounded-lg border border-border text-center hover:bg-muted transition-all">
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="block px-4 py-2 rounded-lg border border-border text-center hover:bg-muted transition-all">
                  Sign In
                </Link>
                <Link href="/booking" className="block bg-accent text-accent-foreground px-4 py-2 rounded-lg text-center font-semibold shadow-md hover:shadow-lg transition-all mt-2">
                  Book Now
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
