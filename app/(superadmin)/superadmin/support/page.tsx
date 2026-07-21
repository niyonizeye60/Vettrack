"use client"

import AdminSupportInbox from "@/components/admin/admin-support-inbox"
import { useLanguage } from "@/contexts/LanguageContext"

export default function SuperAdminSupportPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.supportCommunication')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.handleUserSupportTickets')}</p>
      </div>
      <AdminSupportInbox />
    </div>
  )
}
