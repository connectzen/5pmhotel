"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X, LayoutDashboard } from "lucide-react"
import { onAuthUser } from "@/lib/auth"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const unsub = onAuthUser((u) => setIsAuthed(!!u))
    return () => unsub()
  }, [])

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
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
