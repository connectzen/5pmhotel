"use client"

import { useEffect, useRef, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

type GalleryItem = { id: string; url: string; title?: string }

export default function PublicGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const stripRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gallery"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setItems(list as any)
      if ((list as any).length > 0) setSelectedIndex(0)
    })
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center md:text-left">Gallery</h1>
      {items.length > 0 ? (
        <div className="space-y-4 max-w-6xl mx-auto">
          {/* Main viewer */}
          <div className="relative w-full h-[70vh] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={items[selectedIndex]?.url}
              alt={items[selectedIndex]?.title || "Gallery image"}
              className="max-h-full max-w-full object-contain bg-black/5"
            />
            {/* Prev/Next buttons */}
            <button
              aria-label="Previous"
              onClick={() => setSelectedIndex((i) => (i - 1 + items.length) % items.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 md:w-10 md:h-10 grid place-items-center hover:bg-black/70"
            >
              ‹
            </button>
            <button
              aria-label="Next"
              onClick={() => setSelectedIndex((i) => (i + 1) % items.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 md:w-10 md:h-10 grid place-items-center hover:bg-black/70"
            >
              ›
            </button>
          </div>

          {/* Thumbnail strip with scroll arrows */}
          <div className="relative max-w-6xl mx-auto">
            <button
              aria-label="Scroll left"
              onClick={() => stripRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur border rounded-full w-8 h-8 grid place-items-center shadow"
            >
              ‹
            </button>
            <div
              ref={stripRef}
              className="flex gap-2 overflow-x-auto no-scrollbar px-10 py-2 items-center"
            >
              {items.map((it, idx) => (
                <button
                  key={it.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`shrink-0 border rounded-md overflow-hidden ${idx === selectedIndex ? "ring-2 ring-accent" : ""}`}
                >
                  <img src={it.url} alt={it.title || "thumb"} className="w-28 h-20 md:w-32 md:h-24 object-cover" />
                </button>
              ))}
            </div>
            <button
              aria-label="Scroll right"
              onClick={() => stripRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur border rounded-full w-8 h-8 grid place-items-center shadow"
            >
              ›
            </button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">No images yet.</p>
      )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
 
