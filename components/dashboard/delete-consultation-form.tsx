"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bell } from "lucide-react"

interface Consultation {
  _id: string
  fullName: string
  service: string
  date: string
  time: string
  status: string
}

interface DeleteConsultationFormProps {
  consultation: Consultation
  farmerId: string
}

export default function DeleteConsultationForm({ consultation, farmerId }: DeleteConsultationFormProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const result = await deleteConsultation(consultation._id, farmerId)
      
      if (result.success) {
        router.push("/farmer/consultations")
        router.refresh()
      } else {
        console.error("Failed to delete consultation", result.error)
        setIsDeleting(false)
      }
    } catch (error) {
      console.error("Error deleting consultation:", error)
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-red-600">Confirm Deletion</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-6">
          <Bell className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            You are about to delete this consultation. This action cannot be undone.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <div>
            <span className="font-semibold">Service:</span> {consultation.service}
          </div>
          <div>
            <span className="font-semibold">Name:</span> {consultation.fullName}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {consultation.date} at {consultation.time}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/farmer/consultations/${consultation._id}`)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Confirm Delete"}
        </Button>
      </CardFooter>
    </Card>
  )
} 