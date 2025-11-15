'use client'

import { useLanguage } from "@/contexts/LanguageContext"
import UsersManagement from "@/components/superadmin/users-management"

interface UsersPageClientProps {
  users: any[]
}

export default function UsersPageClient({ users }: UsersPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('superadmin.usersManagement')}</h1>
        <p className="text-gray-600 mt-2">{t('superadmin.manageAllUsersSystem') || 'Manage all users in the system'}</p>
      </div>

      <UsersManagement users={users} />
    </div>
  )
}