"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "manager" | "reception" | "finance" | "admin"
  status: "active" | "inactive"
  joinDate: string
}

interface UserFormModalProps {
  user: User | null
  onSave: (user: User) => void
  onClose: () => void
}

export function UserFormModal({ user, onSave, onClose }: UserFormModalProps) {
  const [formData, setFormData] = useState<User>(
    user || {
      id: "",
      name: "",
      email: "",
      role: "reception",
      status: "active",
      joinDate: new Date().toISOString().split("T")[0],
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">{user ? "Edit User" : "Add New User"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@dz5pm.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground"
              >
                <option value="reception">Reception</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="admin">System Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {user ? "Update User" : "Add User"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
