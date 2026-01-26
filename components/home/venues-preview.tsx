"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

type Venue = {
  id: string
  name: string
  image?: string
  images?: string[]
  operatingHours?: { start?: string; end?: string }
  packages?: Array<{ id: string; name: string; price?: number; durationHours?: number }>
  capacities?: {
    theatre?: number
    classroom?: number
    uShape?: number
    boardroom?: number
  }
}

export function VenuesPreview() {
  const [venues, setVenues] = useState<Venue[]>([])

  useEffect(() => {
    // Load all venues for the homepage (no pagination)
    const q = query(collection(db, "venues"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setVenues(snap.docs.map((d) => {
        const data = d.data() as any
        // Extract timestamp properly
        let updatedAt = Date.now()
        if (data.updatedAt) {
          if (typeof data.updatedAt.toMillis === 'function') {
            updatedAt = data.updatedAt.toMillis()
          } else if (typeof data.updatedAt === 'number') {
            updatedAt = data.updatedAt
          } else if (data.updatedAt.seconds) {
            updatedAt = data.updatedAt.seconds * 1000
          }
        }
        // Create cache key based on images
        const imagesArray = data.images || (data.image ? [data.image] : [])
        const imagesKey = imagesArray.join('|').slice(0, 100) // Use first 100 chars of URLs
        const cacheKey = `${updatedAt}-${imagesArray.length}-${imagesKey.length}`
        return { 
          id: d.id, 
          ...data,
          updatedAt,
          _cacheKey: cacheKey,
        }
      }) as any)
    })
    return () => unsub()
  }, [])
  return (
    <section className="py-16 px-4 bg-muted">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Venues & Events</h2>
          <p className="text-foreground/70 text-lg">Find the right space and package for your event</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => {
            // Prioritize images array over image field to ensure latest images are shown
            const img = venue.images?.[0] ?? (venue as any).image ?? "/luxury-ballroom.jpg"
            const pkgs = (venue.packages || []).slice(0, 3)
            const extraCount = Math.max(0, (venue.packages?.length || 0) - pkgs.length)
            const capacities = venue.capacities || {}
            const layoutLabels: Record<keyof NonNullable<Venue["capacities"]>, string> = {
              theatre: "Theatre",
              classroom: "Classroom",
              uShape: "U-Shape",
              boardroom: "Boardroom",
            }
            const layoutEntries = Object.entries(capacities)
              .filter(([, value]) => typeof value === "number" && Number(value) > 0)
              .map(([key, value]) => ({
                key,
                label: (layoutLabels as any)[key] ?? key,
                value: Number(value),
              }))
            const layoutLine = layoutEntries.map((layout) => `${layout.label}: ${layout.value}`).join(" • ")
            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="bg-card rounded-lg overflow-hidden shadow-md transition-all duration-300 group border border-border/50 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex flex-col"
              >
                <div className="relative h-48 bg-cover bg-center transition-transform duration-300 group-hover:scale-105 overflow-hidden">
                  <div 
                    key={`venue-preview-img-${venue.id}-${(venue as any)._cacheKey || (venue as any).updatedAt || Date.now()}`}
                    className="w-full h-full bg-cover bg-center" 
                    style={{ backgroundImage: `url('${img}${img !== "/luxury-ballroom.jpg" ? `?v=${(venue as any)._cacheKey || (venue as any).updatedAt || Date.now()}` : ''}')` }} 
                  />
                  {venue.images && venue.images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                      {venue.images.length} photos
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-serif text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{venue.name}</h3>
                  {venue.operatingHours?.start && venue.operatingHours?.end && (
                    <p className="text-xs text-foreground/70 mb-2">Hours: {venue.operatingHours.start} – {venue.operatingHours.end}</p>
                  )}
                  {pkgs.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] uppercase tracking-wide text-primary/80 mb-2 font-semibold">
                        Packages
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pkgs.map((p) => (
                          <span
                            key={p.id}
                            className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm"
                          >
                            {p.name}
                            {typeof p.price === "number" ? ` • KES ${p.price}` : ""}
                            {p.durationHours ? ` • ${p.durationHours}h` : ""}
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/5 text-primary border border-dashed border-primary/40">
                            +{extraCount} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {layoutEntries.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] uppercase tracking-wide text-foreground/70 mb-2 font-semibold">
                        Layout capacities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {layoutEntries.map((layout) => (
                          <div
                            key={layout.key}
                            className="flex items-center gap-1 rounded-md border border-border/70 bg-muted px-2 py-1 text-xs text-foreground/80"
                          >
                            <span className="font-semibold text-foreground">{layout.value}</span>
                            <span>{layout.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-auto pt-4 flex justify-end">
                    <button className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-all group-hover:bg-primary/90 group-hover:scale-105 shadow-md whitespace-nowrap">
                      View Details
                    </button>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
