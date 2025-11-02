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
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Available Rooms</h2>
          <p className="text-foreground/70 text-lg">Discover our available accommodations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Link key={room.id} href={`/rooms/${room.id}`}>
              <div className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-border/50 hover:border-accent/50">
                <div className="relative h-48 bg-cover bg-center overflow-hidden">
                  <div 
                    className="h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{ backgroundImage: `url('${room.image ?? "/luxury-single-room.jpg"}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 right-3">
                    <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-white text-xs font-semibold">{room.rating ?? 5.0}</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors">{room.name}</h3>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-foreground/70 flex items-center gap-1">
                      👥 {room.capacity ?? 1} guest(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div>
                      <span className="font-serif text-2xl font-bold text-accent">KSh {room.price ?? 0}</span>
                      <span className="text-xs text-muted-foreground block">per night</span>
                    </div>
                    <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:scale-105">
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
            className="inline-block bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-all shadow-md hover:shadow-lg hover:scale-105"
          >
            View All Rooms
          </Link>
        </div>
      </div>
    </section>
  )
}
