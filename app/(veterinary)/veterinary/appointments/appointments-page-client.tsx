"use client"

import VeterinaryConsultations from "@/components/dashboard/veterinary-consultations"
import { useLanguage } from "@/contexts/LanguageContext"

interface AppointmentsPageClientProps {
  consultations: any[]
}

export default function AppointmentsPageClient({ consultations }: AppointmentsPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('vet.appointments')}</h1>
        <div className="text-sm text-gray-500">
          {t('vet.manageAppointments')}
        </div>
      </div>
      <VeterinaryConsultations consultations={consultations} />
    </div>
  )
}