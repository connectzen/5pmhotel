export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getAdminMessaging } from "@/lib/firebaseAdmin"
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore"
import { firebaseApp } from "@/lib/firebase"

export async function POST(request: Request) {
  const messaging = getAdminMessaging()
  if (!messaging) {
    return NextResponse.json({ error: "firebase admin not configured" }, { status: 500 })
  }

  try {
    const { tokens, title, body, data, role } = await request.json()
    let targetTokens: string[] = tokens
    if (!targetTokens || !Array.isArray(targetTokens) || targetTokens.length === 0) {
      const db = getFirestore(firebaseApp)
      const q = role ? query(collection(db, "pushTokens"), where("role", "==", role)) : collection(db, "pushTokens")
      const snap = await getDocs(q as any)
      targetTokens = snap.docs.map((d) => (d.data() as any).token).filter(Boolean)
    }
    if (!targetTokens || targetTokens.length === 0) {
      return NextResponse.json({ error: "no target tokens" }, { status: 400 })
    }

    const message = {
      notification: { title: title || "Notification", body: body || "" },
      data: data || {},
      tokens: targetTokens,
    }

    const result = await messaging.sendEachForMulticast(message)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return NextResponse.json({ error: "failed to send" }, { status: 500 })
  }
}


