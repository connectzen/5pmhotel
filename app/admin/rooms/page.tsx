"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RoomsTable } from "@/components/admin/rooms-table"
import { RoomFormModal } from "@/components/admin/room-form-modal"
import { Plus, AlertTriangle, Trash2 } from "lucide-react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Room } from "@/lib/admin-store"
import { Card } from "@/components/ui/card"
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
  const searchParams = useSearchParams()
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "out-of-stock">(() => {
    const filter = searchParams.get("filter")
    if (filter === "available" || filter === "out-of-stock") {
      return filter
    }
    return "all"
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as Room[]
      setRooms(list)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => unsub()
  }, [])

  // Calculate availability for each room
  const roomsWithAvailability = useMemo(() => {
    return rooms.map((room) => {
      const bookedCount = bookings.filter(
        (b: any) => b.room === room.name && (b.status === "approved" || b.status === "checked-in")
      ).length
      const availableCount = Math.max(0, (room.quantity ?? 0) - bookedCount)
      const isAvailable = availableCount > 0
      const isOutOfStock = (room.quantity ?? 0) === 0 || availableCount === 0
      
      return {
        ...room,
        bookedCount,
        availableCount,
        isAvailable,
        isOutOfStock,
      }
    })
  }, [rooms, bookings])

  // Filter rooms based on availability filter
  const filteredRooms = useMemo(() => {
    if (availabilityFilter === "all") return roomsWithAvailability
    if (availabilityFilter === "available") return roomsWithAvailability.filter((r) => r.isAvailable)
    if (availabilityFilter === "out-of-stock") return roomsWithAvailability.filter((r) => r.isOutOfStock)
    return roomsWithAvailability
  }, [roomsWithAvailability, availabilityFilter])

  const handleSaveRoom = async (room: Room) => {
    const { id, ...data } = room
    const payload: any = { ...data }
    // Always update the image field to match the first image in the images array
    if (Array.isArray(payload.images) && payload.images.length > 0) {
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
    <div className="h-full flex flex-col min-w-0">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Rooms Management</h1>
          <p className="text-muted-foreground mt-1">Manage room types and inventory</p>
        </div>
        <Button
          className="gap-2 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
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

      {/* Availability Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Filter by Availability:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={availabilityFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setAvailabilityFilter("all")}
              className="hover:scale-105 transition-transform duration-200 whitespace-nowrap"
            >
              All Rooms ({roomsWithAvailability.reduce((sum, r) => sum + (r.quantity ?? 0), 0)})
            </Button>
            <Button
              variant={availabilityFilter === "available" ? "default" : "outline"}
              size="sm"
              onClick={() => setAvailabilityFilter("available")}
              className="hover:scale-105 transition-transform duration-200 whitespace-nowrap"
            >
              Available ({roomsWithAvailability.filter((r) => r.isAvailable).reduce((sum, r) => sum + (r.availableCount ?? 0), 0)})
            </Button>
            <Button
              variant={availabilityFilter === "out-of-stock" ? "default" : "outline"}
              size="sm"
              onClick={() => setAvailabilityFilter("out-of-stock")}
              className="hover:scale-105 transition-transform duration-200 whitespace-nowrap"
            >
              None Available ({roomsWithAvailability.filter((r) => r.isOutOfStock).length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Rooms Table */}
      <RoomsTable
        rooms={filteredRooms}
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
    </div>
  )
}
