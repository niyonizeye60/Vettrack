'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Activity,
  Server,
  Mail,
  Database,
  Shield,
  Settings,
  ArrowUpRight,
  MoreVertical
} from "lucide-react"
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
      accepted?: number
      rejected?: number
    }
  }
  recentActivities: Array<{
    id: string
    type: string
    message: string
    time: string
  }>
}

export default function SuperAdminDashboardClient({ stats, recentActivities }: SuperAdminDashboardClientProps) {
  const { t } = useLanguage()
  const router = useRouter()

  // Helper function to get icon and color based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return { icon: Users, color: 'text-blue-600' }
      case 'consultation': return { icon: FileText, color: 'text-orange-600' }
      case 'system': return { icon: Database, color: 'text-purple-600' }
      default: return { icon: AlertCircle, color: 'text-gray-600' }
    }
  }

  // Format activities with icons and colors
  const formattedActivities = recentActivities.length > 0 ? recentActivities.map(activity => {
    const { icon, color } = getActivityIcon(activity.type)
    return {
      ...activity,
      icon,
      color
    }
  }) : [
    {
      id: 'fallback-1',
      type: 'system',
      message: t('superadmin.systemUpdate') || 'System running smoothly',
      time: '1 hour ago',
      icon: CheckCircle,
      color: 'text-green-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                {t('superadmin.dashboard') || 'Super Admin Dashboard'}
              </h1>
              <p className="text-gray-600 mt-2 text-base">
                {t('superadmin.manageUsersConsultations') || 'Manage users, consultations, and system settings'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                {t('superadmin.systemHealthy') || 'System Healthy'}
              </Badge>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreVertical className="h-4 w-4" />
                {t('superadmin.actions') || 'Actions'}
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">{t('superadmin.totalUsers')}</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {stats.totalUsers.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">
                  {t('superadmin.farmers')}: {stats.userStats.farmer || 0} | {t('superadmin.doctors')}: {stats.userStats.doctor || 0} | {t('superadmin.admin')}: {stats.userStats.admin || 0} | {t('superadmin.superadmins')}: {stats.userStats.superadmin || 0}
                </span>
                <TrendingUp className="h-3 w-3 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">{t('superadmin.totalConsultations')}</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {stats.totalConsultations.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700">{t('superadmin.allTimeConsultations') || 'All time consultations'}</span>
                <ArrowUpRight className="h-3 w-3 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">{t('superadmin.approved')}</CardTitle>
              <div className="p-2 bg-emerald-500 rounded-lg">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900 mb-1">
                {(stats.consultationStats.accepted || 0).toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700">{t('superadmin.approvedConsultations') || 'Approved consultations'}</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5">
                  +12%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900">{t('superadmin.rejected')}</CardTitle>
              <div className="p-2 bg-red-500 rounded-lg">
                <XCircle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900 mb-1">
                {(stats.consultationStats.rejected || 0).toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700">{t('superadmin.rejectedConsultations') || 'Rejected consultations'}</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs px-2 py-0.5">
                  -3%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <Card className="xl:col-span-2 border-0 shadow-sm hover:shadow-md transition-all duration-200">
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
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
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
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Database className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.database') || 'Database'}</span>
                      <p className="text-xs text-gray-500">{t('superadmin.primaryBackup') || 'Primary & Backup'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {t('superadmin.online') || 'Online'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.authentication') || 'Authentication'}</span>
                      <p className="text-xs text-gray-500">{t('superadmin.authServer') || 'Auth Server'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {t('superadmin.online') || 'Online'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Mail className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{t('superadmin.emailService') || 'Email Service'}</span>
                      <p className="text-xs text-gray-500">{t('superadmin.smtpGateway') || 'SMTP Gateway'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {t('superadmin.online') || 'Online'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Server className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{t('superadmin.serverPerformance') || 'Server Performance'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-600">{t('superadmin.cpuUsage') || 'CPU Usage'}</span>
                      <div className="font-medium text-blue-900">23%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('superadmin.memory') || 'Memory'}</span>
                      <div className="font-medium text-blue-900">67%</div>
                    </div>
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