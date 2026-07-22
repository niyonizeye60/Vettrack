"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { updateAnimal } from "@/lib/actions"
import { rwandaData } from "@/lib/rwanda-data"

type Animal = {
  _id: string
  name: string
  type: string
  breed: string
  district: string
  sector: string
  class: string
  ownerName: string
  phoneNumber: string
  price: number
  status: string
  acquisitionType?: string
  earTagId?: string
  insuranceId?: string
  gender?: string
}

interface EditAnimalFormProps {
  animal: Animal
  farmerId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function EditAnimalForm({ animal, farmerId, onSuccess, onCancel }: EditAnimalFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: animal.name,
    type: animal.type,
    breed: animal.breed,
    district: animal.district,
    sector: animal.sector,
    class: animal.class,
    ownerName: animal.ownerName,
    phoneNumber: animal.phoneNumber,
    price: animal.price?.toString() ?? "",
    status: animal.status || "Healthy",
    acquisitionType: animal.acquisitionType || "",
    earTagId: animal.earTagId || "",
    insuranceId: animal.insuranceId || "",
    gender: animal.gender || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "district") {
      setFormData((prev) => ({ ...prev, district: value, sector: "" }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = new FormData()
    Object.entries(formData).forEach(([key, value]) => form.append(key, value))
    form.append("ownerId", farmerId)

    try {
      const result = await updateAnimal(animal._id, form)
      if (result.success) {
        toast({ title: t('farmer.animalUpdated'), description: t('farmer.animalUpdatedDesc') })
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

        {/* Animal Name */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">{t('farmer.animalName')}</Label>
          <Input id="edit-name" name="name" value={formData.name}
            onChange={handleChange} placeholder={t('farmer.enterAnimalName')} required />
        </div>

        {/* Animal Type */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-type">{t('farmer.animalType')}</Label>
          <Select value={formData.type} onValueChange={(v) => handleSelectChange("type", v)} required>
            <SelectTrigger id="edit-type"><SelectValue placeholder={t('farmer.selectAnimalType')} /></SelectTrigger>
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

        {/* Breed */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-breed">{t('farmer.breed')}</Label>
          <Input id="edit-breed" name="breed" value={formData.breed}
            onChange={handleChange} placeholder={t('farmer.enterBreed')} required />
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-gender">{t('farmer.gender')}</Label>
          <Select value={formData.gender} onValueChange={(v) => handleSelectChange("gender", v)} required>
            <SelectTrigger id="edit-gender"><SelectValue placeholder={t('farmer.selectGender')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="female">{t('farmer.female')}</SelectItem>
              <SelectItem value="male">{t('farmer.male')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Class */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-class">{t('farmer.class')}</Label>
          <Select value={formData.class} onValueChange={(v) => handleSelectChange("class", v)} required>
            <SelectTrigger id="edit-class"><SelectValue placeholder={t('farmer.selectClass')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dairy">{t('farmer.diary')}</SelectItem>
              <SelectItem value="meat">{t('farmer.meat')}</SelectItem>
              <SelectItem value="poultry">{t('farmer.poultry')}</SelectItem>
              <SelectItem value="pet">{t('farmer.pet')}</SelectItem>
              <SelectItem value="other">{t('farmer.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-status">{t('farmer.status')}</Label>
          <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)} required>
            <SelectTrigger id="edit-status"><SelectValue placeholder={t('farmer.selectStatus')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Healthy">{t('farmer.healthy')}</SelectItem>
              <SelectItem value="Sick">{t('farmer.sick')}</SelectItem>
              <SelectItem value="Under Treatment">{t('farmer.underTreatment')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Acquisition Type */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-acquisitionType">{t('farmer.acquisitionType')}</Label>
          <Select value={formData.acquisitionType} onValueChange={(v) => handleSelectChange("acquisitionType", v)} required>
            <SelectTrigger id="edit-acquisitionType"><SelectValue placeholder={t('farmer.selectAcquisitionType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bought">{t('farmer.bought')}</SelectItem>
              <SelectItem value="born">{t('farmer.born')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* District */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-district">{t('farmer.district')}</Label>
          <Select value={formData.district} onValueChange={(v) => handleSelectChange("district", v)} required>
            <SelectTrigger id="edit-district"><SelectValue placeholder={t('farmer.selectDistrict')} /></SelectTrigger>
            <SelectContent>
              {Object.keys(rwandaData).sort().map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sector */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-sector">{t('farmer.sector')}</Label>
          <Select value={formData.sector} onValueChange={(v) => handleSelectChange("sector", v)}
            required disabled={!formData.district}>
            <SelectTrigger id="edit-sector">
              <SelectValue placeholder={formData.district ? t('farmer.selectSector') : t('farmer.selectDistrictFirst')} />
            </SelectTrigger>
            <SelectContent>
              {formData.district && rwandaData[formData.district]?.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Owner Name */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-ownerName">{t('farmer.ownerName')}</Label>
          <Input id="edit-ownerName" name="ownerName" value={formData.ownerName}
            onChange={handleChange} placeholder={t('farmer.enterOwnerName')} required />
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-phoneNumber">{t('farmer.phoneNumber')}</Label>
          <Input id="edit-phoneNumber" name="phoneNumber" value={formData.phoneNumber}
            onChange={handleChange} placeholder={t('farmer.enterPhoneNumber')} required />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-price">{t('farmer.price')} (RWF)</Label>
          <Input id="edit-price" name="price" type="number" value={formData.price}
            onChange={handleChange} placeholder={t('farmer.enterPrice')} required />
        </div>

        {/* Ear Tag ID — optional */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-earTagId">{t('animal.earTagId')}{optionalLabel}</Label>
          <Input id="edit-earTagId" name="earTagId" value={formData.earTagId}
            onChange={handleChange} placeholder={t('farmer.enterEarTagId')} />
        </div>

        {/* Insurance ID — optional */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-insuranceId">{t('farmer.insuranceId')}{optionalLabel}</Label>
          <Input id="edit-insuranceId" name="insuranceId" value={formData.insuranceId}
            onChange={handleChange} placeholder={t('farmer.enterInsuranceId')} />
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('farmer.cancel')}
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
          {isSubmitting ? t('farmer.updatingAnimal') : t('farmer.updateAnimal')}
        </Button>
      </div>
    </form>
  )
}
