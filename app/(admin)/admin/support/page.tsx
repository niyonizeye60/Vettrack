"use client"

import AdminSupport from "@/components/admin/admin-support"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AdminSupportPage() {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.supportCommunication')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.handleUserSupportTickets')}</p>
      </div>
      <AdminSupport />
    </div>
  )
}