"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"

type GalleryItem = { id: string; url: string; title?: string }

export function GalleryPreview() {
  const [items, setItems] = useState<GalleryItem[]>([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gallery"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        .slice(0, 6) // Show only first 6 items
      setItems(list as any)
    })
    return () => unsub()
  }, [])

  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl font-bold text-primary">Gallery</h2>
          <Button asChild variant="outline">
            <Link href="/gallery">View All</Link>
          </Button>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href="/gallery"
                className="group relative aspect-square overflow-hidden rounded-lg border border-border hover:shadow-lg transition-all duration-300"
              >
                <img
                  src={item.url}
                  alt={item.title || "Gallery image"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white font-medium">
                      {item.title}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No gallery images yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}

