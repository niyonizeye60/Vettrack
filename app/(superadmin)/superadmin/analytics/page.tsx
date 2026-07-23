import { Suspense } from "react"
import { getAnalyticsData } from "@/lib/actions/superadmin"
import AnalyticsPageClient from "./AnalyticsPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export default async function AnalyticsPage() {
  const analyticsData = await getAnalyticsData()

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <AnalyticsPageClient analyticsData={analyticsData} />
    </Suspense>
  )
}