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
              className="w-full h-[420px] md:h-[560px] object-cover object-[40%_35%] block brightness-95 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
            {/* Text overlay */}
            <div className="absolute inset-0 flex items-end md:items-center">
              <div className="p-5 sm:p-8 md:p-10 max-w-xl">
                <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-serif font-extrabold drop-shadow-md">
                  5PM Hotel
                </h1>
                <p className="mt-3 text-white/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-prose">
                  Modern accommodation and elegant venues. Relax, host, and enjoy premium hospitality.
                </p>
              </div>
            </div>
          </div>
          {/* Removed hero overlay dashboard/sign-in button; header already contains dashboard access */}
        </div>
      </div>
    </section>
  )
}
