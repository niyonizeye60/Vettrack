"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bell } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

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
  const { t } = useLanguage()
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
        <CardTitle className="text-red-600">{t('farmer.confirmDelete')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-6">
          <Bell className="h-4 w-4" />
          <AlertTitle>{t('farmer.warning')}</AlertTitle>
          <AlertDescription>
            {t('farmer.deleteConsultationConfirm')}. {t('farmer.deleteConsultationConfirmDesc')}.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <div>
            <span className="font-semibold">{t('farmer.service')}:</span> {consultation.service}
          </div>
          <div>
            <span className="font-semibold">{t('farmer.name')}:</span> {consultation.fullName}
          </div>
          <div>
            <span className="font-semibold">{t('farmer.date')}:</span> {consultation.date} {t('farmer.at')} {consultation.time}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/farmer/consultations/${consultation._id}`)}
        >
          {t('farmer.cancel')}
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : (t('farmer.confirmDelete'))}
        </Button>
      </CardFooter>
    </Card>
  )
} 