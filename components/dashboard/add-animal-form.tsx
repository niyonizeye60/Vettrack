"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerAnimal } from "@/lib/actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { rwandaData } from "@/lib/rwanda-data"

interface AddAnimalFormProps {
  userId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function AddAnimalForm({ userId, onSuccess, onCancel }: AddAnimalFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    breed: "",
    district: "",
    sector: "",
    class: "",
    ownerName: "",
    phoneNumber: "",
    price: "",
    acquisitionType: "",
    earTagId: "",
    insuranceId: "",
    gender: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "district") {
      setFormData((prev) => ({ ...prev, [name]: value, sector: "" }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = new FormData()
    Object.entries(formData).forEach(([key, value]) => form.append(key, value))

    try {
      const result = await registerAnimal(form, userId)
      if (result.success) {
        toast({ title: t('farmer.animalAdded'), description: t('farmer.animalAddedDesc') })
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

  const optionalLabel = <span className="text-gray-400 text-xs font-normal ml-1">({t('common.optional') || 'optional'})</span>

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="space-y-1.5">
          <Label htmlFor="add-name">{t('farmer.animalName')}</Label>
          <Input id="add-name" name="name" value={formData.name}
            onChange={handleChange} placeholder={t('farmer.enterAnimalName')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-type">{t('farmer.animalType')}</Label>
          <Select value={formData.type} onValueChange={(v) => handleSelectChange("type", v)} required>
            <SelectTrigger id="add-type"><SelectValue placeholder={t('farmer.selectAnimalType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cow">{t('farmer.cow')}</SelectItem>
              <SelectItem value="goat">{t('farmer.goat')}</SelectItem>
              <SelectItem value="sheep">{t('farmer.sheep')}</SelectItem>
              <SelectItem value="chicken">{t('farmer.chicken')}</SelectItem>
              <SelectItem value="dog">{t('farmer.dog')}</SelectItem>
              <SelectItem value="cat">{t('farmer.cat')}</SelectItem>
              <SelectItem value="other">{t('farmer.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-breed">{t('farmer.breed')}</Label>
          <Input id="add-breed" name="breed" value={formData.breed}
            onChange={handleChange} placeholder={t('farmer.enterBreed')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-gender">{t('farmer.gender')}</Label>
          <Select value={formData.gender} onValueChange={(v) => handleSelectChange("gender", v)} required>
            <SelectTrigger id="add-gender"><SelectValue placeholder={t('farmer.selectGender')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="female">{t('farmer.female')}</SelectItem>
              <SelectItem value="male">{t('farmer.male')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-class">{t('farmer.class')}</Label>
          <Select value={formData.class} onValueChange={(v) => handleSelectChange("class", v)} required>
            <SelectTrigger id="add-class"><SelectValue placeholder={t('farmer.selectClass')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dairy">{t('farmer.diary')}</SelectItem>
              <SelectItem value="meat">{t('farmer.meat')}</SelectItem>
              <SelectItem value="poultry">{t('farmer.poultry')}</SelectItem>
              <SelectItem value="pet">{t('farmer.pet')}</SelectItem>
              <SelectItem value="other">{t('farmer.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-acquisitionType">{t('farmer.acquisitionType')}</Label>
          <Select value={formData.acquisitionType} onValueChange={(v) => handleSelectChange("acquisitionType", v)} required>
            <SelectTrigger id="add-acquisitionType"><SelectValue placeholder={t('farmer.selectAcquisitionType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bought">{t('farmer.bought')}</SelectItem>
              <SelectItem value="born">{t('farmer.born')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-district">{t('farmer.district')}</Label>
          <Select value={formData.district} onValueChange={(v) => handleSelectChange("district", v)} required>
            <SelectTrigger id="add-district"><SelectValue placeholder={t('farmer.selectDistrict')} /></SelectTrigger>
            <SelectContent>
              {Object.keys(rwandaData).sort().map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-sector">{t('farmer.sector')}</Label>
          <Select value={formData.sector} onValueChange={(v) => handleSelectChange("sector", v)}
            required disabled={!formData.district}>
            <SelectTrigger id="add-sector">
              <SelectValue placeholder={formData.district ? t('farmer.selectSector') : t('farmer.selectDistrictFirst')} />
            </SelectTrigger>
            <SelectContent>
              {formData.district && rwandaData[formData.district]?.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-ownerName">{t('farmer.ownerName')}</Label>
          <Input id="add-ownerName" name="ownerName" value={formData.ownerName}
            onChange={handleChange} placeholder={t('farmer.enterOwnerName')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-phoneNumber">{t('farmer.phoneNumber')}</Label>
          <Input id="add-phoneNumber" name="phoneNumber" value={formData.phoneNumber}
            onChange={handleChange} placeholder={t('farmer.enterPhoneNumber')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-price">{t('farmer.price')} (RWF)</Label>
          <Input id="add-price" name="price" type="number" value={formData.price}
            onChange={handleChange} placeholder={t('farmer.enterPrice')} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-earTagId">{t('animal.earTagId')}{optionalLabel}</Label>
          <Input id="add-earTagId" name="earTagId" value={formData.earTagId}
            onChange={handleChange} placeholder={t('farmer.enterEarTagId')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="add-insuranceId">{t('farmer.insuranceId')}{optionalLabel}</Label>
          <Input id="add-insuranceId" name="insuranceId" value={formData.insuranceId}
            onChange={handleChange} placeholder={t('farmer.enterInsuranceId')} />
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('farmer.cancel')}
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
          {isSubmitting ? t('farmer.savingAnimal') : t('farmer.registerAnimal')}
        </Button>
      </div>
    </form>
  )
}
