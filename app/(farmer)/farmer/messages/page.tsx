"use client"

import { Suspense } from "react"
import { MessagesPanel } from "@/components/dashboard/messages-panel"
import { useLanguage } from "@/contexts/LanguageContext"

export default function MessagesPage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.messages')}</h1>
        <p className="text-sm text-gray-500">
          {t('farmer.communicateVeterinarians')}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <Suspense fallback={null}>
          <MessagesPanel />
        </Suspense>
      </div>
    </div>
  )
}
