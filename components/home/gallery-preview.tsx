"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

type GalleryItem = { id: string; url: string; title?: string }

export function GalleryPreview() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gallery"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setItems(list as any)
    })
    return () => unsub()
  }, [])

  const showPrev = () => {
    if (activeIndex === null || items.length === 0) return
    setActiveIndex((activeIndex - 1 + items.length) % items.length)
  }

  const showNext = () => {
    if (activeIndex === null || items.length === 0) return
    setActiveIndex((activeIndex + 1) % items.length)
  }

  const activeItem = activeIndex !== null ? items[activeIndex] : null

  return (
    <section id="gallery" className="py-16 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl font-bold text-primary">Gallery</h2>
          <p className="text-sm text-muted-foreground hidden md:block">
            Tap any image to view it full screen.
          </p>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(items.findIndex((it) => it.id === item.id))}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border hover:shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <img
                  src={item.url}
                  alt={item.title || "Gallery image"}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white font-medium">
                      {item.title}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No gallery images yet.</p>
          </div>
        )}
      </div>

      <Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent className="max-w-6xl w-[95vw] md:w-[85vw] bg-black/90 border-none p-0 md:p-6 text-white">
          <VisuallyHidden>
            <DialogTitle>{activeItem?.title ?? "Gallery image preview"}</DialogTitle>
          </VisuallyHidden>
          {activeItem && (
            <div className="relative flex flex-col items-center gap-4">
              <button
                onClick={() => setActiveIndex(null)}
                className="absolute top-3 right-3 z-20 rounded-full bg-white/10 hover:bg-white/20 p-2 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="relative w-full max-h-[85vh] flex items-center justify-center bg-black/60 rounded-lg overflow-hidden">
                <img
                  src={activeItem.url}
                  alt={activeItem.title || "Gallery image"}
                  className="max-h-[80vh] max-w-full w-auto object-contain mx-auto"
                  loading="lazy"
                  decoding="async"
                />
                {items.length > 1 && (
                  <>
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-2 transition"
                      onClick={showPrev}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-2 transition"
                      onClick={showNext}
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              {activeItem.title && (
                <p className="text-sm text-center text-muted-foreground/80 px-6">
                  {activeItem.title}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

