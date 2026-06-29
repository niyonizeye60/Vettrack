"use client"

import { MessagesPanel } from "@/components/dashboard/messages-panel"
import { useLanguage } from "@/contexts/LanguageContext"

export default function MessagesPage() {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.messages')}</h1>
        <p className="text-sm text-gray-500">
          {t('farmer.communicateVeterinarians')}
        </p>
      </div>
      
      <MessagesPanel />
    </div>
  )
}
