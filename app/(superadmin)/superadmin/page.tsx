import {
  getSystemStats,
  getRecentActivities,
  getSystemHealth,
  getNewsletterSubscriberStats,
  getOnlineUsersByRole,
  getUserRegistrationTrend,
  getUserActivitySnapshot,
  getLoginActivityTrend
} from "@/lib/actions/superadmin"
import { getOpenChatReportsCount } from "@/lib/actions/chat-moderation"
import SuperAdminDashboardClient from "./SuperAdminDashboardClient"

export const dynamic = 'force-dynamic'

export default async function SuperAdminDashboard() {
  const [
    stats,
    recentActivities,
    systemHealth,
    openReportsCount,
    subscriberStats,
    onlineUsers,
    registrationTrend,
    activitySnapshot,
    loginActivityTrend
  ] = await Promise.all([
    getSystemStats(),
    getRecentActivities(),
    getSystemHealth(),
    getOpenChatReportsCount(),
    getNewsletterSubscriberStats(),
    getOnlineUsersByRole(),
    getUserRegistrationTrend(30),
    getUserActivitySnapshot(),
    getLoginActivityTrend(30)
  ])

  return (
    <SuperAdminDashboardClient
      stats={stats}
      recentActivities={recentActivities}
      systemHealth={systemHealth}
      openReportsCount={openReportsCount}
      subscriberStats={subscriberStats}
      onlineUsers={onlineUsers}
      registrationTrend={registrationTrend}
      activitySnapshot={activitySnapshot}
      loginActivityTrend={loginActivityTrend}
    />
  )
}