"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { onAuthUser } from "@/lib/auth"

export function HeroSection() {
  const [isAuthed, setIsAuthed] = useState(false)
  useEffect(() => {
    const unsub = onAuthUser((u) => setIsAuthed(!!u))
    return () => unsub()
  }, [])

  return (
    <section className="relative pt-20 md:pt-24 pb-10 md:pb-16 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden mx-auto">
          <div className="relative w-full">
            <img
              src="/helloImage/Screenshot%202025-10-30%20112005.png"
              alt="Hotel showcase"
              className="w-full h-[420px] md:h-[560px] object-cover object-[50%_20%] block brightness-95 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
          </div>
          {/* Removed hero overlay dashboard/sign-in button; header already contains dashboard access */}
        </div>
      </div>
    </section>
  )
}
