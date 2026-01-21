"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

type Room = { id: string; name: string; image?: string; images?: string[]; price?: number; capacity?: number; rating?: number }
type Venue = { id: string; name: string; image?: string; images?: string[]; price?: number; capacity?: number }

type UnifiedItem = {
  id: string
  type: "room" | "venue"
  name: string
  image?: string
  images?: string[]
  price?: number
  capacity?: number
  rating?: number
}

export function ListingsUnified() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [venues, setVenues] = useState<Venue[]>([])

  useEffect(() => {
    const rq = query(collection(db, "rooms"), orderBy("createdAt", "desc"))
    const ru = onSnapshot(rq, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any)
    })
    const vq = query(collection(db, "venues"), orderBy("createdAt", "desc"))
    const vu = onSnapshot(vq, (snap) => {
      setVenues(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any)
    })
    return () => {
      ru()
      vu()
    }
  }, [])

  const items: UnifiedItem[] = useMemo(() => {
    const r: UnifiedItem[] = rooms.map((r) => ({
      id: `room-${r.id}`,
      type: "room",
      name: r.name,
      image: (r as any).image ?? r.images?.[0],
      images: r.images,
      price: r.price,
      capacity: r.capacity,
      rating: r.rating,
    }))
    const v: UnifiedItem[] = venues.map((v) => ({
      id: `venue-${v.id}`,
      type: "venue",
      name: v.name,
      image: (v as any).image ?? v.images?.[0],
      images: v.images,
      price: (v as any).price,
      capacity: v.capacity,
    }))
    // Already ordered individually by createdAt desc; merge maintaining relative order by type groups
    // For simplicity, interleave by alternating chunks
    const merged: UnifiedItem[] = []
    const max = Math.max(r.length, v.length)
    for (let i = 0; i < max; i++) {
      if (i < r.length) merged.push(r[i])
      if (i < v.length) merged.push(v[i])
    }
    return merged
  }, [rooms, venues])

  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Rooms & Venues</h2>
          <p className="text-foreground/70 text-lg">Browse everything in one place</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it) => (
            <div key={it.id} className="bg-card rounded-xl overflow-hidden shadow-md transition-all duration-300 group border border-border/50">
              <div
                className="relative h-48 bg-cover bg-center"
                style={{ backgroundImage: `url('${it.image ?? (it.type === "room" ? "/luxury-single-room.jpg" : "/luxury-ballroom.jpg")}')` }}
              >
                {it.images && Array.isArray(it.images) && it.images.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {it.images.length} photos
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif text-xl font-bold text-primary">{it.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${it.type === "room" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                    {it.type === "room" ? "Room" : "Venue"}
                  </span>
                </div>
                <div className="text-sm text-foreground/70 flex items-center justify-between">
                  <span>Capacity: {it.capacity ?? 0}</span>
                  {typeof it.price === "number" && <span className="font-medium">KES {it.price}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


