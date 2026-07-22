'use client'

import { useLanguage } from "@/contexts/LanguageContext"
import ConsultationsManagement from "@/components/superadmin/consultations-management"

interface ConsultationsPageClientProps {
  consultations: any[]
}

export default function ConsultationsPageClient({ consultations }: ConsultationsPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{t('superadmin.consultationsManagement')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('superadmin.reviewMonitorConsultations') || 'Review and monitor all consultations'}</p>
        </div>

        <ConsultationsManagement consultations={consultations} />
      </div>
    </div>
  )
}