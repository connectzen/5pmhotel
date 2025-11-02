"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

type Venue = { id: string; name: string; image?: string; capacity?: number }

export function VenuesPreview() {
  const [venues, setVenues] = useState<Venue[]>([])

  useEffect(() => {
    const q = query(collection(db, "venues"), orderBy("createdAt", "desc"), limit(4))
    const unsub = onSnapshot(q, (snap) => {
      setVenues(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any)
    })
    return () => unsub()
  }, [])
  return (
    <section className="py-16 px-4 bg-muted">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Venues & Events</h2>
          <p className="text-foreground/70 text-lg">Host your perfect event in our stunning spaces</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {venues.map((venue) => (
            <Link key={venue.id} href={`/venues/${venue.id}`}>
              <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="relative h-48 bg-cover bg-center overflow-hidden">
                  <div 
                    className="h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{ backgroundImage: `url('${venue.image ?? "/luxury-ballroom.jpg"}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-xl font-bold text-primary mb-2">{venue.name}</h3>
                  <p className="text-sm text-foreground/70">Capacity: {venue.capacity ?? 0} guests</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/venues"
            className="inline-block bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Explore All Venues
          </Link>
        </div>
      </div>
    </section>
  )
}
