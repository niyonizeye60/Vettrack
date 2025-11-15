'use client'

import { useLanguage } from "@/contexts/LanguageContext"
import ConsultationsManagement from "@/components/superadmin/consultations-management"

interface ConsultationsPageClientProps {
  consultations: any[]
}

export default function ConsultationsPageClient({ consultations }: ConsultationsPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('superadmin.consultationsManagement')}</h1>
        <p className="text-gray-600 mt-2">{t('superadmin.reviewMonitorConsultations') || 'Review and monitor all consultations'}</p>
      </div>

      <ConsultationsManagement consultations={consultations} />
    </div>
  )
}