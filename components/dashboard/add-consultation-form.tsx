"use client"

import { useState } from "react"
import { bookConsultation } from "@/lib/actions"
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

interface AddConsultationFormProps {
  doctors: Doctor[]
  farmerId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function AddConsultationForm({ doctors, farmerId, onSuccess, onCancel }: AddConsultationFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await bookConsultation(formData, farmerId)
      if (result.success) {
        toast({ title: t('farmer.consultationBooked') || 'Consultation booked', description: t('farmer.consultationBookedDesc') || 'Your consultation has been booked successfully.' })
        onSuccess()
      } else {
        toast({ title: t('common.error'), description: t('farmer.actionFailed'), variant: "destructive" })
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
          <Label htmlFor="add-fullName">{t('farmer.fullName')}</Label>
          <Input id="add-fullName" name="fullName" placeholder={t('farmer.enterFullName')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-phoneNumber">{t('farmer.phoneNumber')}</Label>
          <Input id="add-phoneNumber" name="phoneNumber" placeholder={t('farmer.enterPhoneNumber')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-service">{t('farmer.service')}</Label>
          <Input id="add-service" name="service" placeholder={t('farmer.enterService')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-doctor">{t('farmer.selectDoctor')}</Label>
          <Select name="doctor" required>
            <SelectTrigger id="add-doctor">
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
          <Label htmlFor="add-date">{t('farmer.date')}</Label>
          <Input id="add-date" name="date" type="date" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-time">{t('farmer.time')}</Label>
          <Input id="add-time" name="time" type="time" required />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="add-type">{t('farmer.consultationType')}</Label>
          <Select name="type" required>
            <SelectTrigger id="add-type">
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
          {isSubmitting ? t('farmer.booking') : t('farmer.bookConsultation')}
        </Button>
      </div>
    </form>
  )
}
