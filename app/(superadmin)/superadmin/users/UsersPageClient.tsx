'use client'

import { useLanguage } from "@/contexts/LanguageContext"
import UsersManagement from "@/components/superadmin/users-management"

interface UsersPageClientProps {
  users: any[]
}

export default function UsersPageClient({ users }: UsersPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.usersManagement')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.manageAllUsersSystem') || 'Manage all users in the system'}</p>
      </div>

      <UsersManagement users={users} />
    </div>
  )
}