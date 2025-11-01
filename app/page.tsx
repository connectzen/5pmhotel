import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/home/hero-section"
import { QuickSearch } from "@/components/home/quick-search"
import { FeaturedRooms } from "@/components/home/featured-rooms"
import { VenuesPreview } from "@/components/home/venues-preview"
import { Testimonials } from "@/components/home/testimonials"
import { LocationMap } from "@/components/home/location-map"
import { CreateEvent } from "@/components/home/create-event"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <QuickSearch />
        <FeaturedRooms />
        <VenuesPreview />
        <CreateEvent />
        <Testimonials />
        <LocationMap />
      </main>
      <Footer />
    </div>
  )
}
