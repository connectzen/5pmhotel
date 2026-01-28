import "server-only"

import { cache } from "react"
import { getAdminApp } from "@/lib/firebaseAdmin"

export type HomepageSettings = {
  heroImageUrl?: string | null
  heroImagePath?: string | null
  updatedAt?: any
}

export const getHomepageSettings = cache(async (): Promise<HomepageSettings | null> => {
  const app = await getAdminApp()
  if (!app) return null

  // Import lazily to avoid bundling in client.
  const admin = await import("firebase-admin")
  const firestore = admin.firestore(app)

  const snap = await firestore.collection("siteSettings").doc("homepage").get()
  if (!snap.exists) return null
  return (snap.data() ?? null) as HomepageSettings | null
})

export const getHomepageHeroImageUrl = cache(async (): Promise<string | null> => {
  const settings = await getHomepageSettings()
  const url = settings?.heroImageUrl
  return typeof url === "string" && url.length > 0 ? url : null
})

