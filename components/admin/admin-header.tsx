"use client"

import { Shield } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import StaffHeader from "@/components/staff/staff-header"
import NotificationBell from "@/components/staff/notification-bell"

/**
 * The admin portal header. Its bell is the shared staff one: admin alerts are stored
 * notifications like every other portal's (lib/admin-notifications.ts).
 */
export default function AdminHeader() {
  const { t } = useLanguage()

  return (
    <StaffHeader
      portalLabel={t('admin.portal')}
      tagline={t('admin.regionalManagement')}
      homeHref="/admin"
      brandIcon={<Shield className="h-6 w-6 sm:h-7 sm:w-7" />}
      notifications={<NotificationBell role="admin" viewAllHref="/admin/notifications" />}
      profileHref="/admin/profile"
      settingsHref="/admin/settings"
    />
  )
}
