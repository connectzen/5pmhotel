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
      capacities: { theatre: 0, classroom: 0, uShape: 0, boardroom: 0 },
      operatingHours: { start: "08:00", end: "22:00" },
      setupInclusions: [],
      packages: [],
    },
  )
  const packagesContainerRef = useRef<HTMLDivElement | null>(null)
  const lastAddedInputRef = useRef<HTMLInputElement | null>(null)
  const [lastAddedPackageId, setLastAddedPackageId] = useState<string | null>(null)

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

  const addPackage = () => {
    const pkg = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      durationHours: 5,
      cateringIncluded: false,
      price: 0,
    }
    setFormData({ ...formData, packages: [...(formData.packages || []), pkg] })
    setLastAddedPackageId(pkg.id)
    // Smoothly scroll the newly added row into view
    setTimeout(() => {
      const container = packagesContainerRef.current
      if (container && container.lastElementChild) {
        ;(container.lastElementChild as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 0)
  }

  const updatePackage = (id: string, patch: Partial<NonNullable<Venue["packages"]>[number]>) => {
    const next = (formData.packages || []).map(p => p.id === id ? { ...p, ...patch } : p)
    setFormData({ ...formData, packages: next })
  }

  const removePackage = (id: string) => {
    const next = (formData.packages || []).filter(p => p.id !== id)
    setFormData({ ...formData, packages: next })
  }

  const timeOptions: string[] = React.useMemo(() => {
    const opts: string[] = []
    for (let m = 0; m < 24 * 60; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0")
      const mm = String(m % 60).padStart(2, "0")
      opts.push(`${hh}:${mm}`)
    }
    return opts
  }, [])

  // Focus the name input after a package is added
  React.useEffect(() => {
    if (lastAddedPackageId && lastAddedInputRef.current) {
      lastAddedInputRef.current.focus()
      // Clear the marker so subsequent adds re-focus
      setLastAddedPackageId(null)
    }
  }, [lastAddedPackageId])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{venue ? "Edit Venue" : "Add New Venue"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Removed base capacity and base price in favor of package-based configuration */}

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

            {/* Operating hours */}
            <div>
              <label className="block text-sm font-medium mb-2">Operating Hours</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Start</span>
                  <select
                    value={formData.operatingHours?.start || ""}
                    onChange={(e) =>
                      handleFieldChange("operatingHours", {
                        ...(formData.operatingHours || {}),
                        start: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground"
                  >
                    <option value="">Select start time</option>
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">End</span>
                  <select
                    value={formData.operatingHours?.end || ""}
                    onChange={(e) =>
                      handleFieldChange("operatingHours", {
                        ...(formData.operatingHours || {}),
                        end: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-foreground"
                  >
                    <option value="">Select end time</option>
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Capacity per layout */}
            <div>
              <label className="block text-sm font-medium mb-2">Capacity by Layout</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Theatre</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.capacities?.theatre ?? 0}
                    onChange={(e) =>
                      handleFieldChange("capacities", {
                        ...(formData.capacities || {}),
                        theatre: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Classroom</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.capacities?.classroom ?? 0}
                    onChange={(e) =>
                      handleFieldChange("capacities", {
                        ...(formData.capacities || {}),
                        classroom: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">U-Shape</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.capacities?.uShape ?? 0}
                    onChange={(e) =>
                      handleFieldChange("capacities", {
                        ...(formData.capacities || {}),
                        uShape: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground mb-1">Boardroom</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.capacities?.boardroom ?? 0}
                    onChange={(e) =>
                      handleFieldChange("capacities", {
                        ...(formData.capacities || {}),
                        boardroom: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Inclusions */}
            <div>
              <label className="block text-sm font-medium mb-2">Package Inclusions</label>
              <textarea
                value={(formData.setupInclusions || []).join("\n")}
                onChange={(e) =>
                  handleFieldChange(
                    "setupInclusions",
                    e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                className="w-full px-3 py-2 border rounded-lg bg-secondary text-foreground min-h-24 border-border"
                placeholder="One inclusion per line (e.g., Audio Visual, Wireless presentation, Breakout rooms, ...)"
              />
            </div>

            {/* Packages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Packages</label>
                <Button type="button" onClick={addPackage} className="h-8 px-3 text-sm">Add Package</Button>
              </div>
              <div ref={packagesContainerRef} className="space-y-3 max-h-[60vh] overflow-auto">
                {(formData.packages || []).map((pkg) => (
                  <div key={pkg.id} className="border border-border rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <span className="block text-xs text-muted-foreground mb-1">Name</span>
                      <Input
                        ref={(el) => {
                          if (pkg.id === lastAddedPackageId) {
                            lastAddedInputRef.current = el
                          }
                        }}
                        value={pkg.name}
                        onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                        placeholder="Half-Day Seminar"
                      />
                    </div>
                  <div className="md:col-span-3">
                      <span className="block text-xs text-muted-foreground mb-1">Description</span>
                      <Input
                        value={pkg.description || ""}
                        onChange={(e) => updatePackage(pkg.id, { description: e.target.value })}
                        placeholder="5 hours + 2 tea breaks"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <span className="block text-xs text-muted-foreground mb-1">Duration (hrs)</span>
                      <Input
                        type="number"
                        min={1}
                        value={pkg.durationHours ?? 5}
                        onChange={(e) => updatePackage(pkg.id, { durationHours: Number(e.target.value) })}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={!!pkg.cateringIncluded}
                          onChange={(e) => updatePackage(pkg.id, { cateringIncluded: e.target.checked })}
                        />
                        Catering
                      </label>
                    </div>
                    <div className="md:col-span-3">
                      <span className="block text-xs text-muted-foreground mb-1">Price (KES)</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pkg.price ?? 0}
                        onChange={(e) => updatePackage(pkg.id, { price: Number(e.target.value) })}
                        className="w-full min-w-[200px]"
                      />
                    </div>
                    <div className="md:col-span-12 flex justify-end">
                      <Button type="button" variant="outline" onClick={() => removePackage(pkg.id)} className="h-8 px-3">
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {(!formData.packages || formData.packages.length === 0) && (
                  <div className="text-xs text-muted-foreground">No packages added yet.</div>
                )}
              </div>
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
