"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, Trash2, RotateCcw, Search, Eye } from "lucide-react"
import { getCurrentUser } from "@/lib/actions/auth"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  priority: string
  read: boolean
  createdAt: string
  expiresAt?: string
  deletedBy: string[]
}

type FilterType = "all" | "deleted" | "expired" | "active"

export default function SuperAdminNotificationsManagePage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      setUser(userData)
      if (userData?._id) await fetchAll(userData._id)
      setLoading(false)
    }
    init()
  }, [])

  const fetchAll = async (userId: string) => {
    const res = await fetch(`/api/notifications?userId=${userId}&role=superadmin&superadmin=true`)
    const data = await res.json()
    setNotifications(data.success ? data.notifications : [])
  }

  const handlePermanentDelete = async (id: string) => {
    await fetch(`/api/notifications?id=${id}&permanent=true`, { method: "DELETE" })
    setNotifications(prev => prev.filter(n => n._id !== id))
    setDeleteId(null)
  }

  const handleRestore = async (id: string, userId: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId })
    })
    if (user?._id) await fetchAll(user._id)
    setRestoreId(null)
  }

  const now = Date.now()

  const filtered = notifications.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase())
    const isDeleted = n.deletedBy?.length > 0
    const isExpired = n.expiresAt ? new Date(n.expiresAt).getTime() < now : false

    if (!matchSearch) return false
    if (filter === "deleted") return isDeleted
    if (filter === "expired") return isExpired && !isDeleted
    if (filter === "active") return !isDeleted && !isExpired
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const counts = {
    all: notifications.length,
    active: notifications.filter(n => !n.deletedBy?.length && (!n.expiresAt || new Date(n.expiresAt).getTime() > now)).length,
    deleted: notifications.filter(n => n.deletedBy?.length > 0).length,
    expired: notifications.filter(n => n.expiresAt && new Date(n.expiresAt).getTime() < now && !n.deletedBy?.length).length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl">
          <Bell className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications Management</h1>
          <p className="text-sm text-gray-500">View, restore, or permanently delete all notifications</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["all", "active", "deleted", "expired"] as FilterType[]).map(f => (
          <Card
            key={f}
            onClick={() => setFilter(f)}
            className={`cursor-pointer border-2 transition-all ${filter === f ? "border-emerald-500 bg-emerald-50" : "border-transparent"}`}
          >
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-medium capitalize">{f}</p>
              <p className="text-2xl font-bold text-gray-900">{counts[f]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-xl bg-white/90">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filter} onValueChange={v => setFilter(v as FilterType)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({counts.all})</SelectItem>
                <SelectItem value="active">Active ({counts.active})</SelectItem>
                <SelectItem value="deleted">Deleted by users ({counts.deleted})</SelectItem>
                <SelectItem value="expired">Expired ({counts.expired})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">No notifications found</TableCell>
                  </TableRow>
                ) : filtered.map(n => {
                  const isDeleted = n.deletedBy?.length > 0
                  const isExpired = n.expiresAt ? new Date(n.expiresAt).getTime() < now : false
                  return (
                    <TableRow key={n._id} className={isDeleted ? "bg-red-50/50" : isExpired ? "bg-amber-50/50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{n.message}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={getPriorityColor(n.priority)}>{n.priority}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {n.expiresAt ? new Date(n.expiresAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {isDeleted ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            Deleted by {n.deletedBy.length} user{n.deletedBy.length > 1 ? "s" : ""}
                          </Badge>
                        ) : isExpired ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">Expired</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(isDeleted || isExpired) && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-emerald-50"
                              title="Restore"
                              onClick={() => setRestoreId(n._id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            title="Permanently Delete"
                            onClick={() => setDeleteId(n._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the notification for all users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handlePermanentDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={!!restoreId} onOpenChange={open => !open && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Notification</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the notification and reset its expiry to 48 hours from now. It will become visible to users again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreId && user?._id && handleRestore(restoreId, user._id)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
