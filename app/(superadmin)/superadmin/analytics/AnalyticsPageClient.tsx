"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface AnalyticsPageClientProps {
  analyticsData: {
    users: {
      total: number
      newLast30Days: number
      growthRate: string
    }
    consultations: {
      total: number
      last30Days: number
      completionRate: string
      statusBreakdown: {
        pending: number
        accepted: number
        rejected: number
        completed: number
      }
    }
    consultationTrend: Array<{ date: string; count: number }>
    popularServices: Array<{ _id: string; count: number }>
  } | null
}

export default function AnalyticsPageClient({ analyticsData }: AnalyticsPageClientProps) {
  const { t } = useLanguage()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    window.location.reload()
  }

  if (!analyticsData) {
    return (
      <div className="p-4 sm:p-6 min-h-full">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('superadmin.failedToLoadAnalytics') || 'Failed to Load Analytics'}</h2>
          <p className="text-gray-600 mb-4">{t('superadmin.unableToFetchAnalyticsData') || 'Unable to fetch analytics data'}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const consultationTrendData = analyticsData.consultationTrend.map(day => ({
    ...day,
    label: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }))

  const statusBreakdownData = [
    { name: t('superadmin.pending') || 'Pending', value: analyticsData.consultations.statusBreakdown.pending, color: '#F59E0B' },
    { name: t('superadmin.accepted') || 'Accepted', value: analyticsData.consultations.statusBreakdown.accepted, color: '#3B82F6' },
    { name: t('superadmin.completed') || 'Completed', value: analyticsData.consultations.statusBreakdown.completed, color: '#10B981' },
    { name: t('superadmin.rejected') || 'Rejected', value: analyticsData.consultations.statusBreakdown.rejected, color: '#EF4444' },
  ].filter(item => item.value > 0)

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{t('superadmin.analytics') || 'Analytics'}</h1>
            <p className="text-gray-500 mt-1 text-sm">{t('superadmin.systemAnalytics') || 'System performance and user analytics'}</p>
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
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.users.total.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">
                +{analyticsData.users.newLast30Days} {t('superadmin.thisMonth') || 'this month'} ({analyticsData.users.growthRate}%)
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('superadmin.totalConsultations') || 'Total Consultations'}</p>
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.consultations.total.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">
                +{analyticsData.consultations.last30Days} {t('superadmin.thisMonth') || 'this month'}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-500 font-medium">{t('superadmin.completionRate') || 'Completion Rate'}</p>
                <TrendingUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{analyticsData.consultations.completionRate}%</h3>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.consultations.statusBreakdown.completed} {t('superadmin.completed') || 'completed'} · {analyticsData.consultations.statusBreakdown.pending} {t('superadmin.pending') || 'pending'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Consultation Volume */}
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">{t('superadmin.consultationVolume') || 'Consultation Volume'}</CardTitle>
            <CardDescription>{t('superadmin.last30Days') || 'Last 30 days'}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={consultationTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#d1d5db" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name={t('superadmin.totalConsultations') || 'Consultations'} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown + Popular Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle>{t('superadmin.consultationStatusBreakdown') || 'Consultation Status'}</CardTitle>
              <CardDescription>{t('superadmin.currentConsultationsByStatus') || 'Current consultations by status'}</CardDescription>
            </CardHeader>
            <CardContent>
              {statusBreakdownData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statusBreakdownData}
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
                          {statusBreakdownData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    {statusBreakdownData.map((item) => (
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

          {/* Popular Services */}
          <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle>{t('superadmin.popularServices') || 'Popular Services'}</CardTitle>
              <CardDescription>{t('superadmin.mostRequestedConsultationServices') || 'Most requested consultation services'}</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.popularServices.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.popularServices.map((service, index) => (
                    <div key={service._id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                        <span className="text-sm font-medium">{service._id}</span>
                      </div>
                      <span className="text-sm text-gray-600">{service.count} {t('superadmin.requests') || 'requests'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                  {t('superadmin.noDataAvailable') || 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
