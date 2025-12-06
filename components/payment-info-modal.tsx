"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface PaymentInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: (name: string, phone: string) => Promise<void>
  title?: string
  description?: string
  showGuestInfo?: boolean // Whether this is for booking person vs guest
}

export function PaymentInfoModal({ 
  isOpen, 
  onClose, 
  onProceed,
  title = "Booking Information",
  description,
  showGuestInfo = true
}: PaymentInfoModalProps) {
  const defaultDescription = showGuestInfo 
    ? "Please provide your details to proceed to checkout"
    : "Please provide your contact details. This information will be used to contact you after payment is completed."
  
  const finalDescription = description || defaultDescription
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState({ name: false, phone: false })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = {
      name: !name.trim(),
      phone: !phone.trim(),
    }
    
    setErrors(newErrors)
    
    if (newErrors.name || newErrors.phone) {
      return
    }
    
    setIsSubmitting(true)
    try {
      await onProceed(name.trim(), phone.trim())
      // Reset form
      setName("")
      setPhone("")
      setErrors({ name: false, phone: false })
    } catch (error) {
      console.error("Failed to proceed:", error)
      alert("Failed to proceed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setName("")
      setPhone("")
      setErrors({ name: false, phone: false })
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="space-y-2">
            <DialogDescription>{finalDescription}</DialogDescription>
            {showGuestInfo && (
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                <strong>Note:</strong> This is the information of the person making the booking. You will be directed to checkout where you can provide details about the guest(s) who will be staying at our hotel.
              </DialogDescription>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {showGuestInfo ? "Booking Person's Name" : "Full Name"} <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors(prev => ({ ...prev, name: false }))
              }}
              placeholder={showGuestInfo ? "Enter booking person's name" : "Enter your full name"}
              className={`bg-background text-foreground ${errors.name ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"}`}
              disabled={isSubmitting}
              required
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">Name is required</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              {showGuestInfo ? "Booking Person's Phone" : "Phone Number"} <span className="text-red-500">*</span>
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (errors.phone) setErrors(prev => ({ ...prev, phone: false }))
              }}
              placeholder="+254..."
              className={`bg-background text-foreground ${errors.phone ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-accent"}`}
              disabled={isSubmitting}
              required
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">Phone number is required</p>
            )}
            {showGuestInfo && (
              <p className="text-xs text-muted-foreground mt-1">
                This number will be used to contact you after payment is completed.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Checkout"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


