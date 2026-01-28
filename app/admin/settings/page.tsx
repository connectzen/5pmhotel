"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { db, storage } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"

export default function SettingsPage() {
  const [hotelSettings, setHotelSettings] = useState({
    hotelName: "5PM Hotel",
    email: "reservations@5pm.co.ke",
    phone: "+254-722-867-400",
    address: "Thome, off the Northern Bypass",
    taxRate: 16,
    serviceCharge: 10,
  })

  const [paymentSettings, setPaymentSettings] = useState({
    mpesaBusinessCode: "174379",
    mpesaConsumerKey: "••••••••••••••••••••••••••••••••",
    stripePublishable: "pk_test_••••••••••••••••••••••••••••••••",
    stripeSecret: "sk_test_••••••••••••••••••••••••••••••••",
  })

  const [saved, setSaved] = useState(false)
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null)
  const [heroImagePath, setHeroImagePath] = useState<string | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false)

  const heroPreviewUrl = useMemo(() => {
    if (!heroImageFile) return null
    return URL.createObjectURL(heroImageFile)
  }, [heroImageFile])

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl)
    }
  }, [heroPreviewUrl])

  useEffect(() => {
    const loadHomepageHero = async () => {
      try {
        const snap = await getDoc(doc(db, "siteSettings", "homepage"))
        if (!snap.exists()) {
          setHeroImageUrl(null)
          setHeroImagePath(null)
          return
        }
        const data = snap.data() as any
        setHeroImageUrl(typeof data.heroImageUrl === "string" ? data.heroImageUrl : null)
        setHeroImagePath(typeof data.heroImagePath === "string" ? data.heroImagePath : null)
      } catch (e) {
        console.error("Error loading homepage hero image:", e)
      }
    }
    void loadHomepageHero()
  }, [])

  const handleSaveHotelSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const triggerHomepageRevalidate = async () => {
    try {
      await fetch("/api/revalidate/homepage", {
        method: "POST",
        headers: {
          // If REVALIDATE_SECRET is set on the server, also set NEXT_PUBLIC_REVALIDATE_SECRET
          // so the dashboard can authenticate this call.
          ...(process.env.NEXT_PUBLIC_REVALIDATE_SECRET
            ? { "x-revalidate-secret": process.env.NEXT_PUBLIC_REVALIDATE_SECRET }
            : {}),
        },
      })
    } catch {
      // Ignore revalidation failures; the homepage will still update on the next ISR cycle.
    }
  }

  const handleHeroImageUpload = async () => {
    if (!heroImageFile) {
      toast.error("Please choose an image first")
      return
    }

    if (!heroImageFile.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // 8MB safety cap (keeps homepage fast)
    if (heroImageFile.size > 8 * 1024 * 1024) {
      toast.error("Image must be less than 8MB")
      return
    }

    setUploadingHeroImage(true)
    try {
      // Delete old image (if we have a stored path)
      if (heroImagePath) {
        try {
          await deleteObject(ref(storage, heroImagePath))
        } catch (e) {
          console.warn("Could not delete old hero image:", e)
        }
      }

      // Versioned path => safe to set long-lived caching on Storage objects
      const ext = (heroImageFile.name.split(".").pop() || "jpg").toLowerCase()
      const path = `site/homepage-hero/${Date.now()}.${ext}`
      const storageRef = ref(storage, path)

      await uploadBytes(storageRef, heroImageFile, {
        contentType: heroImageFile.type,
        cacheControl: "public,max-age=31536000,immutable",
      })

      const url = await getDownloadURL(storageRef)

      await setDoc(doc(db, "siteSettings", "homepage"), {
        heroImageUrl: url,
        heroImagePath: path,
        updatedAt: new Date().toISOString(),
      })

      setHeroImageUrl(url)
      setHeroImagePath(path)
      setHeroImageFile(null)
      toast.success("Homepage hero image updated")
      void triggerHomepageRevalidate()
    } catch (e) {
      console.error("Error uploading hero image:", e)
      toast.error("Failed to upload image")
    } finally {
      setUploadingHeroImage(false)
    }
  }

  const handleHeroImageDelete = async () => {
    if (!heroImageUrl && !heroImagePath) return
    setUploadingHeroImage(true)
    try {
      if (heroImagePath) {
        try {
          await deleteObject(ref(storage, heroImagePath))
        } catch (e) {
          console.warn("Could not delete hero image from storage:", e)
        }
      }

      await setDoc(
        doc(db, "siteSettings", "homepage"),
        { heroImageUrl: null, heroImagePath: null, updatedAt: new Date().toISOString() },
        { merge: true } as any,
      )

      setHeroImageUrl(null)
      setHeroImagePath(null)
      setHeroImageFile(null)
      toast.success("Homepage hero image deleted")
      void triggerHomepageRevalidate()
    } catch (e) {
      console.error("Error deleting hero image:", e)
      toast.error("Failed to delete image")
    } finally {
      setUploadingHeroImage(false)
    }
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure hotel and payment settings</p>
      </div>

      {/* Homepage Hero Image */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Homepage Hero Image</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Upload the main “hello image” shown on the homepage. This is cached aggressively for fast loading.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
            <img
              src={heroPreviewUrl ?? heroImageUrl ?? "/helloImage/Screenshot 2025-10-30 112005.png"}
              alt="Homepage hero preview"
              className="w-full h-[220px] md:h-[320px] object-cover"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
                className="hidden"
                id="hero-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => document.getElementById("hero-image-upload")?.click()}
                disabled={uploadingHeroImage}
              >
                <Upload className="w-4 h-4" />
                {heroImageFile ? heroImageFile.name : "Choose image"}
              </Button>
            </label>

            <Button
              type="button"
              onClick={handleHeroImageUpload}
              disabled={uploadingHeroImage || !heroImageFile}
              className="gap-2"
            >
              {uploadingHeroImage ? "Saving..." : "Upload"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleHeroImageDelete}
              disabled={uploadingHeroImage || (!heroImageUrl && !heroImagePath)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Hotel Profile Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Hotel Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Hotel Name</label>
            <Input
              value={hotelSettings.hotelName}
              onChange={(e) => setHotelSettings({ ...hotelSettings, hotelName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={hotelSettings.email}
                onChange={(e) => setHotelSettings({ ...hotelSettings, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                value={hotelSettings.phone}
                onChange={(e) => setHotelSettings({ ...hotelSettings, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <Input
              value={hotelSettings.address}
              onChange={(e) => setHotelSettings({ ...hotelSettings, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
              <Input
                type="number"
                value={hotelSettings.taxRate}
                onChange={(e) => setHotelSettings({ ...hotelSettings, taxRate: Number.parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service Charge (%)</label>
              <Input
                type="number"
                value={hotelSettings.serviceCharge}
                onChange={(e) =>
                  setHotelSettings({ ...hotelSettings, serviceCharge: Number.parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveHotelSettings} className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
            {saved && <p className="text-green-600 text-sm flex items-center">Settings saved successfully!</p>}
          </div>
        </div>
      </Card>

      {/* Payment Settings removed per requirements */}
      </div>
    </div>
  )
}
