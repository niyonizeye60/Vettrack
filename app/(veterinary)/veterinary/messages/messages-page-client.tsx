"use client"

import { MessagesPanel } from "@/components/dashboard/messages-panel"
import { useLanguage } from "@/contexts/LanguageContext"
import { MessageSquare } from "lucide-react"

export default function MessagesPageClient() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-purple-600 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t('vet.patientCommunications')}</h1>
            <p className="text-purple-600 font-medium">{t('vet.messages')}</p>
          </div>
        </div>
        <p className="text-gray-600 ml-14">{t('vet.communicateFarmers')}</p>
      </div>
      
      <MessagesPanel />
    </div>
  )
}