"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

type Room = { id: string; name: string; image?: string; price?: number; capacity?: number; rating?: number }

export function FeaturedRooms() {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    // Load all rooms for homepage
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any)
    })
    return () => unsub()
  }, [])
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Available Rooms</h2>
          <p className="text-foreground/70 text-lg">Discover our available accommodations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="bg-card rounded-xl overflow-hidden shadow-lg transition-all duration-300 group border border-border/50 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex flex-col"
            >
              <div className="relative h-48 bg-cover bg-center overflow-hidden transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url('${(room as any).image ?? (room as any).images?.[0] ?? "/luxury-single-room.jpg"}')` }}>
                <div className="absolute top-3 right-3">
                  <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-white text-xs font-semibold">{room.rating ?? 5.0}</span>
                  </div>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-serif text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors">{room.name}</h3>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-foreground/70 flex items-center gap-1">
                    👥 {room.capacity ?? 1} guest(s)
                  </span>
                </div>
                <div className="mt-auto pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-serif text-2xl font-bold text-accent">KSh {room.price ?? 0}</span>
                      <span className="text-xs text-muted-foreground block">per night</span>
                    </div>
                    <button className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold transition-all group-hover:bg-primary/90 group-hover:scale-105 shadow-md whitespace-nowrap">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
