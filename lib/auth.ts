"use client"

import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, collection, onSnapshot, query, orderBy } from "firebase/firestore"

export type UserRole = "admin" | "user"

export async function signUpWithEmailAndBootstrapAdmin(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid

  await runTransaction(db, async (tx) => {
    const bootstrapRef = doc(db, "appMeta", "bootstrap")
    const bootstrapSnap = await tx.get(bootstrapRef)
    const hasAdmin = bootstrapSnap.exists() ? Boolean(bootstrapSnap.data()?.hasAdmin) : false

    const roleRef = doc(db, "userRoles", uid)
    if (!hasAdmin) {
      tx.set(roleRef, { role: "admin", createdAt: serverTimestamp() })
      tx.set(bootstrapRef, { hasAdmin: true, updatedAt: serverTimestamp() })
    } else {
      tx.set(roleRef, { role: "user", createdAt: serverTimestamp() }, { merge: true })
    }
  })

  await ensureUserProfile(cred.user)

  return cred.user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(cred.user)
  return cred.user
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const roleSnap = await getDoc(doc(db, "userRoles", uid))
  if (!roleSnap.exists()) return null
  const role = roleSnap.data()?.role as UserRole | undefined
  return role ?? null
}

export function onAuthUser(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function signOutUser() {
  await signOut(auth)
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
    })
  }
}

export function subscribeUsers(callback: (users: Array<{ uid: string; email: string | null }>) => void) {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ uid: d.id, email: (d.data() as any).email ?? null }))
    callback(list)
  })
}

export async function setUserRole(uid: string, role: UserRole) {
  await setDoc(doc(db, "userRoles", uid), { role, updatedAt: serverTimestamp() }, { merge: true })
}


