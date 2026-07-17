'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  FileText,
  Clock,
  AlertCircle,
  Activity,
  Server,
  Database,
  Shield,
  ShieldAlert,
  Settings,
  ArrowUpRight,
  MoreVertical,
  RefreshCw,
  Download,
  Mail,
  Wifi
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from "recharts"
import { useLanguage } from "@/contexts/LanguageContext"
import { useRouter } from "next/navigation"

interface SuperAdminDashboardClientProps {
  stats: {
    totalUsers: number
    totalConsultations: number
    userStats: {
      farmer?: number
      doctor?: number
      admin?: number
      superadmin?: number
    }
    consultationStats: {
      pending?: number
      accepted?: number
      rejected?: number
      completed?: number
    }
  }
  recentActivities: Array<{
    id: string
    type: string
    message: string
    time: string
  }>
  systemHealth: {
    database: { status: string; size?: number; collections?: number; indexes?: number }
    security: { status: string; failedLogins?: number; activeSessions?: number }
    performance: { status: string; uptime?: string; errors24h?: number }
    overall: { status: string }
  }
  openReportsCount: number
  subscriberStats: {
    total: number
    active: number
  }
  onlineUsers: {
    total: number
    byRole: {
      farmer?: number
      doctor?: number
      admin?: number
      superadmin?: number
    }
  }
  registrationTrend: Array<{
    date: string
    farmer: number
    doctor: number
    admin: number
    superadmin: number
    total: number
  }>
  activitySnapshot: {
    activeToday: number
    activeThisWeek: number
    activeThisMonth: number
    dormant: number
    totalUsers: number
  }
  loginActivityTrend: {
    series: Array<{ date: string; activeUsers: number }>
    trackingSince: Date | string | null
  }
}

