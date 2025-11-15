import { Suspense } from "react"
import { getAnalyticsData, getSystemHealth } from "@/lib/actions/superadmin"
import AnalyticsPageClient from "./AnalyticsPageClient"

export default async function AnalyticsPage() {
  const [analyticsData, systemHealth] = await Promise.all([
    getAnalyticsData(),
    getSystemHealth()
  ])

  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <AnalyticsPageClient 
        analyticsData={analyticsData} 
        systemHealth={systemHealth} 
      />
    </Suspense>
  )
}