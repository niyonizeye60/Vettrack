import { Suspense } from "react"
import {
  getSystemStats,
  getNewsletterSubscriberStats,
  getLoginAttemptsTrend,
  getNewsletterGrowthTrend,
  getChatReportsTrend,
  getErrorLogsTrend
} from "@/lib/actions/superadmin"
import { getOpenChatReportsCount } from "@/lib/actions/chat-moderation"
import AnalyticsPageClient from "./AnalyticsPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const [
    systemStats,
    subscriberStats,
    openReportsCount,
    loginAttemptsTrend,
    newsletterGrowthTrend,
    chatReportsTrend,
    errorLogsTrend
  ] = await Promise.all([
    getSystemStats(),
    getNewsletterSubscriberStats(),
    getOpenChatReportsCount(),
    getLoginAttemptsTrend(30),
    getNewsletterGrowthTrend(30),
    getChatReportsTrend(30),
    getErrorLogsTrend(30)
  ])

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <AnalyticsPageClient
        systemStats={systemStats}
        subscriberStats={subscriberStats}
        openReportsCount={openReportsCount}
        loginAttemptsTrend={loginAttemptsTrend}
        newsletterGrowthTrend={newsletterGrowthTrend}
        chatReportsTrend={chatReportsTrend}
        errorLogsTrend={errorLogsTrend}
      />
    </Suspense>
  )
}
