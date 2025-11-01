"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { subscribeUsers, getUserRole, setUserRole, type UserRole } from "@/lib/auth"

type UserRow = { uid: string; email: string | null; role: UserRole | null }

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUid, setUpdatingUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeUsers(async (users) => {
      const withRoles = await Promise.all(
        users.map(async (u) => ({ uid: u.uid, email: u.email, role: await getUserRole(u.uid) }))
      )
      setRows(withRoles)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const updateRole = async (uid: string, role: UserRole) => {
    setError(null)
    setUpdatingUid(uid)
    try {
      await setUserRole(uid, role)
      setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, role } : r)))
    } catch (e: any) {
      setError(e?.message ?? "Failed to update role. Check Firestore rules.")
    } finally {
      setUpdatingUid(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">Manage user roles</p>
      </div>

      <Card className="p-6">
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">UID</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.uid} className="border-b border-border/50">
                    <td className="py-2 pr-4">{u.email ?? "(no email)"}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{u.uid}</td>
                    <td className="py-2 pr-4">{u.role ?? "(none)"}</td>
                    <td className="py-2 flex gap-2">
                      <Button
                        variant={u.role === "admin" ? "default" : "outline"}
                        disabled={updatingUid === u.uid}
                        onClick={() => updateRole(u.uid, "admin")}
                      >
                        {updatingUid === u.uid ? "Saving…" : "Make Admin"}
                      </Button>
                      <Button
                        variant={u.role === "user" ? "default" : "outline"}
                        disabled={updatingUid === u.uid}
                        onClick={() => updateRole(u.uid, "user")}
                      >
                        {updatingUid === u.uid ? "Saving…" : "Make User"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
