"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RatePlanKey, RatePlanPrices, RatePlans, Room } from "@/lib/admin-store"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { X, UploadCloud } from "lucide-react"
import { useRef } from "react"

interface RoomFormModalProps {
  room: Room | null
  onSave: (room: Room) => void
  onClose: () => void
  saving?: boolean
}

const amenitiesOptions = ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi", "Balcony", "Safe", "Hairdryer"]

const ratePlanDefinitions: Array<{ key: RatePlanKey; label: string; note?: string }> = [
  { key: "bedOnly", label: "Bed Only" },
  { key: "bedBreakfast", label: "Bed & Breakfast" },
  { key: "bedWine", label: "Bed & Wine", note: "Twin includes 1 bottle" },
  { key: "bedMeal", label: "Bed & Meal" },
  { key: "halfBoard", label: "Half Board" },
  { key: "fullBoard", label: "Full Board" },
]

const getEmptyRatePlans = (): RatePlans => ({
  bedOnly: {},
  bedBreakfast: {},
  bedWine: {},
  bedMeal: {},
  halfBoard: {},
  fullBoard: {},
})

const computeBaseRate = (ratePlans?: RatePlans) => {
  if (!ratePlans) return undefined
  // Prefer Bed Only if present
  const bedOnlyAmount = ratePlans.bedOnly?.amount
  if (typeof bedOnlyAmount === "number" && bedOnlyAmount > 0) {
    return bedOnlyAmount
  }

  let min = Number.POSITIVE_INFINITY
  Object.values(ratePlans).forEach((plan) => {
    if (!plan) return
    // New structure: use single `amount` per plan
    if (typeof plan.amount === "number" && plan.amount > 0) {
      min = Math.min(min, plan.amount)
    }
    // Backwards compatibility: consider legacy per-occupancy fields if still present
    ;(["single", "double", "twin"] as const).forEach((occ) => {
      const legacy = plan[occ]
      if (typeof legacy === "number" && legacy > 0) {
        min = Math.min(min, legacy)
      }
    })
  })
  return Number.isFinite(min) ? min : undefined
}

