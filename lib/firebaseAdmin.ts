import "server-only"
import * as admin from "firebase-admin"

let adminApp: admin.app.App | null = null

export function getAdminApp(): admin.app.App | null {
  if (adminApp) return adminApp

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountJson) return null
    const creds = JSON.parse(serviceAccountJson)
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(creds as admin.ServiceAccount),
    })
    return adminApp
  } catch {
    return null
  }
}

export function getAdminMessaging(): admin.messaging.Messaging | null {
  const app = getAdminApp()
  if (!app) return null
  return admin.messaging(app)
}


