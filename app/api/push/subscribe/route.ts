import { NextResponse } from "next/server"
import { getFirestore, collection, doc, setDoc } from "firebase/firestore"
import { firebaseApp } from "@/lib/firebase"

export async function POST(request: Request) {
  try {
    const { token, userId, role } = await request.json()
    if (!token || !userId) {
      return NextResponse.json({ error: "token and userId are required" }, { status: 400 })
    }

    const db = getFirestore(firebaseApp)
    const ref = doc(collection(db, "pushTokens"), token)
    await setDoc(ref, { token, userId, role: role || null, updatedAt: Date.now() }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "failed to save token" }, { status: 500 })
  }
}


