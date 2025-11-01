"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

type Room = { id: string; name: string; image?: string; price?: number; capacity?: number; rating?: number }

export function FeaturedRooms() {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"), limit(4))
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any)
    })
    return () => unsub()
  }, [])
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Featured Rooms</h2>
          <p className="text-foreground/70 text-lg">Discover our most popular accommodations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`}>
              <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer">
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url('${room.image ?? "/luxury-single-room.jpg"}')` }} />
                <div className="p-4">
                  <h3 className="font-serif text-xl font-bold text-primary mb-2">{room.name}</h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-foreground/70">{room.capacity ?? 1} guest(s)</span>
                    <div className="flex items-center gap-1">
                      <Star size={16} className="fill-accent text-accent" />
                      <span className="text-sm font-semibold">{room.rating ?? 5.0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-2xl font-bold text-accent">KSh {room.price ?? 0}</span>
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                      Book
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/rooms"
            className="inline-block bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            View All Rooms
          </Link>
        </div>
      </div>
    </section>
  )
}
