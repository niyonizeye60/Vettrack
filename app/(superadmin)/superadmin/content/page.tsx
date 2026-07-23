import { Suspense } from "react"
import { getSystemAnnouncements } from "@/lib/actions/superadmin"
import ContentPageClient from "./ContentPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ContentPage() {
  const announcements = await getSystemAnnouncements()

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ContentPageClient initialAnnouncements={announcements} />
    </Suspense>
  )
}