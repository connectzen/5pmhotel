"use client"

import type React from "react"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Mail, Phone, MapPin, Clock } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert("Thank you for your message! We will get back to you soon.")
    setFormData({ name: "", email: "", subject: "", message: "" })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-serif text-4xl font-bold mb-2">Contact Us</h1>
            <p className="text-lg opacity-90">Get in touch with our team</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-lg p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <Phone size={24} className="text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Phone</h3>
                    <p className="text-foreground/70">+254-722-867-400</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <Mail size={24} className="text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Email</h3>
                    <p className="text-foreground/70">reservations@5pm.co.ke</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <MapPin size={24} className="text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Address</h3>
                    <p className="text-foreground/70">Thome, off the Northern Bypass</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <Clock size={24} className="text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-primary mb-1">Hours</h3>
                    <p className="text-foreground/70">Mon - Sun: 24/7</p>
                    <p className="text-foreground/70">Front Desk Always Available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg shadow-lg p-8">
                <h2 className="font-serif text-2xl font-bold text-primary mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="rounded-lg overflow-hidden shadow-lg h-96 bg-gray-200">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url("/map-location.jpg")' }} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
