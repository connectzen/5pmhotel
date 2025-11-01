export function LocationMap() {
  return (
    <section className="py-16 px-4 bg-muted">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary mb-4">Our Location</h2>
          <p className="text-foreground/70 text-lg">Conveniently located in the heart of the city</p>
        </div>

        <div className="rounded-lg overflow-hidden shadow-lg h-96 bg-gray-200">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: 'url("/map-location.jpg")',
            }}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-foreground/70 mb-2">123 Luxury Lane, Paradise City, PC 12345</p>
          <p className="text-foreground/70">Phone: +1 (555) 123-4567 | Email: info@dz5pm.com</p>
        </div>
      </div>
    </section>
  )
}
