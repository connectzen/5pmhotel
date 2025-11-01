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
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="font-serif text-2xl font-bold text-primary">
            5PM Hotel
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8">
            <Link href="/" className="text-foreground hover:text-accent transition">
              Home
            </Link>
            <Link href="/rooms" className="text-foreground hover:text-accent transition">
              Rooms
            </Link>
            <Link href="/venues" className="text-foreground hover:text-accent transition">
              Venues & Events
            </Link>
            <Link href="/about" className="text-foreground hover:text-accent transition">
              About
            </Link>
            <Link href="/contact" className="text-foreground hover:text-accent transition">
              Contact
            </Link>
          </div>

          <div className="hidden md:flex gap-4 items-center">
            {isAuthed ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition"
                >
                  <LayoutDashboard size={18} />
                  Dashboard
                </Link>
                <Link
                  href="/auth/logout"
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/booking?room=Deluxe%20Single&price=150&nights=1"
                  className="bg-accent text-accent-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
                >
                  Book Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/" className="block py-2 text-foreground hover:text-accent">
              Home
            </Link>
            <Link href="/rooms" className="block py-2 text-foreground hover:text-accent">
              Rooms
            </Link>
            <Link href="/venues" className="block py-2 text-foreground hover:text-accent">
              Venues & Events
            </Link>
            <Link href="/about" className="block py-2 text-foreground hover:text-accent">
              About
            </Link>
            <Link href="/contact" className="block py-2 text-foreground hover:text-accent">
              Contact
            </Link>
            {isAuthed ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="block bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center"
                >
                  Dashboard
                </Link>
                <Link href="/auth/logout" className="block px-4 py-2 rounded-lg border text-center">
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="block px-4 py-2 rounded-lg border text-center">
                  Sign In
                </Link>
                <Link href="/booking" className="block bg-accent text-accent-foreground px-4 py-2 rounded-lg text-center">
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
