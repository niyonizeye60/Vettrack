"use client"

import AdminUsersManagement from "@/components/admin/admin-users-management"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AdminUsersPage() {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.manageUsers')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.manageFarmersAndDoctors')}</p>
      </div>
      <AdminUsersManagement />
    </div>
  )
}