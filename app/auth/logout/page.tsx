"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { signOutUser } from "@/lib/auth"

export default function LogoutPage() {
  useEffect(() => {
    signOutUser().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">Signed out</h1>
            <p className="text-lg opacity-90">You have been logged out successfully.</p>
          </div>
        </section>

        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-foreground/80 mb-6">You can sign back in anytime.</p>
          <Link href="/auth/signin" className="inline-block bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
            Go to Sign In
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}


