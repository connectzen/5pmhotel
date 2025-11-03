"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"
import { Card } from "@/components/ui/card"

type BlogPost = {
  id: string
  title: string
  excerpt?: string
  coverUrl?: string
}

export default function BlogPublicPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blogs"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      setPosts(list as any)
    })
    return () => unsub()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Blog</h1>
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
    </div>
  )
}


