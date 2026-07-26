"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Users,
  Mail,
  Flag,
  RefreshCw
} from "lucide-react"
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"

interface AnalyticsPageClientProps {
  systemStats: {
    totalUsers: number
    userStats: Record<string, number>
  }
  subscriberStats: {
    total: number
    active: number
  }
  openReportsCount: number
  loginAttemptsTrend: {
    series: Array<{ date: string; successful: number; failed: number }>
    trackingSince: Date | string | null
  }
  newsletterGrowthTrend: Array<{ date: string; total: number }>
  chatReportsTrend: Array<{ date: string; count: number }>
  errorLogsTrend: Array<{ date: string; count: number }>
}

const ROLE_COLORS: Record<string, string> = {
  farmer: '#10B981',
  doctor: '#3B82F6',
  admin: '#F59E0B',
  superadmin: '#8B5CF6',
}

export default function AnalyticsPageClient({
  systemStats,
  subscriberStats,
  openReportsCount,
  loginAttemptsTrend,
  newsletterGrowthTrend,
  chatReportsTrend,
  errorLogsTrend
}: AnalyticsPageClientProps) {
  const { t } = useLanguage()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    window.location.reload()
  }

  const withLabel = (date: string) => ({
    date,
    label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  })

  const loginTrendData = loginAttemptsTrend.series.map(day => ({ ...day, ...withLabel(day.date) }))
  const newsletterGrowthData = newsletterGrowthTrend.map(day => ({ ...day, ...withLabel(day.date) }))
  const chatReportsData = chatReportsTrend.map(day => ({ ...day, ...withLabel(day.date) }))
  const errorLogsData = errorLogsTrend.map(day => ({ ...day, ...withLabel(day.date) }))

  const roleLabels: Record<string, string> = {
    farmer: t('superadmin.farmers') || 'Farmers',
    doctor: t('superadmin.doctors') || 'Doctors',
    admin: t('superadmin.admin') || 'Admin',
    superadmin: t('superadmin.superAdmin') || 'Super Admin',
  }
  const roleDistributionData = Object.entries(systemStats.userStats)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => ({ name: roleLabels[role] || role, value: count, color: ROLE_COLORS[role] || '#9CA3AF' }))

  const trackingSinceDate = loginAttemptsTrend.trackingSince ? new Date(loginAttemptsTrend.trackingSince) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.analytics') || 'Analytics'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.systemAnalytics') || 'System performance and user analytics'}</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('superadmin.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('superadmin.totalUsers') || 'Total Users'}</p>
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{systemStats.totalUsers.toLocaleString()}</h3>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('superadmin.newsletterSubscribers') || 'Newsletter Subscribers'}</p>
              <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-purple-600 mt-2">{subscriberStats.total.toLocaleString()}</h3>
            <p className="text-xs text-gray-500 mt-1">{subscriberStats.active.toLocaleString()} {t('superadmin.activeSubscribers') || 'active'}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('superadmin.openReports') || 'Open Reports'}</p>
              <Flag className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-red-600 mt-2">{openReportsCount.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Login Attempts */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">{t('superadmin.loginAttempts') || 'Login Attempts'}</CardTitle>
          <CardDescription>
            {trackingSinceDate
              ? `${t('superadmin.trackingSince') || 'Tracking since'} ${trackingSinceDate.toLocaleDateString()}`
              : (t('superadmin.trackingJustStarted') || 'Login tracking just started - data will build up over the coming days')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={loginTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="successful" name={t('superadmin.successful') || 'Successful'} stackId="login" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" name={t('superadmin.failed') || 'Failed'} stackId="login" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Role Distribution + Error Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>{t('superadmin.roleDistribution') || 'Role Distribution'}</CardTitle>
            <CardDescription>{t('superadmin.usersByRole') || 'Users by role'}</CardDescription>
          </CardHeader>
          <CardContent>
            {roleDistributionData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={roleDistributionData}
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
                        {roleDistributionData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {roleDistributionData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
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
          <CardHeader>
            <CardTitle>{t('superadmin.errorRate') || 'Error Rate'}</CardTitle>
            <CardDescription>{t('superadmin.systemErrorsOverTime') || 'System errors over time'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={errorLogsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name={t('superadmin.errors') || 'Errors'} stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Newsletter Growth + Moderation Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>{t('superadmin.newsletterGrowth') || 'Newsletter Growth'}</CardTitle>
            <CardDescription>{t('superadmin.subscriberGrowthOverTime') || 'Subscriber growth over time'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={newsletterGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="total" name={t('superadmin.newsletterSubscribers') || 'Subscribers'} stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>{t('superadmin.moderationLoad') || 'Moderation Load'}</CardTitle>
            <CardDescription>{t('superadmin.chatReportsOpenedOverTime') || 'Chat reports opened over time'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chatReportsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name={t('superadmin.reports') || 'Reports'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
