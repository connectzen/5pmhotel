import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Wedding Guest",
    text: "The most beautiful venue we've ever seen. Every detail was perfect!",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Corporate Event Organizer",
    text: "Professional staff, stunning facilities, and exceptional service. Highly recommended!",
    rating: 5,
  },
  {
    name: "Emma Williams",
    role: "Hotel Guest",
    text: "Luxurious rooms, attentive staff, and a peaceful atmosphere. Will definitely return!",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="py-16 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Guest Testimonials</h2>
          <p className="text-foreground/70 text-lg">What our guests are saying</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-card rounded-lg p-8 shadow-md">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={20} className="fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground/80 mb-6 italic">"{testimonial.text}"</p>
              <div>
                <p className="font-semibold text-primary">{testimonial.name}</p>
                <p className="text-sm text-foreground/60">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
