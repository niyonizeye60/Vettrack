"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Users, Calendar, Download, Eye } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AdminReports() {
  const { t } = useLanguage()

  const reports = [
    {
      id: 1,
      title: t('admin.userActivityReport'),
      description: t('admin.userActivityDescription'),
      icon: Users,
      lastGenerated: "2024-01-22",
      status: "ready"
    },
    {
      id: 2,
      title: t('admin.appointmentAnalytics'),
      description: t('admin.appointmentAnalyticsDescription'),
      icon: Calendar,
      lastGenerated: "2024-01-21",
      status: "ready"
    },
    {
      id: 3,
      title: t('admin.performanceMetrics'),
      description: t('admin.performanceMetricsDescription'),
      icon: TrendingUp,
      lastGenerated: "2024-01-20",
      status: "generating"
    },
    {
      id: 4,
      title: t('admin.regionalOverview'),
      description: t('admin.regionalOverviewDescription'),
      icon: BarChart3,
      lastGenerated: "2024-01-19",
      status: "ready"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <p className="text-sm text-muted-foreground">{t('admin.availableReports')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">18</div>
            <p className="text-sm text-muted-foreground">{t('admin.generatedThisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <p className="text-sm text-muted-foreground">{t('admin.scheduledReports')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-purple-600">156</div>
            <p className="text-sm text-muted-foreground">{t('admin.totalDownloads')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.status === 'ready' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {t(`admin.${report.status}`)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {t('admin.lastGenerated')}: {report.lastGenerated}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('admin.view')}
                    </Button>
                    {report.status === 'ready' && (
                      <Button size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        {t('admin.download')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              {t('admin.generateCustomReport')}
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Calendar className="h-6 w-6" />
              {t('admin.scheduleReport')}
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Download className="h-6 w-6" />
              {t('admin.exportAllData')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}