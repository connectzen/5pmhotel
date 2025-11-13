"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarHeart, Hotel } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function FloatingBookingCta() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const gallery = document.getElementById("gallery")
    if (!gallery) return

    let rafId: number | null = null

    const computeVisibility = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      const scrollY = window.scrollY || window.pageYOffset
      const galleryTop = gallery.getBoundingClientRect().top + scrollY
      const galleryHeight = gallery.offsetHeight

      const enterPoint = galleryTop - viewportHeight * 0.2
      const exitPoint = galleryTop + galleryHeight - viewportHeight * 0.4
      const currentBottom = scrollY + viewportHeight

      const withinBounds = currentBottom > enterPoint && scrollY < exitPoint
      setVisible(withinBounds)
      rafId = null
    }

    const scheduleCompute = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(computeVisibility)
    }

    // initial check after layout
    scheduleCompute()
    const onLoad = () => scheduleCompute()
    window.addEventListener("load", onLoad)
    window.addEventListener("scroll", scheduleCompute, { passive: true })
    window.addEventListener("touchmove", scheduleCompute, { passive: true })
    window.addEventListener("resize", scheduleCompute)
    window.addEventListener("orientationchange", scheduleCompute)

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      window.removeEventListener("load", onLoad)
      window.removeEventListener("scroll", scheduleCompute)
      window.removeEventListener("touchmove", scheduleCompute)
      window.removeEventListener("resize", scheduleCompute)
      window.removeEventListener("orientationchange", scheduleCompute)
    }
  }, [])

  const router = useRouter()

  const handleViewRooms = () => {
    setOpen(false)
    router.push("/rooms")
  }

  const handlePlanEvent = () => {
    setOpen(false)
    const section = document.getElementById("plan-event")
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    router.push("/#plan-event")
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-4 sm:right-6 z-40 h-12 sm:h-14 px-5 sm:px-6 rounded-full bg-accent text-accent-foreground shadow-xl hover:shadow-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2",
          visible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
        }}
      >
        Book with 5PM
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What would you like to book?</DialogTitle>
            <DialogDescription>
              Choose the experience you&apos;re interested in and we&apos;ll take you there.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              type="button"
              onClick={handleViewRooms}
              className="flex-1 h-14 text-base font-semibold gap-2"
            >
              <Hotel className="w-5 h-5" />
              Book a Room
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePlanEvent}
              className="flex-1 h-14 text-base font-semibold gap-2"
            >
              <CalendarHeart className="w-5 h-5" />
              Plan an Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

