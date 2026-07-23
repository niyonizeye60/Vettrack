'use client'

import { useLanguage } from "@/contexts/LanguageContext"
import ConsultationsManagement from "@/components/superadmin/consultations-management"

interface ConsultationsPageClientProps {
  consultations: any[]
}

export default function ConsultationsPageClient({ consultations }: ConsultationsPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.consultationsManagement')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.reviewMonitorConsultations') || 'Review and monitor all consultations'}</p>
      </div>

      <ConsultationsManagement consultations={consultations} />
    </div>
  )
}