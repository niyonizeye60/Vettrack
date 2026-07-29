"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Calendar, Loader2 } from "lucide-react"

export default function AdminReports() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin-dashboard")
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 font-medium">Active Users</p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.activeUsers || 0}</p>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 font-medium">Support Tickets</p>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.supportTickets || 0}</p>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 font-medium">Recent Appointments</p>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.recentAppointments || 0}</p>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs text-gray-500 font-medium">Platform Growth</p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">+{stats?.growthPercentage || 0}%</p>
        </CardContent>
      </Card>
    </div>
  )
}
