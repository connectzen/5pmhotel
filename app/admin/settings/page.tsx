"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Save } from "lucide-react"

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

  const handleSaveHotelSettings = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure hotel and payment settings</p>
      </div>

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
  )
}
