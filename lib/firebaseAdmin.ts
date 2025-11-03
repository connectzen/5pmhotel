import "server-only"

let cachedAdmin: typeof import("firebase-admin") | null = null
let cachedApp: any | null = null

async function getAdminModule(): Promise<typeof import("firebase-admin") | null> {
  if (cachedAdmin) return cachedAdmin
  try {
    cachedAdmin = await import("firebase-admin")
    return cachedAdmin
  } catch {
    return null
  }
}

export async function getAdminApp(): Promise<any | null> {
  if (cachedApp) return cachedApp
  const admin = await getAdminModule()
  if (!admin) return null
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountJson) return null
    const creds = JSON.parse(serviceAccountJson)
    // Reuse existing app if it exists
    if (admin.apps && admin.apps.length > 0) {
      cachedApp = admin.app()
    } else {
      cachedApp = admin.initializeApp({
        credential: admin.credential.cert(creds as any),
      })
    }
    return cachedApp
  } catch {
    return null
  }
}

export async function getAdminMessaging(): Promise<any | null> {
  const admin = await getAdminModule()
  if (!admin) return null
  const app = await getAdminApp()
  if (!app) return null
  return admin.messaging(app)
}


