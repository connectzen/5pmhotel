import "server-only"

import { unstable_cache } from "next/cache"
import { getAdminApp } from "@/lib/firebaseAdmin"

export type HomepageSettings = {
  heroImageUrl?: string | null
  heroImagePath?: string | null
  updatedAt?: any
}

async function fetchHomepageSettings(): Promise<HomepageSettings | null> {
  const app = await getAdminApp()
  if (!app) return null

  // Import lazily to avoid bundling in client.
  const admin = await import("firebase-admin")
  const firestore = admin.firestore(app)

  const snap = await firestore.collection("siteSettings").doc("homepage").get()
  if (!snap.exists) return null
  return (snap.data() ?? null) as HomepageSettings | null
}

export const getHomepageSettings = unstable_cache(fetchHomepageSettings, ["siteSettings/homepage"], {
  tags: ["site-settings", "site-settings:homepage"],
  revalidate: 3600,
})

export async function getHomepageHeroImageUrl(): Promise<string | null> {
  const settings = await getHomepageSettings()
  const url = settings?.heroImageUrl
  return typeof url === "string" && url.length > 0 ? url : null
}

