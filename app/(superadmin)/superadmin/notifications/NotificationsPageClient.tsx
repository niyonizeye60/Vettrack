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
import { Plus, Send, Clock, FileText, Users, Calendar, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u._id))
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('superadmin.notificationManagement') || 'Notification Management'}</h1>
          <p className="text-gray-600">{t('superadmin.manageNotificationTemplates') || 'Manage notification templates and send bulk notifications'}</p>
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
      </Tabs>

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
              <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                {users.map((user) => (
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
  )
}