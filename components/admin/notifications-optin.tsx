"use client"

import { useEffect, useState } from "react"
import { requestNotificationPermissionAndToken, listenForForegroundMessages } from "@/lib/messaging"
import { toast } from "sonner"

interface Props {
  userId: string
  role?: string
}

export default function NotificationsOptIn({ userId, role }: Props) {
  const [enabled, setEnabled] = useState<boolean>(false)
  const [working, setWorking] = useState<boolean>(false)

  useEffect(() => {
    listenForForegroundMessages(() => {
      toast("New notification received")
    })
  }, [])

  async function enable() {
    setWorking(true)
    try {
      const token = await requestNotificationPermissionAndToken()
      if (!token) {
        toast.error("Notifications blocked or unsupported")
        setWorking(false)
        return
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId, role }),
      })
      setEnabled(true)
      toast.success("Notifications enabled")
    } catch {
      toast.error("Failed to enable notifications")
    } finally {
      setWorking(false)
    }
  }

  if (enabled) return null

  return (
    <div className="mb-4 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span>Enable push notifications for booking updates and expiries.</span>
        <button
          disabled={working}
          onClick={enable}
          className="inline-flex h-8 items-center rounded bg-black px-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {working ? "Enabling..." : "Enable"}
        </button>
      </div>
    </div>
  )
}


