import { Suspense } from "react"
import { getAdminAnnouncements, getTargetableUsers } from "@/lib/actions/announcements"
import ContentPageClient from "./ContentPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ContentPage() {
  const [announcements, targetableUsers] = await Promise.all([
    getAdminAnnouncements(),
    getTargetableUsers(),
  ])

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ContentPageClient initialAnnouncements={announcements} initialTargetableUsers={targetableUsers} />
    </Suspense>
  )
}