export function RoomFormModal({ room, onSave, onClose, saving }: RoomFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<Room>(
    room
      ? {
          ...room,
          ratePlans: room.ratePlans ?? getEmptyRatePlans(),
        }
      : {
          id: "",
          name: "",
          capacity: 2,
          price: 0,
          status: "active",
          amenities: [],
          images: [],
          quantity: 1,
          ratePlans: getEmptyRatePlans(),
        },
  )

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "Room name is required"
    }
    
    const derivedBaseRate = computeBaseRate(formData.ratePlans)
    const effectivePrice = derivedBaseRate ?? formData.price
    if (!effectivePrice || effectivePrice <= 0) {
      newErrors.ratePlans = "Add at least one rate to continue"
    } else {
      // keep price in sync for listings
      setFormData((prev) => ({ ...prev, price: effectivePrice }))
    }
    
    if (!formData.images || formData.images.length === 0) {
      newErrors.images = "At least one image is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }
    const derivedBaseRate = computeBaseRate(formData.ratePlans)
    const payload = {
      ...formData,
      price: derivedBaseRate ?? formData.price ?? 0,
      ratePlans: formData.ratePlans ?? getEmptyRatePlans(),
    }
    onSave(payload as Room)
  }

  const handleFieldChange = (field: keyof Room, value: any) => {
    setFormData({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  const handleRateChange = (planKey: RatePlanKey, value: string) => {
    const numericValue = value === "" ? undefined : Number.parseInt(value)
    setFormData((prev) => {
      const currentPlans = prev.ratePlans ?? getEmptyRatePlans()
      const updatedPlan = { ...(currentPlans[planKey] ?? {}) }
      updatedPlan.amount = Number.isFinite(numericValue as number) ? numericValue : undefined
      const updatedRatePlans: RatePlans = {
        ...currentPlans,
        [planKey]: updatedPlan,
      }
      const derivedBaseRate = computeBaseRate(updatedRatePlans)
      const nextPrice = derivedBaseRate ?? prev.price ?? 0
      return {
        ...prev,
        ratePlans: updatedRatePlans,
        price: nextPrice,
      }
    })
    if (errors.ratePlans) {
      setErrors({ ...errors, ratePlans: "" })
    }
  }

  const baseRate = computeBaseRate(formData.ratePlans)

  const handleImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          // Optional: client-side guard for very large files (5MB)
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`File ${file.name} is larger than 5MB`)
          }
          const path = `rooms/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
          const storageRef = ref(storage, path)
          await uploadBytes(storageRef, file)
          return await getDownloadURL(storageRef)
        }),
      )
      const newImages = [...(formData.images || []), ...uploads]
      handleFieldChange("images", newImages)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{room ? "Edit Room" : "Add New Room"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preserve id for edits */}
            {formData.id && <input type="hidden" value={formData.id} readOnly />}
            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.name ? "text-red-600" : ""}`}>
                Room Name {errors.name && <span className="text-xs">({errors.name})</span>}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g., Deluxe Suite"
                className={errors.name ? "border-red-500 focus:ring-red-500" : ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Capacity</label>
                <Input
                  type="number"
                  value={formData.capacity ?? ""}
                  onChange={(e) =>
                    handleFieldChange("capacity", e.target.value === "" ? undefined : Number.parseInt(e.target.value))
                  }
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <Input
                  type="number"
                  value={(formData as any).quantity ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...(formData as any),
                      quantity: e.target.value === "" ? (undefined as any) : Number.parseInt(e.target.value),
                    })
                  }
                  min="0"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-sm font-medium ${errors.ratePlans ? "text-red-600" : ""}`}>
                  Rate Plans (KES)
                </label>
                {errors.ratePlans && <span className="text-xs text-red-600">{errors.ratePlans}</span>}
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                {ratePlanDefinitions.map((plan, idx) => (
                  <div
                    key={plan.key}
                    className={`flex items-center justify-between gap-4 px-3 py-3 text-sm ${
                      idx !== ratePlanDefinitions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{plan.label}</span>
                      {plan.note && <span className="text-xs text-muted-foreground">{plan.note}</span>}
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        value={formData.ratePlans?.[plan.key]?.amount ?? ""}
                        onChange={(e) => handleRateChange(plan.key, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Display price uses the Bed Only rate if set, otherwise the lowest plan rate.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Display Price (auto)</label>
              <Input value={baseRate ?? formData.price ?? ""} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">Used in listings and filters.</p>
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

            <div>
              <label className="block text-sm font-medium mb-3">Amenities</label>
              <div className="grid grid-cols-2 gap-2">
                {amenitiesOptions.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.images ? "text-red-600" : ""}`}>
                Images {errors.images && <span className="text-xs">({errors.images})</span>}
              </label>
              <div className={`flex items-center gap-2 flex-wrap p-2 rounded-lg ${
                errors.images ? "border-2 border-red-500" : ""
              }`}>
                {/* Upload Card Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-28 h-28 border border-dashed rounded-lg bg-secondary hover:bg-secondary/80 flex flex-col items-center justify-center text-foreground/80 transition flex-shrink-0 ${
                    errors.images ? "border-red-500" : "border-border"
                  }`}
                >
                  <UploadCloud className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{uploading ? "Uploading…" : "Upload"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleImages(e.target.files)
                    if (errors.images) {
                      setErrors({ ...errors, images: "" })
                    }
                  }}
                  className="hidden"
                />
                {!!(formData.images && formData.images.length) && (
                  <>
                    {formData.images!.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img src={src} alt="room" className="w-28 h-28 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = (formData.images || []).filter((_, i) => i !== idx)
                            handleFieldChange("images", newImages)
                          }}
                          className="absolute -top-2 -right-2 bg-black/60 text-white rounded-full w-6 h-6 text-xs hidden group-hover:flex items-center justify-center"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" disabled={Boolean(saving)} onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button disabled={Boolean(saving) || uploading} type="submit" className="flex-1">
                {saving ? (room ? "Updating…" : "Adding…") : room ? "Update Room" : "Add Room"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
