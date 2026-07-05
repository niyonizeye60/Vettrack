"use client"

import VeterinaryConsultations from "@/components/dashboard/veterinary-consultations"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ConsultationsPageClient({ consultations }: { consultations: any[] }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('vet.consultations')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('vet.manageAppointments')}</p>
      </div>
      <VeterinaryConsultations consultations={consultations} />
    </div>
  )
}
