"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

type BlogPost = {
  id: string
  title: string
  slug: string
  cover?: string
  contentHTML: string
  createdAt: string
}

export default function PublicBlogPost() {
  const params = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)

  useEffect(() => {
    const all = JSON.parse(localStorage.getItem("blogPosts") || "[]") as BlogPost[]
    const found = all.find((p) => p.slug === (params?.slug as string)) || null
    setPost(found)
  }, [params])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="max-w-3xl mx-auto px-4 py-10">
          {post ? (
            <article>
              <h1 className="font-serif text-4xl font-bold text-primary mb-4">{post.title}</h1>
              <p className="text-sm text-muted-foreground mb-6">{new Date(post.createdAt).toLocaleDateString()}</p>
              {post.cover && <img src={post.cover} alt="cover" className="w-full rounded-lg mb-6" />}
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.contentHTML }} />
            </article>
          ) : (
            <p className="text-center text-muted-foreground py-20">Post not found.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}


