export function LocationMap() {
  // Provided hotel location short link
  const mapsLink = "https://maps.app.goo.gl/PbjhvWBEPk2FkUkL8"
  const mapsEmbedSrc = "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3988.93254124562!2d36.88014597496565!3d-1.2073461987811285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMcKwMTInMjYuNSJTIDM2wrA1Mic1Ny44IkU!5e0!3m2!1sen!2ske!4v1762274213534!5m2!1sen!2ske"

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
