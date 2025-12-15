"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Star } from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

type RoomDoc = {
  id: string
  name: string
  image?: string
  images?: string[]
  price: number
  capacity: number
  rating?: number
  type?: string
  description?: string
}

const computeBaseRate = (ratePlans?: any) => {
  if (!ratePlans) return 0
  // Prefer Bed Only plan if present
  const bedOnly = (ratePlans as any).bedOnly
  if (bedOnly && typeof bedOnly.amount === "number" && bedOnly.amount > 0) {
    return bedOnly.amount
  }

  let min = Number.POSITIVE_INFINITY
  Object.values(ratePlans as any).forEach((plan: any) => {
    if (!plan) return
    if (typeof plan.amount === "number" && plan.amount > 0) {
      min = Math.min(min, plan.amount)
    }
    // Backwards compatibility for legacy docs
    ;["single", "double", "twin"].forEach((occ) => {
      const value = plan?.[occ]
      if (typeof value === "number" && value > 0) {
        min = Math.min(min, value)
      }
    })
  })
  return Number.isFinite(min) ? min : 0
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomDoc[]>([])
  const [selectedType, setSelectedType] = useState("all")
  const [priceRange, setPriceRange] = useState(0)
  const [guestCount, setGuestCount] = useState("all")

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data() as any
        const baseRate = computeBaseRate(data.ratePlans)
        return {
          id: d.id,
          name: data.name,
          image: data.image,
          images: data.images,
          price: Number(data.price ?? baseRate ?? 0),
          capacity: Number(data.capacity ?? 1),
          rating: Number(data.rating ?? 5),
          type: data.type ?? "room",
          description: data.description ?? "",
        } as RoomDoc
      })
      setRooms(list)
      // Default slider at max price to show all rooms initially
      const maxP = list.reduce((m, r) => Math.max(m, r.price || 0), 0)
      if (maxP > 0) setPriceRange(maxP)
    })
    return () => unsub()
  }, [])

  const maxPrice = useMemo(() => rooms.reduce((m, r) => Math.max(m, r.price || 0), 0), [rooms])
  const minPrice = useMemo(() => {
    if (!rooms.length) return 0
    return rooms.reduce((m, r) => Math.min(m, r.price || 0), rooms[0]?.price || 0)
  }, [rooms])
  
  // Get unique room types dynamically from rooms in database
  // Use room.name directly since room names represent the actual room types (e.g., "triple room", "tween room")
  // Only use the type field if it's actually different from "room" (the default value)
  const availableRoomTypes = useMemo(() => {
    const types = new Set<string>()
    rooms.forEach((room) => {
      // Use type field only if it exists and is not the default "room" value, otherwise use room name
      const roomType = (room.type && room.type.trim() && room.type.trim().toLowerCase() !== "room") 
        ? room.type.trim() 
        : (room.name ? room.name.trim() : null)
      if (roomType) {
        types.add(roomType)
      }
    })
    return Array.from(types).sort()
  }, [rooms])
  
  const filteredRooms = rooms.filter((room) => {
    // Match by type field if it's not "room" default, otherwise match by name
    const roomType = (room.type && room.type.trim() && room.type.trim().toLowerCase() !== "room")
      ? room.type.trim()
      : (room.name ? room.name.trim() : "")
    const typeMatch = selectedType === "all" || roomType === selectedType
    const priceMatch = room.price <= priceRange
    const guestMatch = guestCount === "all" || room.capacity === Number.parseInt(guestCount)
    return typeMatch && priceMatch && guestMatch
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">Our Rooms</h1>
            <p className="text-lg opacity-90">Discover our collection of luxurious accommodations</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg p-6 shadow-md sticky top-20">
                <h3 className="font-serif text-xl font-bold text-primary mb-6">Filters</h3>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-foreground mb-3">Room Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="all">All Types</option>
                    {availableRoomTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-foreground mb-3">Max Price: KSh {priceRange}</label>
                  <input
                    type="range"
                    min={String(minPrice || 0)}
                    max={String(maxPrice || 0)}
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number.parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Guests</label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="all">All Capacities</option>
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRooms.map((room) => (
                  <Link key={room.id} href={`/rooms/${room.id}`}>
                    <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer h-full">
                      <div className="h-64 bg-cover bg-center" style={{ backgroundImage: `url('${room.image ?? room.images?.[0] ?? "/luxury-single-room.jpg"}')` }} />
                      <div className="p-6">
                        <h3 className="font-serif text-2xl font-bold text-primary mb-2">{room.name}</h3>
                        <p className="text-foreground/70 text-sm mb-4">{room.description}</p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-foreground/70">{room.capacity} guest(s)</span>
                          <div className="flex items-center gap-1">
                            <Star size={16} className="fill-accent text-accent" />
                            <span className="text-sm font-semibold">{room.rating}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-3xl font-bold text-accent">KSh {room.price}</span>
                          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredRooms.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-foreground/70 text-lg">
                    No rooms match your filters. Please try adjusting your criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
