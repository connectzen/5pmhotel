"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, RotateCcw } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "manager" | "reception" | "finance" | "admin"
  status: "active" | "inactive"
  joinDate: string
}

interface UsersTableProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "manager":
        return "bg-blue-100 text-blue-800"
      case "reception":
        return "bg-green-100 text-green-800"
      case "finance":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Join Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{user.name}</td>
                <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                <td className="px-6 py-4">
                  <Badge className={`capitalize ${getRoleColor(user.role)}`}>{user.role}</Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={user.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {user.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{user.joinDate}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(user)} className="gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-blue-600 hover:text-blue-700">
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
