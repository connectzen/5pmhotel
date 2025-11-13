"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type GalleryItem = {
  id?: string
  url: string
  title?: string
  tags?: string[]
  createdAt?: any
}

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gallery"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setItems(list as any)
    })
    return () => unsub()
  }, [])

  async function handleUpload() {
    if (!files || files.length === 0) {
      toast.error("Choose one or more images")
      return
    }
    setUploading(true)
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const uploadedUrls: string[] = []
      for (const f of Array.from(files)) {
        const r = ref(storage, `gallery/${Date.now()}-${f.name}`)
        await uploadBytes(r, f)
        const url = await getDownloadURL(r)
        uploadedUrls.push(url)
        await addDoc(collection(db, "gallery"), {
          url,
          title: title || null,
          tags: tagList,
          createdAt: serverTimestamp(),
        })
      }
      setTitle("")
      setTags("")
      setFiles(null)
      setOpen(false)
      toast.success(`${uploadedUrls.length} image(s) added to gallery`)
    } catch (e) {
      toast.error("Failed to upload")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <Button onClick={() => setOpen(true)}>Add Images</Button>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it) => (
              <Card key={it.id} className="overflow-hidden group relative">
                <img
                  src={it.url}
                  alt={it.title || "Gallery image"}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      try {
                        // Try delete storage object via public URL
                        const r = ref(storage, it.url as any)
                        await deleteObject(r).catch(() => {})
                        await deleteDoc(doc(db, "gallery", it.id!))
                        toast.success("Deleted")
                      } catch {
                        toast.error("Delete failed")
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
            {items.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground text-center py-12">
                No images uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="w-[92vw] max-w-xl p-5 space-y-4 bg-background rounded-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add Images</h2>
              <button onClick={() => setOpen(false)} className="text-sm opacity-70 hover:opacity-100">Close</button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm">Title (optional)</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 h-10 bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Tags (comma separated, optional)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded border px-3 h-10 bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Images</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}


