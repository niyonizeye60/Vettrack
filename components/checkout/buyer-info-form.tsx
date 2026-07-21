"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { buyerSchema, type Buyer } from "@/lib/validations/checkout"

interface BuyerInfoFormProps {
  initialValue: Buyer
  onSubmit: (buyer: Buyer) => void
}

export default function BuyerInfoForm({ initialValue, onSubmit }: BuyerInfoFormProps) {
  const { t } = useLanguage()
  const [values, setValues] = useState<Buyer>(initialValue)
  const [errors, setErrors] = useState<Partial<Record<keyof Buyer, string>>>({})

  const set = (field: keyof Buyer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = buyerSchema.safeParse(values)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof Buyer, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof Buyer
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="buyer-name">{t('checkout.fullName')}</Label>
        <Input id="buyer-name" value={values.name} onChange={set('name')} required />
        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="buyer-phone">{t('checkout.phoneNumber')}</Label>
          <Input id="buyer-phone" placeholder="078XXXXXXX" value={values.phone} onChange={set('phone')} required />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer-email">{t('checkout.email')}</Label>
          <Input id="buyer-email" type="email" value={values.email} onChange={set('email')} />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="buyer-district">{t('checkout.district')}</Label>
          <Input id="buyer-district" value={values.district} onChange={set('district')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer-sector">{t('checkout.sector')}</Label>
          <Input id="buyer-sector" value={values.sector} onChange={set('sector')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer-village">{t('checkout.village')}</Label>
          <Input id="buyer-village" value={values.village} onChange={set('village')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="buyer-notes">{t('checkout.notes')}</Label>
        <Textarea id="buyer-notes" value={values.notes} onChange={set('notes')} rows={3} />
      </div>

      <Button type="submit" className="w-full">{t('checkout.continue')}</Button>
    </form>
  )
}
