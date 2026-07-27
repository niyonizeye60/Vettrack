import { Suspense } from "react"
import { getActivityLogs, getActivityLogCategoryCounts } from "@/lib/actions/superadmin"
import ActivityLogPageClient from "./ActivityLogPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = 'force-dynamic'

export default async function ActivityLogPage() {
  const [initialData, initialCounts] = await Promise.all([
    getActivityLogs({ page: 1, pageSize: 25 }),
    getActivityLogCategoryCounts(),
  ])

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ActivityLogPageClient initialData={initialData} initialCounts={initialCounts} />
    </Suspense>
  )
}
