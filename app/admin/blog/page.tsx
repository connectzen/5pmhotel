"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type BlogPost = {
  id?: string
  title: string
  excerpt?: string
  content: string
  coverUrl?: string
  images?: string[]
  createdAt?: any
}

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string | null>(null)
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blogs"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setPosts(list as any)
    })
    return () => unsub()
  }, [])

  async function ensureDraftId(): Promise<string> {
    if (draftId) return draftId
    const docRef = doc(collection(db, "blogs"))
    setDraftId(docRef.id)
    return docRef.id
  }

  async function handleUploadSelected() {
    if (!coverFile && (!imageFiles || imageFiles.length === 0)) {
      toast("Select a cover or images to upload first")
      return
    }
    setUploading(true)
    try {
      const blogId = await ensureDraftId()
      // Upload cover
      if (coverFile && !uploadedCoverUrl) {
        const r = ref(storage, `blogs/${blogId}/cover-${Date.now()}-${coverFile.name}`)
        await uploadBytes(r, coverFile)
        const url = await getDownloadURL(r)
        setUploadedCoverUrl(url)
      }
      // Upload additional images
      const newUrls: string[] = []
      if (imageFiles && imageFiles.length) {
        for (const f of Array.from(imageFiles)) {
          const r = ref(storage, `blogs/${blogId}/images/${Date.now()}-${f.name}`)
          await uploadBytes(r, f)
          const url = await getDownloadURL(r)
          newUrls.push(url)
        }
      }
      if (newUrls.length) setUploadedImageUrls((prev) => [...prev, ...newUrls])
      toast.success("Files uploaded. You can copy URLs below and paste into content.")
    } catch (e) {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    setSaving(true)
    try {
      // Ensure uploads exist or perform upload on create
      const blogId = await ensureDraftId()
      let coverUrl = uploadedCoverUrl || null
      if (!coverUrl && coverFile) {
        const r = ref(storage, `blogs/${blogId}/cover-${Date.now()}-${coverFile.name}`)
        await uploadBytes(r, coverFile)
        coverUrl = await getDownloadURL(r)
      }
      let imageUrls = uploadedImageUrls
      if ((!imageUrls || imageUrls.length === 0) && imageFiles && imageFiles.length) {
        const newUrls: string[] = []
        for (const f of Array.from(imageFiles)) {
          const r = ref(storage, `blogs/${blogId}/images/${Date.now()}-${f.name}`)
          await uploadBytes(r, f)
          const url = await getDownloadURL(r)
          newUrls.push(url)
        }
        imageUrls = newUrls
      }

      await setDoc(doc(db, "blogs", blogId), {
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim(),
        coverUrl: coverUrl || null,
        images: imageUrls || [],
        createdAt: serverTimestamp(),
      })

      setTitle("")
      setExcerpt("")
      setContent("")
      setCoverFile(null)
      setImageFiles(null)
      setUploadedCoverUrl(null)
      setUploadedImageUrls([])
      setDraftId(null)
      setOpen(false)
      toast.success("Blog created")
    } catch (e) {
      toast.error("Failed to create blog")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blogs</h1>
        <Button onClick={() => setOpen(true)}>Create Blog</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((p) => (
          <Card key={p.id} className="p-4 space-y-3">
            {p.coverUrl ? (
              <img src={p.coverUrl} alt={p.title} className="w-full h-40 object-cover rounded" />
            ) : null}
            <div>
              <h3 className="font-semibold text-lg">{p.title}</h3>
              {p.excerpt ? <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p> : null}
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-y-auto">
          <Card className="w-full max-w-2xl p-6 space-y-4 bg-background max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Blog</h2>
              <button onClick={() => setOpen(false)} className="text-sm opacity-70 hover:opacity-100">Close</button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 h-10 bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Excerpt (optional)</label>
                <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="w-full rounded border px-3 h-10 bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Content</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="w-full rounded border p-3 bg-background" />
                <p className="text-xs text-muted-foreground">Tip: After uploading images, copy any URL below and paste where you want in the content.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm">Cover image (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Additional images (optional, multiple)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(e.target.files)} />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleUploadSelected} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload files (get URLs)"}
                </Button>
              </div>
              {(uploadedCoverUrl || uploadedImageUrls.length > 0) && (
                <div className="space-y-2 border rounded p-3">
                  <p className="text-sm font-medium">Uploaded URLs (click to copy)</p>
                  {uploadedCoverUrl && (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(uploadedCoverUrl!); toast.success("Cover URL copied") }}
                      className="block w-full text-left text-xs underline truncate"
                      title={uploadedCoverUrl}
                    >
                      {uploadedCoverUrl}
                    </button>
                  )}
                  {uploadedImageUrls.map((u, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(u); toast.success("Image URL copied") }}
                      className="block w-full text-left text-xs underline truncate"
                      title={u}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}


