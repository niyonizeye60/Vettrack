"use client"

import { useState } from "react"
import { updateConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"

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
  onSuccess: () => void
  onCancel: () => void
}

export default function EditConsultationForm({ consultation, doctors, farmerId, onSuccess, onCancel }: EditConsultationFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await updateConsultation(consultation._id, formData, farmerId)
      if (result.success) {
        toast({ title: t('farmer.consultationUpdated') || 'Consultation updated', description: t('farmer.consultationUpdatedDesc') || 'Your consultation has been updated successfully.' })
        onSuccess()
      } else {
        toast({ title: t('common.error'), description: result.error || t('farmer.actionFailed'), variant: "destructive" })
      }
    } catch {
      toast({ title: t('common.error'), description: t('farmer.actionFailed'), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="space-y-1.5">
          <Label htmlFor="edit-fullName">{t('farmer.fullName')}</Label>
          <Input id="edit-fullName" name="fullName" placeholder={t('farmer.enterFullName')}
            defaultValue={consultation.fullName} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-phoneNumber">{t('farmer.phoneNumber')}</Label>
          <Input id="edit-phoneNumber" name="phoneNumber" placeholder={t('farmer.enterPhoneNumber')}
            defaultValue={consultation.phoneNumber} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-service">{t('farmer.service')}</Label>
          <Input id="edit-service" name="service" placeholder={t('farmer.enterService')}
            defaultValue={consultation.service} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-doctor">{t('farmer.selectDoctor')}</Label>
          <Select name="doctor" defaultValue={consultation.doctor} required>
            <SelectTrigger id="edit-doctor">
              <SelectValue placeholder={t('farmer.selectDoctor')} />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doc) => (
                <SelectItem key={doc._id} value={doc._id}>
                  {doc.name}{doc.specialization ? ` (${doc.specialization})` : ""} — {doc.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-date">{t('farmer.date')}</Label>
          <Input id="edit-date" name="date" type="date" defaultValue={consultation.date} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-time">{t('farmer.time')}</Label>
          <Input id="edit-time" name="time" type="time" defaultValue={consultation.time} required />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="edit-type">{t('farmer.consultationType')}</Label>
          <Select name="type" defaultValue={consultation.type} required>
            <SelectTrigger id="edit-type">
              <SelectValue placeholder={t('farmer.selectConsultationType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Virtual">{t('farmer.virtual')}</SelectItem>
              <SelectItem value="In-Person">{t('farmer.inPerson')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('farmer.cancel')}
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
          {isSubmitting ? t('farmer.updatingConsultation') : t('farmer.updateConsultation')}
        </Button>
      </div>
    </form>
  )
}
