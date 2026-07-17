'use client'

import { useLanguage } from "@/contexts/LanguageContext"
import UsersManagement from "@/components/superadmin/users-management"

interface UsersPageClientProps {
  users: any[]
}

export default function UsersPageClient({ users }: UsersPageClientProps) {
  const { t } = useLanguage()

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{t('superadmin.usersManagement')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('superadmin.manageAllUsersSystem') || 'Manage all users in the system'}</p>
        </div>

        <UsersManagement users={users} />
      </div>
    </div>
  )
}