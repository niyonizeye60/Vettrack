"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/contexts/LanguageContext"
import { createNotificationTemplate, sendBulkNotification, scheduleNotification, deleteNotificationTemplate } from "@/lib/actions/superadmin"
import { Plus, Send, Clock, FileText, Users, Calendar, Trash2, RotateCcw, Eye, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface NotificationsPageClientProps {
  initialTemplates: any[]
  scheduledNotifications: any[]
  users: any[]
}

export default function NotificationsPageClient({ 
  initialTemplates, 
  scheduledNotifications, 
  users 
}: NotificationsPageClientProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [templates, setTemplates] = useState(initialTemplates)
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false)
  const [isSendNotificationOpen, setIsSendNotificationOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [sentNotifications, setSentNotifications] = useState<any[]>([])
  const [sentLoading, setSentLoading] = useState(false)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<"delete" | "restore" | null>(null)
  const [userSearch, setUserSearch] = useState("")

  const [templateForm, setTemplateForm] = useState({
    name: "",
    title: "",
    message: "",
    type: "system",
    priority: "normal",
    targetRole: "all",
    active: true
  })

  const [scheduleForm, setScheduleForm] = useState({
    scheduledFor: "",
    recurring: ""
  })

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      title: "",
      message: "",
      type: "system",
      priority: "normal",
      targetRole: "all",
      active: true
    })
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.title || !templateForm.message) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createNotificationTemplate(templateForm)
      if (result.success) {
        toast({ title: "Success", description: "Template created successfully" })
        setIsCreateTemplateOpen(false)
        resetTemplateForm()
        window.location.reload()
      } else {
        toast({ title: "Error", description: result.message || "Failed to create template", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendNotification = async () => {
    if (!selectedTemplate || selectedUsers.length === 0) {
      toast({ title: "Error", description: "Please select a template and users", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await sendBulkNotification(selectedTemplate, selectedUsers)
      if (result.success) {
        toast({ title: "Success", description: `Notification sent to ${result.count} users` })
        setIsSendNotificationOpen(false)
        setSelectedUsers([])
        setSelectedTemplate("")
      } else {
        toast({ title: "Error", description: result.message || "Failed to send notification", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScheduleNotification = async () => {
    if (!selectedTemplate || selectedUsers.length === 0 || !scheduleForm.scheduledFor) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await scheduleNotification({
        templateId: selectedTemplate,
        targetUsers: selectedUsers,
        scheduledFor: new Date(scheduleForm.scheduledFor),
        recurring: (scheduleForm.recurring as "daily" | "weekly" | "monthly" | undefined) || undefined
      })
      
      if (result.success) {
        toast({ title: "Success", description: "Notification scheduled successfully" })
        setIsScheduleOpen(false)
        setSelectedUsers([])
        setSelectedTemplate("")
        setScheduleForm({ scheduledFor: "", recurring: "" })
      } else {
        toast({ title: "Error", description: result.message || "Failed to schedule notification", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to schedule notification", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  )

  const selectAllUsers = () => {
    setSelectedUsers(filteredUsers.map(u => u._id))
  }

  const clearSelection = () => {
    setSelectedUsers([])
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return

    setIsSubmitting(true)
    try {
      const result = await deleteNotificationTemplate(templateToDelete)
      if (result.success) {
        toast({ title: "Success", description: "Template deleted successfully" })
        setTemplates(prev => prev.filter(t => t._id !== templateToDelete))
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete template", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  const fetchSentNotifications = async () => {
    setSentLoading(true)
    try {
      const res = await fetch(`/api/notifications?userId=superadmin&role=superadmin&superadmin=true`)
      const data = await res.json()
      setSentNotifications(data.success ? data.notifications : [])
    } catch {
      setSentNotifications([])
    } finally {
      setSentLoading(false)
    }
  }

  const handlePermanentDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}&permanent=true`, { method: 'DELETE' })
      setSentNotifications(prev => prev.filter(n => n._id !== id))
      toast({ title: "Deleted", description: "Notification permanently deleted" })
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" })
    } finally {
      setPermanentDeleteId(null)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!res.ok) throw new Error()
      await fetchSentNotifications()
      toast({ title: "Restored", description: "Notification restored and expiry reset to 48h" })
    } catch {
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" })
    } finally {
      setRestoreId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sentNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sentNotifications.map(n => n._id)))
    }
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/notifications?id=${id}&permanent=true`, { method: 'DELETE' })
      ))
      setSentNotifications(prev => prev.filter(n => !selectedIds.has(n._id)))
      toast({ title: "Deleted", description: `${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''} permanently deleted` })
      setSelectedIds(new Set())
    } catch {
      toast({ title: "Error", description: "Bulk delete failed", variant: "destructive" })
    } finally {
      setBulkAction(null)
    }
  }

  const handleBulkRestore = async () => {
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
      ))
      await fetchSentNotifications()
      toast({ title: "Restored", description: `${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''} restored` })
      setSelectedIds(new Set())
    } catch {
      toast({ title: "Error", description: "Bulk restore failed", variant: "destructive" })
    } finally {
      setBulkAction(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{t('superadmin.notificationManagement') || 'Notification Management'}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('superadmin.manageNotificationTemplates') || 'Manage notification templates and send bulk notifications'}</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetTemplateForm}>
                <FileText className="w-4 h-4 mr-2" />
                {t('superadmin.newTemplate') || 'New Template'}
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={isSendNotificationOpen} onOpenChange={setIsSendNotificationOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                {t('superadmin.sendNotification') || 'Send Notification'}
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">{t('superadmin.templates') || 'Templates'}</TabsTrigger>
          <TabsTrigger value="scheduled">{t('superadmin.scheduled') || 'Scheduled'}</TabsTrigger>
          <TabsTrigger value="manage" onClick={fetchSentNotifications}>Manage Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('superadmin.noTemplates') || 'No Templates'}</h3>
                <p className="text-gray-600 mb-4">{t('superadmin.createFirstTemplate') || 'Create your first notification template'}</p>
                <Button onClick={() => setIsCreateTemplateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('superadmin.createTemplate') || 'Create Template'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template._id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{template.type}</Badge>
                      <Badge variant="secondary">{template.priority}</Badge>
                      {template.active && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {t('superadmin.active') || 'Active'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium mb-2">{template.title}</h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{template.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {t('superadmin.targetRole') || 'Target'}: {template.targetRole}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template._id)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('superadmin.noScheduledNotifications') || 'No Scheduled Notifications'}</h3>
                <p className="text-gray-600">{t('superadmin.scheduleNotificationsDesc') || 'Schedule notifications to be sent later'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {scheduledNotifications.map((notification) => (
                <Card key={notification._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{notification.templateId}</h4>
                        <p className="text-sm text-gray-600">
                          {t('superadmin.scheduledFor') || 'Scheduled for'}: {new Date(notification.scheduledFor).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {notification.targetUsers.length} {t('superadmin.recipients') || 'recipients'}
                        </p>
                      </div>
                      <Badge variant="outline">{notification.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manage Sent Tab */}
        <TabsContent value="manage" className="space-y-4">
          {sentLoading ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-14" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : sentNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Sent Notifications</h3>
                <p className="text-gray-600">No notifications have been sent yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              {/* Bulk action toolbar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border-b border-emerald-100 rounded-t-lg">
                  <span className="text-sm font-medium text-emerald-700">{selectedIds.size} selected</span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                      onClick={() => setBulkAction('restore')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setBulkAction('delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-500"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === sentNotifications.length && sentNotifications.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentNotifications.map(n => {
                      const now = Date.now()
                      const isDeleted = n.deletedBy?.length > 0
                      const isExpired = n.expiresAt ? new Date(n.expiresAt).getTime() < now : false
                      const isSelected = selectedIds.has(n._id)
                      return (
                        <TableRow key={n._id} className={isSelected ? 'bg-emerald-50/60' : isDeleted ? 'bg-red-50/40' : isExpired ? 'bg-amber-50/40' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(n._id)}
                              aria-label="Select row"
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{n.message}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{n.priority}</Badge></TableCell>
                          <TableCell className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs text-gray-500">{n.expiresAt ? new Date(n.expiresAt).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            {isDeleted ? (
                              <Badge className="bg-red-100 text-red-700 text-xs">Deleted by {n.deletedBy.length} user{n.deletedBy.length > 1 ? 's' : ''}</Badge>
                            ) : isExpired ? (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">Expired</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(isDeleted || isExpired) && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-50" title="Restore" onClick={() => setRestoreId(n._id)}>
                                  <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50" title="Permanently Delete" onClick={() => setPermanentDeleteId(n._id)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={open => !open && setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'restore' ? 'Restore Selected Notifications' : 'Delete Selected Notifications'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'restore'
                ? `This will restore ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''} and reset their expiry to 48 hours from now.`
                : `This will permanently delete ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}. This cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            {bulkAction === 'restore' ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleBulkRestore}>Restore</Button>
            ) : (
              <Button variant="destructive" onClick={handleBulkDelete}>Delete Permanently</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={!!permanentDeleteId} onOpenChange={open => !open && setPermanentDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Notification</DialogTitle>
            <DialogDescription>This will permanently delete the notification for all users. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setPermanentDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => permanentDeleteId && handlePermanentDelete(permanentDeleteId)}>Delete Permanently</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={!!restoreId} onOpenChange={open => !open && setRestoreId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Notification</DialogTitle>
            <DialogDescription>This will restore the notification and reset its expiry to 48 hours from now. It will become visible to users again.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setRestoreId(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => restoreId && handleRestore(restoreId)}>Restore</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('superadmin.createTemplate') || 'Create Template'}</DialogTitle>
            <DialogDescription>
              {t('superadmin.createNotificationTemplate') || 'Create a reusable notification template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">{t('superadmin.templateName') || 'Template Name'}</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                placeholder={t('superadmin.templateNamePlaceholder') || 'Enter template name'}
              />
            </div>
            <div>
              <Label htmlFor="template-title">{t('superadmin.notificationTitle') || 'Notification Title'}</Label>
              <Input
                id="template-title"
                value={templateForm.title}
                onChange={(e) => setTemplateForm({...templateForm, title: e.target.value})}
                placeholder={t('superadmin.notificationTitlePlaceholder') || 'Enter notification title'}
              />
            </div>
            <div>
              <Label htmlFor="template-message">{t('superadmin.message') || 'Message'}</Label>
              <Textarea
                id="template-message"
                value={templateForm.message}
                onChange={(e) => setTemplateForm({...templateForm, message: e.target.value})}
                placeholder={t('superadmin.messagePlaceholder') || 'Enter notification message'}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t('superadmin.type') || 'Type'}</Label>
                <Select value={templateForm.type} onValueChange={(value) => setTemplateForm({...templateForm, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t('superadmin.system') || 'System'}</SelectItem>
                    <SelectItem value="user">{t('superadmin.user') || 'User'}</SelectItem>
                    <SelectItem value="security">{t('superadmin.security') || 'Security'}</SelectItem>
                    <SelectItem value="maintenance">{t('superadmin.maintenance') || 'Maintenance'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('superadmin.priority') || 'Priority'}</Label>
                <Select value={templateForm.priority} onValueChange={(value) => setTemplateForm({...templateForm, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('superadmin.low') || 'Low'}</SelectItem>
                    <SelectItem value="normal">{t('superadmin.normal') || 'Normal'}</SelectItem>
                    <SelectItem value="high">{t('superadmin.high') || 'High'}</SelectItem>
                    <SelectItem value="critical">{t('superadmin.critical') || 'Critical'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('superadmin.targetRole') || 'Target Role'}</Label>
                <Select value={templateForm.targetRole} onValueChange={(value) => setTemplateForm({...templateForm, targetRole: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('superadmin.allUsers') || 'All Users'}</SelectItem>
                    <SelectItem value="farmer">{t('superadmin.farmers') || 'Farmers'}</SelectItem>
                    <SelectItem value="doctor">{t('superadmin.doctors') || 'Doctors'}</SelectItem>
                    <SelectItem value="admin">{t('superadmin.admins') || 'Admins'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="template-active"
                checked={templateForm.active}
                onCheckedChange={(checked) => setTemplateForm({...templateForm, active: checked})}
              />
              <Label htmlFor="template-active">{t('superadmin.activeTemplate') || 'Active template'}</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
                {t('superadmin.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleCreateTemplate} disabled={isSubmitting}>
                {isSubmitting ? (t('superadmin.creating') || 'Creating...') : (t('superadmin.create') || 'Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={isSendNotificationOpen} onOpenChange={setIsSendNotificationOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('superadmin.sendBulkNotification') || 'Send Bulk Notification'}</DialogTitle>
            <DialogDescription>
              {t('superadmin.selectTemplateAndUsers') || 'Select a template and target users'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('superadmin.selectTemplate') || 'Select Template'}</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder={t('superadmin.chooseTemplate') || 'Choose a template'} />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.active).map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name} - {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>{t('superadmin.selectUsers') || 'Select Users'} ({selectedUsers.length} selected)</Label>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllUsers}>
                    {t('superadmin.selectAll') || 'Select All'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    {t('superadmin.clearSelection') || 'Clear'}
                  </Button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No users match your search.</p>
                ) : filteredUsers.map((user) => (
                  <div key={user._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user._id}
                      checked={selectedUsers.includes(user._id)}
                      onCheckedChange={() => toggleUserSelection(user._id)}
                    />
                    <Label htmlFor={user._id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span>{user.name}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                          {user.isOnline && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setIsScheduleOpen(true)}
                disabled={!selectedTemplate || selectedUsers.length === 0}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('superadmin.scheduleForLater') || 'Schedule for Later'}
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsSendNotificationOpen(false)}>
                  {t('superadmin.cancel') || 'Cancel'}
                </Button>
                <Button onClick={handleSendNotification} disabled={isSubmitting || !selectedTemplate || selectedUsers.length === 0}>
                  {isSubmitting ? (t('superadmin.sending') || 'Sending...') : (t('superadmin.sendNow') || 'Send Now')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Notification Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superadmin.scheduleNotification') || 'Schedule Notification'}</DialogTitle>
            <DialogDescription>
              {t('superadmin.scheduleNotificationDesc') || 'Schedule this notification to be sent later'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduled-date">{t('superadmin.scheduledDateTime') || 'Scheduled Date & Time'}</Label>
              <Input
                id="scheduled-date"
                type="datetime-local"
                value={scheduleForm.scheduledFor}
                onChange={(e) => setScheduleForm({...scheduleForm, scheduledFor: e.target.value})}
              />
            </div>
            <div>
              <Label>{t('superadmin.recurring') || 'Recurring'} ({t('superadmin.optional') || 'Optional'})</Label>
              <Select value={scheduleForm.recurring} onValueChange={(value) => setScheduleForm({...scheduleForm, recurring: value})}>
                <SelectTrigger>
                  <SelectValue placeholder={t('superadmin.selectRecurring') || 'Select recurring option'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('superadmin.daily') || 'Daily'}</SelectItem>
                  <SelectItem value="weekly">{t('superadmin.weekly') || 'Weekly'}</SelectItem>
                  <SelectItem value="monthly">{t('superadmin.monthly') || 'Monthly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
                {t('superadmin.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleScheduleNotification} disabled={isSubmitting}>
                {isSubmitting ? (t('superadmin.scheduling') || 'Scheduling...') : (t('superadmin.schedule') || 'Schedule')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superadmin.deleteTemplate') || 'Delete Template'}</DialogTitle>
            <DialogDescription>
              {t('superadmin.deleteTemplateConfirm') || 'Are you sure you want to delete this template? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('superadmin.cancel') || 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTemplate} disabled={isSubmitting}>
              {isSubmitting ? (t('superadmin.deleting') || 'Deleting...') : (t('superadmin.delete') || 'Delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}