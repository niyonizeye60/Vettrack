"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"

interface Doctor {
  _id: string
  name: string
  email: string
  specialization: string
  phone: string
}

interface Consultation {
  _id: string
  fullName: string
  phoneNumber: string
  service: string
  date: string
  time: string
  type: string
  doctor: string
  status: string
  createdAt: string
  farmerId: string | null
}

interface EditConsultationFormProps {
  consultation: Consultation
  doctors: Doctor[]
  farmerId: string
}

export default function EditConsultationForm({ consultation, doctors, farmerId }: EditConsultationFormProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await updateConsultation(consultation._id, formData, farmerId)
      
      if (result.success) {
        router.push("/farmer/consultations")
        router.refresh()
      } else {
        console.error("Failed to update consultation", result.error)
      }
    } catch (error) {
      console.error("Error updating consultation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('farmer.editConsultation')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('farmer.fullName')}</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder={t("farmer.enterFullName")}
                defaultValue={consultation.fullName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('farmer.phoneNumber')}</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder={t('farmer.enterPhoneNumber')}
                defaultValue={consultation.phoneNumber}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">{t('farmer.service')}</Label>
              <Input
                id="service"
                name="service"
                placeholder={t('farmer.enterService')}
                defaultValue={consultation.service}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor">{t('farmer.selectDoctor')}</Label>
              <Select name="doctor" defaultValue={consultation.doctor} required>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder={t('farmer.selectDoctor')} />
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
              <Label htmlFor="date">{t('farmer.date')}</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={consultation.date}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">{t('farmer.time')}</Label>
              <Input
                id="time"
                name="time"
                type="time"
                defaultValue={consultation.time}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('farmer.consultationType')}</Label>
              <Select name="type" defaultValue={consultation.type} required>
                <SelectTrigger id="type">
                  <SelectValue placeholder={t('farmer.selectConsultationType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Virtual">{t('farmer.virtual')}</SelectItem>
                  <SelectItem value="In-Person">{t('farmer.inPerson')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/farmer/consultations")}
            >
              {t('farmer.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('farmer.updatingConsultation') : (t('farmer.updateConsultation'))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 