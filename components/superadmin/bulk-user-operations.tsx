"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLanguage } from "@/contexts/LanguageContext"
import { 
  bulkUpdateUserStatus, 
  bulkDeleteUsers, 
  exportUsers, 
  getUserActivityLogs 
} from "@/lib/actions/superadmin"
import { 
  Download, 
  Upload, 
  CheckSquare, 
  Square, 
  UserCheck, 
  UserX, 
  Trash2, 
  Eye,
  Activity
} from "lucide-react"
import { toast } from "sonner"

interface BulkUserOperationsProps {
  users: any[]
  onUsersUpdate: () => void
}

export default function BulkUserOperations({ users, onUsersUpdate }: BulkUserOperationsProps) {
  const { t } = useLanguage()
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [viewingActivityLogs, setViewingActivityLogs] = useState<any>(null)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [exportFilters, setExportFilters] = useState({
    role: 'all',
    status: 'all',
    dateRange: { start: '', end: '' }
  })

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u._id))
    }
  }

  const handleBulkStatusUpdate = async (status: "active" | "suspended" | "inactive") => {
    if (selectedUsers.length === 0) {
      toast.error("Please select users first")
      return
    }
    
    if (!confirm(`Are you sure you want to ${status} ${selectedUsers.length} users?`)) return

    try {
      const result = await bulkUpdateUserStatus(selectedUsers, status)
      if (result.success) {
        toast.success(result.message)
        setSelectedUsers([])
        onUsersUpdate()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to update users')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select users first")
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) return

    try {
      const result = await bulkDeleteUsers(selectedUsers)
      if (result.success) {
        toast.success(result.message)
        setSelectedUsers([])
        onUsersUpdate()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to delete users')
    }
  }

  const handleExportUsers = async () => {
    setIsExporting(true)
    try {
      const filters: any = {}
      
      if (exportFilters.role !== 'all') {
        filters.role = exportFilters.role
      }
      
      if (exportFilters.status !== 'all') {
        filters.status = exportFilters.status
      }
      
      if (exportFilters.dateRange.start && exportFilters.dateRange.end) {
        filters.dateRange = {
          start: new Date(exportFilters.dateRange.start),
          end: new Date(exportFilters.dateRange.end)
        }
      }

      const result = await exportUsers(filters)
      
      if (result.success) {
        // Convert to CSV and download
        const csvContent = [
          Object.keys(result.data[0]).join(','),
          ...result.data.map(row => Object.values(row).map(val => 
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
          ).join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast.success(`Exported ${result.count} users`)
      } else {
        toast.error(result.message || 'Failed to export users')
      }
    } catch (error) {
      toast.error('Failed to export users')
    } finally {
      setIsExporting(false)
    }
  }

  const handleViewActivityLogs = async (user: any) => {
    setViewingActivityLogs(user)
    try {
      const logs = await getUserActivityLogs(user._id, 50)
      setActivityLogs(logs)
    } catch (error) {
      toast.error('Failed to load activity logs')
      setActivityLogs([])
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions Header */}
      <Card>
        <CardHeader>
          <CardTitle>{t('superadmin.bulkOperations') || 'Bulk Operations'}</CardTitle>
          <CardDescription>
            {t('superadmin.performBulkActions') || 'Perform actions on multiple users at once'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  {t('superadmin.exportUsers') || 'Export Users'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('superadmin.exportUsers') || 'Export Users'}</DialogTitle>
                  <DialogDescription>
                    {t('superadmin.configureExportFilters') || 'Configure export filters and download user data'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('superadmin.role') || 'Role'}</Label>
                      <Select value={exportFilters.role} onValueChange={(value) => setExportFilters({...exportFilters, role: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('superadmin.allRoles') || 'All Roles'}</SelectItem>
                          <SelectItem value="farmer">{t('superadmin.farmers') || 'Farmers'}</SelectItem>
                          <SelectItem value="doctor">{t('superadmin.doctors') || 'Doctors'}</SelectItem>
                          <SelectItem value="admin">{t('superadmin.admins') || 'Admins'}</SelectItem>
                          <SelectItem value="superadmin">{t('superadmin.superAdmins') || 'Super Admins'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('superadmin.status') || 'Status'}</Label>
                      <Select value={exportFilters.status} onValueChange={(value) => setExportFilters({...exportFilters, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('superadmin.allStatus') || 'All Status'}</SelectItem>
                          <SelectItem value="active">{t('superadmin.active') || 'Active'}</SelectItem>
                          <SelectItem value="suspended">{t('superadmin.suspended') || 'Suspended'}</SelectItem>
                          <SelectItem value="inactive">{t('superadmin.inactive') || 'Inactive'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('superadmin.startDate') || 'Start Date'}</Label>
                      <Input
                        type="date"
                        value={exportFilters.dateRange.start}
                        onChange={(e) => setExportFilters({
                          ...exportFilters, 
                          dateRange: {...exportFilters.dateRange, start: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label>{t('superadmin.endDate') || 'End Date'}</Label>
                      <Input
                        type="date"
                        value={exportFilters.dateRange.end}
                        onChange={(e) => setExportFilters({
                          ...exportFilters, 
                          dateRange: {...exportFilters.dateRange, end: e.target.value}
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button onClick={handleExportUsers} disabled={isExporting}>
                      {isExporting ? (t('superadmin.exporting') || 'Exporting...') : (t('superadmin.export') || 'Export')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* User Selection Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('superadmin.selectUsers') || 'Select Users'}</CardTitle>
              <CardDescription>
                {selectedUsers.length} {t('superadmin.usersSelected') || 'users selected'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedUsers.length === users.length ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  {t('superadmin.deselectAll') || 'Deselect All'}
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {t('superadmin.selectAll') || 'Select All'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('superadmin.user') || 'User'}</TableHead>
                  <TableHead>{t('superadmin.role') || 'Role'}</TableHead>
                  <TableHead>{t('superadmin.status') || 'Status'}</TableHead>
                  <TableHead>{t('superadmin.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user._id)}
                        onCheckedChange={() => toggleUserSelection(user._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                        className={user.status === 'suspended' ? 'bg-red-100 text-red-800' : ''}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewActivityLogs(user)}
                      >
                        <Activity className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('superadmin.bulkActions') || 'Bulk Actions'}</CardTitle>
            <CardDescription>
              {t('superadmin.performActionsOnSelected') || 'Perform actions on selected users'} ({selectedUsers.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => handleBulkStatusUpdate('active')}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {t('superadmin.activateSelected') || 'Activate Selected'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkStatusUpdate('suspended')}
              >
                <UserX className="w-4 h-4 mr-2" />
                {t('superadmin.suspendSelected') || 'Suspend Selected'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('superadmin.deleteSelected') || 'Delete Selected'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedUsers([])}
              >
                {t('superadmin.clearSelection') || 'Clear Selection'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Logs Dialog */}
      <Dialog open={!!viewingActivityLogs} onOpenChange={() => setViewingActivityLogs(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('superadmin.userActivityLogs') || 'User Activity Logs'} - {viewingActivityLogs?.name}
            </DialogTitle>
            <DialogDescription>
              {t('superadmin.recentUserActivity') || 'Recent activity and login history'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activityLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('superadmin.noActivityLogs') || 'No activity logs found'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log._id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{log.action}</h4>
                        <span className="text-xs text-gray-500">{getTimeAgo(log.createdAt)}</span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {log.ipAddress && (
                          <span>IP: {log.ipAddress}</span>
                        )}
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}