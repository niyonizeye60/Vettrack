"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const mockTickets = [
  {
    id: "1",
    title: "Login Issues",
    farmer: "John Doe",
    priority: "high",
    status: "open",
    createdAt: "2024-01-22 10:30 AM"
  },
  {
    id: "2", 
    title: "Animal Registration Problem",
    farmer: "Mary Johnson",
    priority: "medium",
    status: "in-progress",
    createdAt: "2024-01-22 09:15 AM"
  },
  {
    id: "3",
    title: "Payment Issue",
    farmer: "Peter Smith", 
    priority: "low",
    status: "resolved",
    createdAt: "2024-01-21 03:45 PM"
  }
]

export default function AdminSupport() {
  const { t } = useLanguage()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800"
      case "medium": return "bg-yellow-100 text-yellow-800"
      case "low": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800"
      case "in-progress": return "bg-yellow-100 text-yellow-800"
      case "resolved": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <p className="text-sm text-muted-foreground">{t('admin.openTickets')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">5</div>
            <p className="text-sm text-muted-foreground">{t('admin.inProgress')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">28</div>
            <p className="text-sm text-muted-foreground">{t('admin.resolved')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-red-600">3</div>
            <p className="text-sm text-muted-foreground">{t('admin.highPriority')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            {t('admin.supportTickets')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{ticket.title}</h4>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {t(`admin.${ticket.priority}`)}
                    </Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {t(`admin.${ticket.status.replace('-', '')}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{t('farmer.farmer')}: {ticket.farmer}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ticket.createdAt}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    {t('admin.view')}
                  </Button>
                  {ticket.status !== 'resolved' && (
                    <Button size="sm">
                      {ticket.status === 'open' ? t('admin.assign') : t('admin.resolve')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}