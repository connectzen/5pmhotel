import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Award, Users, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">About 5PM Hotel</h1>
            <p className="text-lg opacity-90">Discover our story and commitment to excellence</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="mb-16">
            <div
              className="h-96 bg-cover bg-center rounded-lg shadow-lg mb-8"
              style={{ backgroundImage: 'url("/luxury-hotel-lobby.jpg")' }}
            />
            <div className="prose prose-lg max-w-none">
              <h2 className="font-serif text-3xl font-bold text-primary mb-4">Our Story</h2>
              <p className="text-foreground/80 leading-relaxed mb-4">
                5PM Hotel stands as a beacon of luxury and hospitality in the heart of the city. Founded with a
                vision to create an unforgettable experience for every guest, we have been dedicated to excellence for
                over two decades.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                Our commitment to providing world-class service, combined with our stunning facilities and prime
                location, makes us the preferred choice for travelers and event organizers alike.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="font-serif text-3xl font-bold text-primary mb-8">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card rounded-lg p-8 shadow-md">
                <Award size={40} className="text-accent mb-4" />
                <h3 className="font-serif text-xl font-bold text-primary mb-3">Excellence</h3>
                <p className="text-foreground/70">
                  We strive for excellence in every aspect of our service, from room amenities to guest interactions.
                </p>
              </div>
              <div className="bg-card rounded-lg p-8 shadow-md">
                <Users size={40} className="text-accent mb-4" />
                <h3 className="font-serif text-xl font-bold text-primary mb-3">Hospitality</h3>
                <p className="text-foreground/70">
                  Our team is dedicated to making every guest feel welcome and valued during their stay.
                </p>
              </div>
              <div className="bg-card rounded-lg p-8 shadow-md">
                <Globe size={40} className="text-accent mb-4" />
                <h3 className="font-serif text-xl font-bold text-primary mb-3">Sustainability</h3>
                <p className="text-foreground/70">
                  We are committed to environmental responsibility and sustainable practices in all operations.
                </p>
              </div>
            </div>
          </div>

          {/* Services Overview */}
          <div className="mb-16">
            <h2 className="font-serif text-3xl font-bold text-primary mb-8">Our Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-muted rounded-lg p-8">
                <h3 className="font-serif text-2xl font-bold text-primary mb-4">Accommodation</h3>
                <p className="text-foreground/70 mb-4">
                  Choose from our diverse range of luxurious rooms and suites, each designed with comfort and elegance
                  in mind.
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• Premium bedding and linens</li>
                  <li>• Modern amenities and technology</li>
                  <li>• 24/7 room service</li>
                  <li>• Personalized concierge service</li>
                </ul>
              </div>
              <div className="bg-muted rounded-lg p-8">
                <h3 className="font-serif text-2xl font-bold text-primary mb-4">Events & Venues</h3>
                <p className="text-foreground/70 mb-4">
                  Host your perfect event in our stunning venues, supported by our experienced event planning team.
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• Multiple venue options</li>
                  <li>• Professional event coordination</li>
                  <li>• Catering services</li>
                  <li>• AV and technical support</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div>
            <h2 className="font-serif text-3xl font-bold text-primary mb-8">Our Team</h2>
            <p className="text-foreground/70 text-lg leading-relaxed mb-8">
              Our dedicated team of hospitality professionals is committed to ensuring your stay is exceptional. With
              years of experience in the luxury hospitality industry, we pride ourselves on attention to detail and
              personalized service.
            </p>
            <div className="bg-card rounded-lg p-8 shadow-md">
              <p className="text-foreground/70 italic">
                "At 5PM Hotel, we believe that true luxury is not just about the finest amenities, but about creating
                meaningful connections and unforgettable memories for our guests."
              </p>
              <p className="text-primary font-semibold mt-4">- Management Team</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
