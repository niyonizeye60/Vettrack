import { Suspense } from "react"
import { getNotificationTemplates, getScheduledNotifications, getAllUsers } from "@/lib/actions/superadmin"
import NotificationsPageClient from "./NotificationsPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export default async function NotificationsPage() {
  const [templates, scheduled, users] = await Promise.all([
    getNotificationTemplates(),
    getScheduledNotifications(),
    getAllUsers()
  ])

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <NotificationsPageClient 
        initialTemplates={templates}
        scheduledNotifications={scheduled}
        users={users}
      />
    </Suspense>
  )
}