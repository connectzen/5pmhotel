import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-6xl font-bold text-primary mb-4">404</h1>
          <p className="text-2xl font-semibold text-foreground mb-4">Page Not Found</p>
          <p className="text-foreground/70 text-lg mb-8">
            Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
          <Link
            href="/"
            className="inline-block bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Go Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
