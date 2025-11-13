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

export function FloatingBookingCta() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const gallery = document.getElementById("gallery")
    if (!gallery) return

    const handleScroll = () => {
      const rect = gallery.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      const hasEnteredGallery = rect.top < viewportHeight * 0.85
      const hasExitedGallery = rect.bottom < viewportHeight * 0.25 || rect.top > viewportHeight
      setVisible(hasEnteredGallery && !hasExitedGallery)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
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
        className={`fixed bottom-6 right-6 z-40 h-14 px-6 rounded-full bg-accent text-accent-foreground shadow-xl hover:shadow-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
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

