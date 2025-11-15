"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Activity, 
  Database, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react"

interface AnalyticsPageClientProps {
  analyticsData: any
  systemHealth: any
}

export default function AnalyticsPageClient({ analyticsData, systemHealth }: AnalyticsPageClientProps) {
  const { t } = useLanguage()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Refresh page data
    window.location.reload()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'error': return <AlertTriangle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  if (!analyticsData || !systemHealth) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('superadmin.analytics') || 'Analytics'}</h1>
          <p className="text-gray-600">{t('superadmin.systemAnalytics') || 'System performance and user analytics'}</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('superadmin.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="w-4 h-4 mr-2" />
              {t('superadmin.database') || 'Database'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getStatusColor(systemHealth.database.status)}`}>
              {getStatusIcon(systemHealth.database.status)}
              <span className="text-sm font-medium capitalize">{systemHealth.database.status}</span>
            </div>
            {systemHealth.database.size && (
              <p className="text-xs text-gray-500 mt-2">{systemHealth.database.size}MB</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              {t('superadmin.security') || 'Security'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getStatusColor(systemHealth.security.status)}`}>
              {getStatusIcon(systemHealth.security.status)}
              <span className="text-sm font-medium capitalize">{systemHealth.security.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{systemHealth.security.failedLogins} {t('superadmin.failedLogins24h') || 'failed logins (24h)'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              {t('superadmin.performance') || 'Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getStatusColor(systemHealth.performance.status)}`}>
              {getStatusIcon(systemHealth.performance.status)}
              <span className="text-sm font-medium capitalize">{systemHealth.performance.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('superadmin.uptime') || 'Uptime'}: {systemHealth.performance.uptime}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('superadmin.overallStatus') || 'Overall Status'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getStatusColor(systemHealth.overall.status)}`}>
              {getStatusIcon(systemHealth.overall.status)}
              <span className="text-sm font-medium capitalize">{systemHealth.overall.status}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('superadmin.totalUsers') || 'Total Users'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold">{analyticsData.users.total}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              +{analyticsData.users.newLast30Days} {t('superadmin.thisMonth') || 'this month'} ({analyticsData.users.growthRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('superadmin.activeUsers') || 'Active Users'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">{analyticsData.users.active}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('superadmin.currentlyOnline') || 'Currently online'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('superadmin.totalConsultations') || 'Total Consultations'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold">{analyticsData.consultations.total}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              +{analyticsData.consultations.last30Days} {t('superadmin.thisMonth') || 'this month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('superadmin.completionRate') || 'Completion Rate'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold">{analyticsData.consultations.completionRate}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analyticsData.consultations.pending} {t('superadmin.pending') || 'pending'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('superadmin.userDistributionByRole') || 'User Distribution by Role'}</CardTitle>
            <CardDescription>{t('superadmin.breakdownUsersByRoles') || 'Breakdown of users by their roles'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.distribution.userRoles.map((role: any) => (
                <div key={role._id} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{role._id}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(role.count / analyticsData.users.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{role.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Services */}
        <Card>
          <CardHeader>
            <CardTitle>{t('superadmin.popularServices') || 'Popular Services'}</CardTitle>
            <CardDescription>{t('superadmin.mostRequestedConsultationServices') || 'Most requested consultation services'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.distribution.popularServices.map((service: any, index: number) => (
                <div key={service._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                    <span className="text-sm font-medium">{service._id}</span>
                  </div>
                  <span className="text-sm text-gray-600">{service.count} {t('superadmin.requests') || 'requests'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trends */}
      <Card>
        <CardHeader>
          <CardTitle>{t('superadmin.activityTrendsLast7Days') || 'Activity Trends (Last 7 Days)'}</CardTitle>
          <CardDescription>{t('superadmin.userRegistrationsConsultationRequests') || 'User registrations and consultation requests'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">{t('superadmin.userRegistrations') || 'User Registrations'}</h4>
              <div className="space-y-2">
                {analyticsData.trends.registrations.map((trend: any) => (
                  <div key={trend._id} className="flex justify-between text-sm">
                    <span>{new Date(trend._id).toLocaleDateString()}</span>
                    <span className="font-medium">{trend.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">{t('superadmin.consultationRequests') || 'Consultation Requests'}</h4>
              <div className="space-y-2">
                {analyticsData.trends.consultations.map((trend: any) => (
                  <div key={trend._id} className="flex justify-between text-sm">
                    <span>{new Date(trend._id).toLocaleDateString()}</span>
                    <span className="font-medium">{trend.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}