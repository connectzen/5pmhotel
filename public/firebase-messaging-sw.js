/* global self */

// Firebase Messaging service worker for background notifications
// This file must be served at /firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: self?.ENV_PUBLIC?.FIREBASE_API_KEY,
  authDomain: self?.ENV_PUBLIC?.FIREBASE_AUTH_DOMAIN,
  projectId: self?.ENV_PUBLIC?.FIREBASE_PROJECT_ID,
  messagingSenderId: self?.ENV_PUBLIC?.FIREBASE_MESSAGING_SENDER_ID,
  appId: self?.ENV_PUBLIC?.FIREBASE_APP_ID,
})

const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {}
    self.registration.showNotification(title || "Notification", {
      body: body || "",
      icon: icon || "/icons/icon-192x192.png",
      data: payload?.data || {},
    })
  })
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || "/admin/dashboard"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})


