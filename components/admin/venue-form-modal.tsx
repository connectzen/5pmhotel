"use client"

import React, { useRef, useState } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Venue } from "@/lib/admin-store"
import { X, UploadCloud } from "lucide-react"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

interface VenueFormModalProps {
  venue: Venue | null
  onSave: (venue: Venue) => void
  onClose: () => void
}

export function VenueFormModal({ venue, onSave, onClose }: VenueFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<Venue>(
    venue || {
      id: "",
      name: "",
      capacity: 100,
      price: 0,
      status: "active",
      description: "",
      images: [],
    },
  )

  const handleImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`File ${file.name} is larger than 5MB`)
          }
          const path = `venues/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
          const storageRef = ref(storage, path)
          await uploadBytes(storageRef, file)
          return await getDownloadURL(storageRef)
        }),
      )
      setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...uploads] }))
    } finally {
      setUploading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "Venue name is required"
    }
    
    if (!formData.description || formData.description.trim() === "") {
      newErrors.description = "Description is required"
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
    onSave(formData)
  }

  const handleFieldChange = (field: keyof Venue, value: any) => {
    setFormData({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">{venue ? "Edit Venue" : "Add New Venue"}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.name ? "text-red-600" : ""}`}>
                Venue Name {errors.name && <span className="text-xs">({errors.name})</span>}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g., Grand Ballroom"
                className={errors.name ? "border-red-500 focus:ring-red-500" : ""}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.description ? "text-red-600" : ""}`}>
                Description {errors.description && <span className="text-xs">({errors.description})</span>}
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-secondary text-foreground min-h-24 ${
                  errors.description ? "border-red-500 focus:ring-red-500" : "border-border"
                }`}
                placeholder="Short description of the venue, amenities, layout..."
              />
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
              <label className={`block text-sm font-medium mb-2 ${errors.images ? "text-red-600" : ""}`}>
                Images {errors.images && <span className="text-xs">({errors.images})</span>}
              </label>
              <div className={`flex items-center gap-2 flex-wrap p-2 rounded-lg ${
                errors.images ? "border-2 border-red-500" : ""
              }`}>
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
                        <img src={src} alt="venue" className="w-28 h-28 object-cover rounded" />
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
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {venue ? "Update Venue" : "Add Venue"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
