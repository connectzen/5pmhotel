"use client"

import { getMessaging, isSupported, getToken, onMessage, type Messaging } from "firebase/messaging"
import { firebaseApp } from "./firebase"

let messagingInstance: Messaging | null = null

export async function getMessagingInstance(): Promise<Messaging | null> {
  try {
    const supported = await isSupported()
    if (!supported) return null
    if (messagingInstance) return messagingInstance
    messagingInstance = getMessaging(firebaseApp)
    return messagingInstance
  } catch {
    return null
  }
}

export async function requestNotificationPermissionAndToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) return null

  try {
    const token = await getToken(messaging, { vapidKey })
    return token ?? null
  } catch {
    return null
  }
}

export function listenForForegroundMessages(callback: (payload: unknown) => void): void {
  if (typeof window === "undefined") return
  void getMessagingInstance().then((messaging) => {
    if (!messaging) return
    onMessage(messaging, (payload) => {
      callback(payload)
    })
  })
}


