"use client"

import type React from "react"
import { useState } from "react"
import { bookConsultation } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { PawPrint } from "lucide-react"

interface Doctor {
  _id: string
  name: string
  email: string
  specialization: string
  phone: string
}

interface SickAnimal {
  _id: string
  name: string
  type: string
  breed: string
}

interface AddConsultationFormProps {
  doctors: Doctor[]
  farmerId: string
  sickAnimals: SickAnimal[]
  onSuccess: () => void
  onCancel: () => void
}

export default function AddConsultationForm({ doctors, farmerId, sickAnimals, onSuccess, onCancel }: AddConsultationFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("")

  const selectedAnimal = sickAnimals.find(a => a._id === selectedAnimalId) ?? null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    // Inject selected animal metadata into form data
    if (selectedAnimal) {
      formData.set("animalId",   selectedAnimal._id)
      formData.set("animalName", selectedAnimal.name)
      formData.set("animalType", selectedAnimal.type)
      formData.set("animalBreed", selectedAnimal.breed ?? "")
    }

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

        {/* Sick animal selector — spans full width */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="add-animal" className="flex items-center gap-1.5">
            <PawPrint className="h-3.5 w-3.5 text-amber-600" />
            {t('farmer.sickAnimal')}
          </Label>
          {sickAnimals.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <PawPrint className="h-4 w-4 flex-shrink-0" />
              {t('farmer.noSickAnimals')}
            </div>
          ) : (
            <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId} required>
              <SelectTrigger id="add-animal">
                <SelectValue placeholder={t('farmer.selectSickAnimal')} />
              </SelectTrigger>
              <SelectContent>
                {sickAnimals.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                    {a.type  ? ` · ${a.type}`  : ""}
                    {a.breed ? ` (${a.breed})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isSubmitting || (sickAnimals.length > 0 && !selectedAnimalId)}
        >
          {isSubmitting ? t('farmer.booking') : t('farmer.bookConsultation')}
        </Button>
      </div>
    </form>
  )
}
