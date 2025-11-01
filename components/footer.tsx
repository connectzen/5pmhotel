import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-serif text-xl font-bold mb-4">5PM Hotel</h3>
            <p className="text-sm opacity-90">Experience luxury and tranquility at our premier destination.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/rooms" className="hover:opacity-80 transition">
                  Rooms
                </Link>
              </li>
              <li>
                <Link href="/venues" className="hover:opacity-80 transition">
                  Venues
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:opacity-80 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:opacity-80 transition">
                  Gallery
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={16} />
                <span>+254-722-867-400</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <span>reservations@5pm.co.ke</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} />
                <span>Thome, off the Northern Bypass</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="hover:opacity-80 transition">
                Facebook
              </a>
              <a href="#" className="hover:opacity-80 transition">
                Instagram
              </a>
              <a href="#" className="hover:opacity-80 transition">
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm opacity-75">
          <p>&copy; 2025 5PM Hotel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