export default function SuperAdminDashboardClient({
  stats,
  recentActivities,
  systemHealth,
  openReportsCount,
  subscriberStats,
  onlineUsers,
  registrationTrend,
  activitySnapshot,
  loginActivityTrend
}: SuperAdminDashboardClientProps) {
  const { t } = useLanguage()

  const healthBadge = (status: string) => {
    switch (status) {
      case 'healthy': return { label: t('superadmin.online') || 'Online', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800' }
      case 'warning': return { label: t('superadmin.warning') || 'Warning', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' }
      default: return { label: t('superadmin.error') || 'Error', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' }
    }
  }
  const router = useRouter()

  const registrationChartData = registrationTrend.map(day => ({
    ...day,
    label: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }))

  const activitySnapshotData = [
    { name: t('superadmin.activeToday') || 'Active Today', value: activitySnapshot.activeToday, color: '#10B981' },
    { name: t('superadmin.activeThisWeek') || 'Active This Week', value: activitySnapshot.activeThisWeek, color: '#3B82F6' },
    { name: t('superadmin.activeThisMonth') || 'Active This Month', value: activitySnapshot.activeThisMonth, color: '#F59E0B' },
    { name: t('superadmin.dormant') || 'Dormant', value: activitySnapshot.dormant, color: '#9CA3AF' },
  ].filter(item => item.value > 0)

  const loginTrendChartData = loginActivityTrend.series.map(day => ({
    ...day,
    label: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }))
  const trackingSinceDate = loginActivityTrend.trackingSince ? new Date(loginActivityTrend.trackingSince) : null

  // Helper function to get icon and color based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return { icon: Users, color: 'text-blue-600' }
      case 'consultation': return { icon: FileText, color: 'text-orange-600' }
      case 'report': return { icon: ShieldAlert, color: 'text-red-600' }
      case 'subscriber': return { icon: Mail, color: 'text-purple-600' }
      case 'login': return { icon: Wifi, color: 'text-teal-600' }
      case 'admin': return { icon: Shield, color: 'text-indigo-600' }
      case 'system': return { icon: Database, color: 'text-gray-600' }
      default: return { icon: AlertCircle, color: 'text-gray-600' }
    }
  }

  // Format activities with icons and colors
  const formattedActivities = recentActivities.map(activity => {
    const { icon, color } = getActivityIcon(activity.type)
    return {
      ...activity,
      icon,
      color
    }
  })

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {t('superadmin.dashboard') || 'Super Admin Dashboard'}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {t('superadmin.manageUsersConsultations') || 'Manage users, consultations, and system settings'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                systemHealth.overall.status === 'healthy'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : systemHealth.overall.status === 'warning'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${
                systemHealth.overall.status === 'healthy' ? 'bg-green-500' : systemHealth.overall.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
              }`}></div>
              {systemHealth.overall.status === 'healthy'
                ? (t('superadmin.systemHealthy') || 'System Healthy')
                : systemHealth.overall.status === 'warning'
                ? (t('superadmin.systemWarning') || 'System Warning')
                : (t('superadmin.systemError') || 'System Error')}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreVertical className="h-4 w-4" />
                  {t('superadmin.actions') || 'Actions'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => router.refresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('superadmin.refreshData') || 'Refresh Data'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-gray-400">
                  {t('superadmin.needsAttention') || 'Needs Attention'}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/superadmin/consultations')}>
                  <Clock className="mr-2 h-4 w-4 text-amber-600" />
                  {t('superadmin.pendingConsultations') || 'Pending Consultations'}
                  {(stats.consultationStats.pending || 0) > 0 && (
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800">
                      {stats.consultationStats.pending}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/superadmin/moderation')}>
                  <ShieldAlert className="mr-2 h-4 w-4 text-red-600" />
                  {t('superadmin.openChatReports') || 'Open Chat Reports'}
                  {openReportsCount > 0 && (
                    <Badge variant="secondary" className="ml-auto bg-red-100 text-red-800">
                      {openReportsCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/superadmin/exports')}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('superadmin.dataExports') || 'Data Exports'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/superadmin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('superadmin.settings') || 'Settings'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('superadmin.totalUsers')}</p>
                <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers.toLocaleString()}</h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 text-xs text-gray-400">
                <span className="truncate">{t('superadmin.farmers')}: <span className="text-gray-600 font-medium">{stats.userStats.farmer || 0}</span></span>
                <span className="truncate">{t('superadmin.doctors')}: <span className="text-gray-600 font-medium">{stats.userStats.doctor || 0}</span></span>
                <span className="truncate">{t('superadmin.admin')}: <span className="text-gray-600 font-medium">{stats.userStats.admin || 0}</span></span>
                <span className="truncate">{t('superadmin.superAdmin') || 'Super Admin'}: <span className="text-gray-600 font-medium">{stats.userStats.superadmin || 0}</span></span>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => router.push('/superadmin/users')}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('superadmin.onlineNow') || 'Online Now'}</p>
                <Wifi className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">{onlineUsers.total.toLocaleString()}</h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 text-xs text-gray-400">
                <span className="truncate">{t('superadmin.farmers')}: <span className="text-gray-600 font-medium">{onlineUsers.byRole.farmer || 0}</span></span>
                <span className="truncate">{t('superadmin.doctors')}: <span className="text-gray-600 font-medium">{onlineUsers.byRole.doctor || 0}</span></span>
                <span className="truncate">{t('superadmin.admin')}: <span className="text-gray-600 font-medium">{onlineUsers.byRole.admin || 0}</span></span>
                <span className="truncate">{t('superadmin.superAdmin') || 'Super Admin'}: <span className="text-gray-600 font-medium">{onlineUsers.byRole.superadmin || 0}</span></span>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => router.push('/superadmin/moderation')}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('superadmin.openChatReports') || 'Open Reports'}</p>
                <ShieldAlert className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-red-600 mt-2">{openReportsCount.toLocaleString()}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('superadmin.chatModeration') || 'Chat Moderation'}</p>
            </CardContent>
          </Card>

          <Card
            className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => router.push('/superadmin/subscribers')}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('superadmin.newsletterSubscribers') || 'Newsletter Subscribers'}</p>
                <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-purple-600 mt-2">{subscriberStats.total.toLocaleString()}</h3>
              <p className="text-xs text-gray-400 mt-1">{subscriberStats.active.toLocaleString()} {t('superadmin.activeSubscribers') || 'active'}</p>
            </CardContent>
          </Card>
        </div>

        {/* New User Registrations */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">{t('superadmin.newUserRegistrations') || 'New User Registrations'}</CardTitle>
                <CardDescription>{t('superadmin.last30Days') || 'Last 30 days'}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => router.push('/superadmin/users')}
              >
                {t('superadmin.viewAll') || 'View All'}
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={registrationChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="farmer" name={t('superadmin.farmers') || 'Farmers'} stackId="reg" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="doctor" name={t('superadmin.doctors') || 'Doctors'} stackId="reg" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="admin" name={t('superadmin.admin') || 'Admin'} stackId="reg" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="superadmin" name={t('superadmin.superAdmin') || 'Super Admin'} stackId="reg" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">{t('superadmin.activitySnapshot') || 'Activity Snapshot'}</CardTitle>
              <CardDescription>{t('superadmin.basedOnLastLogin') || 'Based on last login'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {activitySnapshotData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={activitySnapshotData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={78}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {activitySnapshotData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    {activitySnapshotData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.totalUsers')}</span>
                      <span className="text-sm font-bold text-gray-900">{activitySnapshot.totalUsers.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                  {t('superadmin.noDataAvailable') || 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">{t('superadmin.dailyActiveUsers') || 'Daily Active Users'}</CardTitle>
              <CardDescription>
                {trackingSinceDate
                  ? `${t('superadmin.trackingSince') || 'Tracking since'} ${trackingSinceDate.toLocaleDateString()}`
                  : (t('superadmin.trackingJustStarted') || 'Login tracking just started - data will build up over the coming days')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={loginTrendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="activeUsers" name={t('superadmin.activeUsers') || 'Active Users'} stroke="#3B82F6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="xl:col-span-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">{t('superadmin.recentActivity') || 'Recent Activity'}</CardTitle>
                  <CardDescription>{t('superadmin.latestSystemActivities') || 'Latest system activities and events'}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  {t('superadmin.viewAll') || 'View All'}
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {formattedActivities.length > 0 ? (
                <div className="space-y-4">
                  {formattedActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50/80 transition-colors duration-150">
                      <div className={`p-2 rounded-lg bg-gray-100 ${activity.color}`}>
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-5">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="p-3 rounded-full bg-gray-100 mb-3">
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">{t('superadmin.noDataAvailable') || 'No data available'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">{t('superadmin.systemHealth') || 'System Health'}</CardTitle>
                  <CardDescription>{t('superadmin.currentSystemStatus') || 'Current system status'}</CardDescription>
                </div>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Database className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.database') || 'Database'}</span>
                      <p className="text-xs text-gray-500">
                        {typeof systemHealth.database.size === 'number'
                          ? `${systemHealth.database.size}MB · ${systemHealth.database.collections} collections`
                          : (t('superadmin.primaryBackup') || 'Primary & Backup')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${healthBadge(systemHealth.database.status).dot}`}></div>
                    <Badge variant="secondary" className={`${healthBadge(systemHealth.database.status).badge} text-xs`}>
                      {healthBadge(systemHealth.database.status).label}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Shield className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.security') || 'Security'}</span>
                      <p className="text-xs text-gray-500">
                        {typeof systemHealth.security.failedLogins === 'number'
                          ? `${systemHealth.security.failedLogins} ${t('superadmin.failedLogins24h') || 'failed logins (24h)'} · ${systemHealth.security.activeSessions} ${t('superadmin.activeSessions') || 'active sessions'}`
                          : (t('superadmin.authServer') || 'Auth Server')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${healthBadge(systemHealth.security.status).dot}`}></div>
                    <Badge variant="secondary" className={`${healthBadge(systemHealth.security.status).badge} text-xs`}>
                      {healthBadge(systemHealth.security.status).label}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Server className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.performance') || 'Performance'}</span>
                      <p className="text-xs text-gray-500">
                        {systemHealth.performance.uptime
                          ? `${t('superadmin.uptime') || 'Uptime'}: ${systemHealth.performance.uptime} · ${systemHealth.performance.errors24h ?? 0} ${t('superadmin.errors24h') || 'errors (24h)'}`
                          : (t('superadmin.serverPerformance') || 'Server Performance')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${healthBadge(systemHealth.performance.status).dot}`}></div>
                    <Badge variant="secondary" className={`${healthBadge(systemHealth.performance.status).badge} text-xs`}>
                      {healthBadge(systemHealth.performance.status).label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start space-y-2 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
            onClick={() => router.push('/superadmin/users')}
          >
            <Users className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-sm">{t('superadmin.manageUsers') || 'Manage Users'}</div>
              <div className="text-xs text-gray-500">{t('superadmin.addEditRemoveUsers') || 'Add, edit, or remove users'}</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start space-y-2 hover:bg-green-50 hover:border-green-200 transition-all duration-200"
            onClick={() => router.push('/superadmin/consultations')}
          >
            <FileText className="h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-sm">{t('superadmin.reviewConsultations') || 'Review Consultations'}</div>
              <div className="text-xs text-gray-500">{t('superadmin.monitorConsultationQuality') || 'Monitor consultation quality'}</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start space-y-2 hover:bg-purple-50 hover:border-purple-200 transition-all duration-200"
            onClick={() => router.push('/superadmin/analytics')}
          >
            <Activity className="h-5 w-5 text-purple-600" />
            <div className="text-left">
              <div className="font-medium text-sm">{t('superadmin.systemAnalytics') || 'System Analytics'}</div>
              <div className="text-xs text-gray-500">{t('superadmin.viewDetailedReports') || 'View detailed reports'}</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start space-y-2 hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
            onClick={() => router.push('/superadmin/settings')}
          >
            <Settings className="h-5 w-5 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-sm">{t('superadmin.settings') || 'Settings'}</div>
              <div className="text-xs text-gray-500">{t('superadmin.configureSystemSettings') || 'Configure system settings'}</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}