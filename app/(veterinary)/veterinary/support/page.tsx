"use client"

import { Suspense } from "react"
import MyTickets from "@/components/support/my-tickets"
import { useLanguage } from "@/contexts/LanguageContext"

export default function VeterinarySupportPage() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">{t('vet.support')}</h1>
        <p className="text-sm text-gray-500">{t('support.needHelp')}</p>
      </div>

      <Suspense fallback={null}>
        <MyTickets />
      </Suspense>
    </div>
  )
}
