export function LocationMap() {
  // Provided hotel location short link
  const mapsLink = "https://maps.app.goo.gl/PbjhvWBEPk2FkUkL8"
  // Use standard embed with satellite layer (t=k)
  const mapsEmbedSrc = "https://www.google.com/maps?q=-1.2073461987811285,36.88014597496565&z=16&t=k&output=embed"

  return (
    <section className="py-16 px-4 bg-muted">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-serif text-4xl font-bold text-primary mb-2">Our Location</h2>
          <p className="text-foreground/70 text-lg">Find us on Google Maps</p>
        </div>

        <div className="rounded-lg overflow-hidden shadow-lg h-96 bg-gray-200">
          <iframe
            src={mapsEmbedSrc}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            aria-label="Hotel location on Google Maps"
          />
        </div>

        <div className="mt-6 text-center">
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent text-accent-foreground px-6 py-2 rounded-lg font-semibold hover:bg-accent/90 transition"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    </section>
  )
}
