import { Suspense } from "react"
import { getAnalyticsData } from "@/lib/actions/superadmin"
import AnalyticsPageClient from "./AnalyticsPageClient"

export default async function AnalyticsPage() {
  const analyticsData = await getAnalyticsData()

  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <AnalyticsPageClient analyticsData={analyticsData} />
    </Suspense>
  )
}