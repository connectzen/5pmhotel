"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Users, Zap } from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CreateEvent } from "@/components/home/create-event"

const staticVenues = [
  {
    id: 1,
    name: "ALBA Ballroom",
    image: "/luxury-ballroom.jpg",
    capacity: 500,
    setupStyles: ["Theatre", "Classroom", "U-Shape", "Boardroom"],
    description: "Grand ballroom perfect for large celebrations and corporate events",
  },
  {
    id: 2,
    name: "ZORA Conference",
    image: "/conference-room.jpg",
    capacity: 200,
    setupStyles: ["Classroom", "U-Shape", "Boardroom"],
    description: "Modern conference space with state-of-the-art AV equipment",
  },
  {
    id: 3,
    name: "TROPICA Garden",
    image: "/garden-venue.jpg",
    capacity: 300,
    setupStyles: ["Theatre", "Cocktail"],
    description: "Lush garden setting ideal for outdoor celebrations",
  },
  {
    id: 4,
    name: "SUNSET Terrace",
    image: "/terrace-venue.jpg",
    capacity: 150,
    setupStyles: ["Cocktail", "Banquet"],
    description: "Scenic terrace with panoramic views",
  },
  {
    id: 5,
    name: "ZENITH Lounge",
    image: "/placeholder.svg?key=zenith",
    capacity: 100,
    setupStyles: ["Cocktail", "Intimate"],
    description: "Intimate lounge perfect for private events",
  },
  {
    id: 6,
    name: "ECLIPSE Hall",
    image: "/placeholder.svg?key=eclipse",
    capacity: 250,
    setupStyles: ["Theatre", "Classroom", "Banquet"],
    description: "Versatile hall suitable for various event types",
  },
  {
    id: 7,
    name: "SOLANA Pavilion",
    image: "/placeholder.svg?key=solana",
    capacity: 180,
    setupStyles: ["Cocktail", "Banquet"],
    description: "Modern pavilion with flexible layout options",
  },
  {
    id: 8,
    name: "BISTRO Restaurant",
    image: "/placeholder.svg?key=bistro",
    capacity: 80,
    setupStyles: ["Banquet", "Intimate"],
    description: "Elegant restaurant space for intimate dining events",
  },
  {
    id: 9,
    name: "SAHARA Tent",
    image: "/placeholder.svg?key=sahara",
    capacity: 400,
    setupStyles: ["Theatre", "Cocktail"],
    description: "Spacious tent venue for outdoor events",
  },
  {
    id: 10,
    name: "AURORA Garden",
    image: "/placeholder.svg?key=aurora",
    capacity: 200,
    setupStyles: ["Cocktail", "Banquet"],
    description: "Beautiful garden space with natural lighting",
  },
]

// Pull only real venue data – no static fallbacks

export default function VenuesPage() {
  const [selectedCapacity, setSelectedCapacity] = useState("all")
  const [selectedSetup, setSelectedSetup] = useState("all")
  const [venues, setVenues] = useState<any[]>([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "venues"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setVenues(list)
    })
    return () => unsub()
  }, [])

  const filteredVenues = useMemo(() => venues.filter((venue: any) => {
    const capacityMatch =
      selectedCapacity === "all" ||
      (selectedCapacity === "small" && venue.capacity <= 150) ||
      (selectedCapacity === "medium" && venue.capacity > 150 && venue.capacity <= 300) ||
      (selectedCapacity === "large" && venue.capacity > 300)

    const setupMatch = selectedSetup === "all" || (venue.setupStyles || []).includes(selectedSetup)

    return capacityMatch && setupMatch
  }), [venues, selectedCapacity, selectedSetup])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">Venues & Events</h1>
            <p className="text-lg opacity-90">Host your perfect event in our stunning spaces</p>
          </div>
        </section>

        {/* Event planning form */}
        <CreateEvent />

        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Removed static Event Packages to avoid dummy data */}

          {/* Filters */}
          <div className="mb-8">
            <h2 className="font-serif text-3xl font-bold text-primary mb-6">Our Venues</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Capacity</label>
                <select
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">All Capacities</option>
                  <option value="small">Small (up to 150)</option>
                  <option value="medium">Medium (150-300)</option>
                  <option value="large">Large (300+)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Setup Style</label>
                <select
                  value={selectedSetup}
                  onChange={(e) => setSelectedSetup(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">All Styles</option>
                  <option value="Theatre">Theatre</option>
                  <option value="Classroom">Classroom</option>
                  <option value="U-Shape">U-Shape</option>
                  <option value="Boardroom">Boardroom</option>
                  <option value="Cocktail">Cocktail</option>
                  <option value="Banquet">Banquet</option>
                </select>
              </div>
            </div>
          </div>

          {/* Venues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue: any) => (
              <Link key={venue.id} href={`/venues/${venue.id}`}>
                <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col hover:scale-105 hover:-translate-y-1 group">
                  <div className="h-48 bg-cover bg-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundImage: `url('${venue.image ?? venue.images?.[0] ?? "/luxury-ballroom.jpg"}')` }} />
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-serif text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{venue.name}</h3>
                    <p className="text-foreground/70 text-sm mb-4 flex-1">{venue.description}</p>
                    <div className="flex items-center gap-4 mb-4 text-sm text-foreground/70">
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{venue.capacity} guests</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap size={16} />
                        <span>{(venue.setupStyles || []).length} setups</span>
                      </div>
                    </div>
                    <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105">
                      View Details
                    </button>
                  </div>
                </div>
              </Link>
            ))}
            {filteredVenues.length === 0 && (
              <div className="col-span-full text-center text-foreground/70 py-12">
                No venues available yet. Please check back later.
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
