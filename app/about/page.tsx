import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Award, Users, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">About 5PM Hotel</h1>
            <p className="text-lg opacity-90">Discover our story and commitment to excellence</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="mb-16">
            <div className="prose prose-lg max-w-none">
              <h2 className="font-serif text-3xl font-bold text-primary mb-4">ABOUT US</h2>
              <div className="w-24 h-1 bg-accent mb-6"></div>
              <p className="text-foreground/80 leading-relaxed mb-4">
                5PM Hotel offers <strong className="text-primary">36 tastefully furnished rooms</strong>, accommodating up to <strong className="text-primary">148 guests</strong>, with a variety of spaces designed for both relaxation and professional gatherings.
              </p>
              <p className="text-foreground/80 leading-relaxed mb-4">
                The hotel features versatile event venues, including the expansive <strong className="text-primary">Aurora Garden</strong>, elegant indoor halls <strong className="text-primary">Alba</strong> and <strong className="text-primary">Zora</strong>, a tented outdoor space <strong className="text-primary">Sahara</strong>, and five private gazebos ideal for intimate occasions.
              </p>
              <p className="text-foreground/80 leading-relaxed mb-4">
                Guests can enjoy diverse dining experiences: <strong className="text-primary">ZORA</strong>, the upstairs restaurant perfect for power lunches or romantic dinners; <strong className="text-primary">ASTRA</strong>, a lively bar with cocktails and live music; the <strong className="text-primary">Aurora Garden</strong>, offering serene open-air meals; and the private gazebos, each equipped with personal grills for barbecues and cozy cookouts.
              </p>
              <p className="text-foreground/80 leading-relaxed">
                With secure parking for up to <strong className="text-primary">72 vehicles</strong>, <strong className="text-primary">high-speed internet</strong>, and <strong className="text-primary">full support services</strong>. 5PM Hotel caters seamlessly for both casual stays and professional events.
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
                  Choose from our <strong>36 tastefully furnished rooms</strong>, accommodating up to <strong>148 guests</strong>, each designed with comfort and elegance in mind.
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• Premium bedding and linens</li>
                  <li>• Modern amenities and technology</li>
                  <li>• High-speed internet access</li>
                  <li>• 24/7 room service</li>
                  <li>• Personalized concierge service</li>
                </ul>
              </div>
              <div className="bg-muted rounded-lg p-8">
                <h3 className="font-serif text-2xl font-bold text-primary mb-4">Events & Venues</h3>
                <p className="text-foreground/70 mb-4">
                  Host your perfect event in our stunning venues, including <strong>Aurora Garden</strong>, <strong>Alba</strong>, <strong>Zora</strong>, <strong>Sahara</strong>, and five private gazebos.
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• Multiple versatile venue options</li>
                  <li>• Professional event coordination</li>
                  <li>• Catering services</li>
                  <li>• AV and technical support</li>
                  <li>• Secure parking for up to 72 vehicles</li>
                </ul>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-8 mt-8">
              <h3 className="font-serif text-2xl font-bold text-primary mb-4">Dining Experiences</h3>
              <p className="text-foreground/70 mb-4">
                Enjoy diverse dining experiences throughout the hotel.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-foreground/70">
                <div>
                  <p className="font-semibold text-primary mb-2">ZORA Restaurant</p>
                  <p>Upstairs restaurant perfect for power lunches or romantic dinners</p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-2">ASTRA Bar</p>
                  <p>Lively bar with cocktails and live music</p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-2">Aurora Garden</p>
                  <p>Serene open-air dining experience</p>
                </div>
                <div>
                  <p className="font-semibold text-primary mb-2">Private Gazebos</p>
                  <p>Each equipped with personal grills for barbecues and cozy cookouts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div>
            <h2 className="font-serif text-3xl font-bold text-primary mb-8">Our Team</h2>
            <p className="text-foreground/70 text-lg leading-relaxed mb-8">
              Our team is committed to ensuring your stay is comfortable and your events run smoothly. With years of
              experience, we pride ourselves on attention to detail and friendly, practical support.
            </p>
            <div className="bg-card rounded-lg p-8 shadow-md">
              <p className="text-foreground/70 italic">
                "At 5PM Hotel, we believe great hospitality is about simple, honest service and creating positive
                experiences for our guests."
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
