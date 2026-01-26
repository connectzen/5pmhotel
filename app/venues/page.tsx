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
      const list = snap.docs.map((d) => {
        const data = d.data() as any
        const caps = data.capacities || {}
        const theatre = Number(caps.theatre || 0)
        const classroom = Number(caps.classroom || 0)
        const uShape = Number(caps.uShape || 0)
        const boardroom = Number(caps.boardroom || 0)
        const maxCapacity = Math.max(theatre, classroom, uShape, boardroom, 0)
        const availableLayouts: string[] = []
        if (theatre > 0) availableLayouts.push("Theatre")
        if (classroom > 0) availableLayouts.push("Classroom")
        if (uShape > 0) availableLayouts.push("U-Shape")
        if (boardroom > 0) availableLayouts.push("Boardroom")
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
        // Create a cache key based on images array to force reload when images change
        const imagesArray = data.images || (data.image ? [data.image] : [])
        const imagesKey = imagesArray.join('|').slice(0, 100) // Use first 100 chars of URLs
        const cacheKey = `${updatedAt}-${imagesArray.length}-${imagesKey.length}`
        return {
          id: d.id,
          ...data,
          maxCapacity,
          availableLayouts,
          updatedAt,
          _cacheKey: cacheKey, // Internal cache key for forcing image reloads
        }
      })
      setVenues(list)
    })
    return () => unsub()
  }, [])

  const filteredVenues = useMemo(() => venues, [venues])

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

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-bold text-primary mb-6">Our Venues</h2>
          </div>

          {/* Venues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue: any) => {
              const capacities = venue.capacities || {}
              const layoutEntries = [
                { key: "theatre", label: "Theatre", value: capacities.theatre },
                { key: "classroom", label: "Classroom", value: capacities.classroom },
                { key: "uShape", label: "U-Shape", value: capacities.uShape },
                { key: "boardroom", label: "Boardroom", value: capacities.boardroom },
              ].filter((layout) => typeof layout.value === "number" && layout.value > 0)
              const layoutLine = layoutEntries.map((layout) => `${layout.label}: ${layout.value}`).join(" • ")

              return (
                <Link key={venue.id} href={`/venues/${venue.id}`}>
                  <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col hover:scale-105 hover:-translate-y-1 group">
                    {(() => {
                      // Prioritize images array over image field to ensure latest images are shown
                      const displayImage = venue.images?.[0] ?? venue.image ?? "/luxury-ballroom.jpg"
                      const cacheKey = (venue as any)._cacheKey || venue.updatedAt || Date.now()
                      const hasMultipleImages = venue.images && venue.images.length > 1
                      return (
                        <div className="relative h-48 bg-cover bg-center transition-transform duration-300 group-hover:scale-110 overflow-hidden">
                          <div 
                            key={`venue-img-${venue.id}-${cacheKey}`}
                            className="w-full h-full bg-cover bg-center" 
                            style={{ backgroundImage: `url('${displayImage}${displayImage !== "/luxury-ballroom.jpg" ? `?v=${cacheKey}` : ''}')` }} 
                          />
                          {hasMultipleImages && (
                            <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                              {venue.images.length} photos
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-serif text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{venue.name}</h3>
                      <p className="text-foreground/70 text-sm mb-4 flex-1">{venue.description}</p>
                      <div className="flex items-center gap-4 mb-4 text-sm text-foreground/70">
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          <span>{Number(venue.maxCapacity || 0)} guests</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap size={16} />
                          <span>{(venue.availableLayouts || []).length} layouts</span>
                        </div>
                      </div>
                      {layoutEntries.length > 0 && (
                        <div className="mb-4 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap pr-1">
                          <span>{layoutLine}</span>
                        </div>
                      )}
                      {(venue.packages && venue.packages.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {venue.packages.slice(0, 3).map((p: any) => (
                            <span key={p.id} className="text-xs px-2 py-1 rounded-full border border-border bg-background">
                              {p.name}{typeof p.price === "number" ? ` • KES ${p.price}` : ""}{p.durationHours ? ` • ${p.durationHours}h` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                      <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105">
                        View Details
                      </button>
                    </div>
                  </div>
                </Link>
              )
            })}
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

