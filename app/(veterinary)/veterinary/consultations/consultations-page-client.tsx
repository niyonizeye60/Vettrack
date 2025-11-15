"use client"

import VeterinaryConsultations from "@/components/dashboard/veterinary-consultations"
import { useLanguage } from "@/contexts/LanguageContext"
import { ClipboardCheck } from "lucide-react"

interface ConsultationsPageClientProps {
  consultations: any[]
}

export default function ConsultationsPageClient({ consultations }: ConsultationsPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-orange-600 rounded-lg">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t('vet.consultations')}</h1>
            <p className="text-orange-600 font-medium">{t('vet.consultationRequests')}</p>
          </div>
        </div>
        <p className="text-gray-600 ml-14">{t('vet.manageAppointments')}</p>
      </div>
      <VeterinaryConsultations consultations={consultations} />
    </div>
  )
}