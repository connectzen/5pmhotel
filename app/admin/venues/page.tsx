"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { VenuesTable } from "@/components/admin/venues-table"
const VenueFormModal = dynamic(() => import("@/components/admin/venue-form-modal").then(m => m.VenueFormModal), { ssr: false })
import { Plus, AlertTriangle, Trash2 } from "lucide-react"
import type { Venue } from "@/lib/admin-store"
import { db } from "@/lib/firebase"
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

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    ;(async () => {
      const { collection, onSnapshot } = await import("firebase/firestore")
      unsub = onSnapshot(collection(db, "venues"), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as unknown as Venue[]
        setVenues(list)
      })
    })()
    return () => {
      if (typeof unsub === "function") unsub()
    }
  }, [])

  const handleSaveVenue = async (venue: Venue) => {
    const { id, ...data } = venue
    const payload: any = { ...data }
    // Always sync the image field with the first image in the images array
    if (Array.isArray(payload.images) && payload.images.length > 0) {
      payload.image = payload.images[0]
    } else if (!payload.image && payload.images && payload.images.length === 0) {
      // If images array is empty, clear the image field
      payload.image = null
    }
    setBusyId(venue.id ?? "new")
    try {
      const isEditing = Boolean(editingVenue?.id)
      const { collection, setDoc, addDoc, doc, serverTimestamp } = await import("firebase/firestore")
      if (isEditing) {
        const targetId = editingVenue!.id as string
        await setDoc(doc(db, "venues", targetId), { ...payload, updatedAt: serverTimestamp() }, { merge: true })
      } else {
        await addDoc(collection(db, "venues"), { ...payload, createdAt: serverTimestamp() })
      }
      setShowForm(false)
      setEditingVenue(null)
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteClick = (venueId: string) => {
    setVenueToDelete(venueId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!venueToDelete) return
    
    setDeleteDialogOpen(false)
    const { deleteDoc, doc } = await import("firebase/firestore")
    await deleteDoc(doc(db, "venues", venueToDelete))
    setVenueToDelete(null)
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Venues Management</h1>
          <p className="text-muted-foreground mt-1">Manage event venues and packages</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditingVenue(null)
            setShowForm(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Add Venue
        </Button>
      </div>

      {/* Venues Table */}
      <VenuesTable
        venues={venues}
        onEdit={(venue) => {
          setEditingVenue(venue)
          setShowForm(true)
        }}
        onDelete={handleDeleteClick}
      />

      {/* Venue Form Modal */}
      {showForm && (
        <VenueFormModal
          venue={editingVenue}
          onSave={handleSaveVenue}
          onClose={() => {
            setShowForm(false)
            setEditingVenue(null)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <AlertDialogTitle>Delete Venue</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <span className="text-base font-semibold text-foreground block mb-2">
                Are you sure you want to delete this venue?
              </span>
              <div className="text-sm text-muted-foreground">
                This will:
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                <li>Permanently delete the venue from the database</li>
                <li>Remove all venue information and images</li>
                <li>This may affect existing event bookings for this venue</li>
              </ul>
              <div className="text-sm font-semibold text-red-600 mt-3">
                This action cannot be undone!
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVenueToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Venue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
