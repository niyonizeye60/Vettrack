import { Suspense } from "react"
import { getNotificationTemplates, getScheduledNotifications, getAllUsers } from "@/lib/actions/superadmin"
import NotificationsPageClient from "./NotificationsPageClient"

export default async function NotificationsPage() {
  const [templates, scheduled, users] = await Promise.all([
    getNotificationTemplates(),
    getScheduledNotifications(),
    getAllUsers()
  ])

  return (
    <Suspense fallback={<div>Loading notifications...</div>}>
      <NotificationsPageClient 
        initialTemplates={templates}
        scheduledNotifications={scheduled}
        users={users}
      />
    </Suspense>
  )
}