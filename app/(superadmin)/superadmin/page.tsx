import { getSystemStats, getRecentActivities } from "@/lib/actions/superadmin"
import SuperAdminDashboardClient from "./SuperAdminDashboardClient"

export const dynamic = 'force-dynamic'

export default async function SuperAdminDashboard() {
  const [stats, recentActivities] = await Promise.all([
    getSystemStats(),
    getRecentActivities()
  ])

  return <SuperAdminDashboardClient stats={stats} recentActivities={recentActivities} />
}