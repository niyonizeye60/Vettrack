"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { bookConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Doctor {
  _id: string
  name: string
  email: string
  specialization: string
  phone: string
}

interface AddConsultationFormProps {
  doctors: Doctor[]
  farmerId?: string
}

export default function AddConsultationForm({ doctors, farmerId }: AddConsultationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await bookConsultation(formData, farmerId || "")
      
      if (result.success) {
        const redirectPath = farmerId ? "/farmer/consultations" : "/dashboard/consultations"
        router.push(redirectPath)
        router.refresh()
      } else {
        console.error("Failed to book consultation")
      }
    } catch (error) {
      console.error("Error booking consultation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Consultation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Input
                id="service"
                name="service"
                placeholder="Enter service required"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor">Select Doctor</Label>
              <Select name="doctor" required>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc._id} value={doc._id}>
                      {doc.name} {doc.specialization ? `(${doc.specialization})` : ""} - {doc.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                name="time"
                type="time"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Consultation Type</Label>
              <Select name="type" required>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                  <SelectItem value="In-Person">In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking..." : "Book Consultation"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}