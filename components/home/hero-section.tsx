import Image from "next/image"

type HeroSectionProps = {
  heroImageUrl: string | null
}

export function HeroSection({ heroImageUrl }: HeroSectionProps) {
  return (
    <section className="relative pt-20 md:pt-24 pb-10 md:pb-16 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden mx-auto">
          <div className="relative w-full h-[420px] md:h-[560px]">
            <Image
              // Use spaces in the path; the browser/Next will encode them correctly.
              // This avoids edge cases where double-encoding can 404 on some deployments.
              src={heroImageUrl ?? "/helloImage/Screenshot 2025-10-30 112005.png"}
              alt="Hotel showcase"
              priority
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover object-[40%_35%] brightness-95 contrast-110"
            />
          </div>
          {/* Removed hero overlay dashboard/sign-in button; header already contains dashboard access */}
        </div>
      </div>
    </section>
  )
}
