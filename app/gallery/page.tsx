"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { X } from "lucide-react"

const galleryImages = [
  { id: 1, title: "Luxury Lobby", category: "facilities", image: "/luxury-hotel-lobby.jpg" },
  { id: 2, title: "Deluxe Single Room", category: "rooms", image: "/luxury-single-room.jpg" },
  { id: 3, title: "Twin Room", category: "rooms", image: "/luxury-twin-room.jpg" },
  { id: 4, title: "Convertible Suite", category: "rooms", image: "/luxury-suite.jpg" },
  { id: 5, title: "Triple Room", category: "rooms", image: "/luxury-triple-room.jpg" },
  { id: 6, title: "ALBA Ballroom", category: "venues", image: "/luxury-ballroom.jpg" },
  { id: 7, title: "ZORA Conference", category: "venues", image: "/conference-room.jpg" },
  { id: 8, title: "TROPICA Garden", category: "venues", image: "/garden-venue.jpg" },
  { id: 9, title: "SUNSET Terrace", category: "venues", image: "/terrace-venue.jpg" },
]

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<(typeof galleryImages)[0] | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredImages =
    selectedCategory === "all" ? galleryImages : galleryImages.filter((img) => img.category === selectedCategory)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">Gallery</h1>
            <p className="text-lg opacity-90">Explore the beauty of DZ 5PM Hotel</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-4 mb-12 justify-center">
            {["all", "rooms", "venues", "facilities"].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  selectedCategory === category
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="cursor-pointer group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition"
              >
                <div
                  className="h-64 bg-cover bg-center group-hover:scale-110 transition duration-300"
                  style={{ backgroundImage: `url('${image.image}')` }}
                />
                <div className="p-4 bg-card">
                  <h3 className="font-semibold text-primary">{image.title}</h3>
                  <p className="text-sm text-foreground/70 capitalize">{image.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
              >
                <X size={32} />
              </button>
              <div
                className="h-96 md:h-screen bg-cover bg-center rounded-lg"
                style={{ backgroundImage: `url('${selectedImage.image}')` }}
              />
              <div className="mt-4 text-center text-white">
                <h3 className="font-serif text-2xl font-bold mb-2">{selectedImage.title}</h3>
                <p className="text-gray-300 capitalize">{selectedImage.category}</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
