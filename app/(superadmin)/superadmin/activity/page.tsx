import { getActivityLogs, getActivityLogCategoryCounts } from "@/lib/actions/superadmin"
import ActivityLogPageClient from "./ActivityLogPageClient"

export const dynamic = 'force-dynamic'

export default async function ActivityLogPage() {
  const [initialData, initialCounts] = await Promise.all([
    getActivityLogs({ page: 1, pageSize: 25 }),
    getActivityLogCategoryCounts(),
  ])

  return <ActivityLogPageClient initialData={initialData} initialCounts={initialCounts} />
}
