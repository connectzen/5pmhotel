"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RoomsTable } from "@/components/admin/rooms-table"
import { RoomFormModal } from "@/components/admin/room-form-modal"
import { Plus, AlertTriangle, Trash2 } from "lucide-react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Room } from "@/lib/admin-store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as Room[]
      setRooms(list)
    })
    return () => unsub()
  }, [])

  const handleSaveRoom = async (room: Room) => {
    const { id, ...data } = room
    const payload: any = { ...data }
    if (!payload.image && Array.isArray(payload.images) && payload.images.length > 0) {
      payload.image = payload.images[0]
    }
    setError(null)
    setBusyId(room.id ?? "new")
    try {
      const isEditing = Boolean(editingRoom?.id)
      if (isEditing) {
        const targetId = editingRoom!.id as string
        await setDoc(doc(db, "rooms", targetId), { ...payload, updatedAt: serverTimestamp() }, { merge: true })
      } else {
        await addDoc(collection(db, "rooms"), { ...payload, createdAt: serverTimestamp() })
      }
      setShowForm(false)
      setEditingRoom(null)
    } catch (e: any) {
      setError(e?.message ?? "Failed to save room.")
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteClick = (roomId: string) => {
    setRoomToDelete(roomId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return
    
    setDeleteDialogOpen(false)
    setError(null)
    setBusyId(roomToDelete)
    try {
      await deleteDoc(doc(db, "rooms", roomToDelete))
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete room.")
    } finally {
      setBusyId(null)
      setRoomToDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Rooms Management</h1>
          <p className="text-muted-foreground mt-1">Manage room types and inventory</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditingRoom(null)
            setShowForm(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Add Room
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Rooms Table */}
      <RoomsTable
        rooms={rooms}
        busyId={busyId ?? undefined}
        onEdit={(room) => {
          setEditingRoom(room)
          setShowForm(true)
        }}
        onDelete={handleDeleteClick}
      />

      {/* Room Form Modal */}
      {showForm && (
        <RoomFormModal
          room={editingRoom}
          onSave={handleSaveRoom}
          saving={Boolean(busyId)}
          onClose={() => {
            setShowForm(false)
            setEditingRoom(null)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <AlertDialogTitle>Delete Room</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <span className="text-base font-semibold text-foreground block mb-2">
                Are you sure you want to delete this room?
              </span>
              <div className="text-sm text-muted-foreground">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Permanently delete the room from the database</li>
                <li>Remove all room information and images</li>
                <li>This may affect existing bookings for this room</li>
              </ul>
              <div className="text-sm font-semibold text-red-600 mt-3">
                This action cannot be undone!
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoomToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
