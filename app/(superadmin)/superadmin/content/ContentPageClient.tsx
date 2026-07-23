"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import RichTextEditor from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/actions/superadmin"
import { Plus, Edit, Trash2, Megaphone, AlertTriangle, Info, Shield } from "lucide-react"

interface ContentPageClientProps {
  initialAnnouncements: any[]
}

export default function ContentPageClient({ initialAnnouncements }: ContentPageClientProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<any>(null)

  const [formData, setFormData] = useState<{
    title: string
    content: string
    type: "general" | "maintenance" | "feature" | "security"
    priority: "low" | "normal" | "high" | "critical"
    active: boolean
    sendEmail: boolean
  }>({
    title: "",
    content: "",
    type: "general",
    priority: "normal",
    active: true,
    sendEmail: false
  })

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "general",
      priority: "normal",
      active: true,
      sendEmail: false
    })
  }

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createAnnouncement(formData)
      if (result.success) {
        toast({ title: "Success", description: "Announcement created successfully" })
        setIsCreateOpen(false)
        resetForm()
        // Refresh announcements
        window.location.reload()
      } else {
        toast({ title: "Error", description: result.message || "Failed to create announcement", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingAnnouncement || !formData.title || !formData.content) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateAnnouncement(editingAnnouncement._id, formData)
      if (result.success) {
        toast({ title: "Success", description: "Announcement updated successfully" })
        setEditingAnnouncement(null)
        resetForm()
        window.location.reload()
      } else {
        toast({ title: "Error", description: result.message || "Failed to update announcement", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!announcementToDelete) return

    try {
      const result = await deleteAnnouncement(announcementToDelete._id)
      if (result.success) {
        toast({ title: "Success", description: "Announcement deleted successfully" })
        setAnnouncements(prev => prev.filter(a => a._id !== announcementToDelete._id))
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete announcement", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete announcement", variant: "destructive" })
    } finally {
      setDeleteDialogOpen(false)
      setAnnouncementToDelete(null)
    }
  }

  const openDeleteDialog = (announcement: any) => {
    setAnnouncementToDelete(announcement)
    setDeleteDialogOpen(true)
  }

  const openEditDialog = (announcement: any) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type as "general" | "maintenance" | "feature" | "security",
      priority: announcement.priority as "low" | "normal" | "high" | "critical",
      active: announcement.active,
      sendEmail: false
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <AlertTriangle className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'feature': return <Info className="w-4 h-4" />
      default: return <Megaphone className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string): "destructive" | "secondary" | "outline" | "default" => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'secondary'
      case 'normal': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.contentManagement') || 'Content Management'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.manageSystemContent') || 'Manage system announcements and content'}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              {t('superadmin.newAnnouncement') || 'New Announcement'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{t('superadmin.createAnnouncement') || 'Create Announcement'}</DialogTitle>
              <DialogDescription>
                {t('superadmin.createSystemAnnouncement') || 'Create a new system-wide announcement'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div>
                <Label htmlFor="title">{t('superadmin.title') || 'Title'}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={t('superadmin.announcementTitle') || 'Announcement title'}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('superadmin.content') || 'Content'}</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(html) => setFormData({...formData, content: html})}
                  placeholder={t('superadmin.announcementContent') || 'Announcement content'}
                  minHeight={160}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('superadmin.type') || 'Type'}</Label>
                  <Select value={formData.type} onValueChange={(value: "general" | "maintenance" | "feature" | "security") => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t('superadmin.general') || 'General'}</SelectItem>
                      <SelectItem value="maintenance">{t('superadmin.maintenance') || 'Maintenance'}</SelectItem>
                      <SelectItem value="feature">{t('superadmin.feature') || 'Feature'}</SelectItem>
                      <SelectItem value="security">{t('superadmin.security') || 'Security'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.priority') || 'Priority'}</Label>
                  <Select value={formData.priority} onValueChange={(value: "low" | "normal" | "high" | "critical") => setFormData({...formData, priority: value})}>
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
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                  />
                  <Label htmlFor="active">{t('superadmin.activeAnnouncement') || 'Active announcement'}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) => setFormData({...formData, sendEmail: checked})}
                  />
                  <Label htmlFor="sendEmail">{t('superadmin.sendEmailNotification') || 'Send email notification to all users'}</Label>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('superadmin.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? (t('superadmin.creating') || 'Creating...') : (t('superadmin.create') || 'Create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Megaphone className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('superadmin.noAnnouncements') || 'No Announcements'}</h3>
              <p className="text-gray-600 mb-4">{t('superadmin.noAnnouncementsDesc') || 'Create your first system announcement'}</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('superadmin.createFirst') || 'Create First Announcement'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(announcement.type)}
                    <div>
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant="outline">{announcement.type}</Badge>
                        {announcement.active && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {t('superadmin.active') || 'Active'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(announcement)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(announcement)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="text-gray-700 mb-3 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                />
                <div className="text-sm text-gray-500">
                  {t('superadmin.created') || 'Created'}: {new Date(announcement.createdAt).toLocaleDateString()}
                  {announcement.updatedAt && (
                    <span className="ml-4">
                      {t('superadmin.updated') || 'Updated'}: {new Date(announcement.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('superadmin.editAnnouncement') || 'Edit Announcement'}</DialogTitle>
            <DialogDescription>
              {t('superadmin.updateAnnouncementDetails') || 'Update announcement details'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <Label htmlFor="edit-title">{t('superadmin.title') || 'Title'}</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('superadmin.content') || 'Content'}</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData({...formData, content: html})}
                minHeight={160}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('superadmin.type') || 'Type'}</Label>
                <Select value={formData.type} onValueChange={(value: "general" | "maintenance" | "feature" | "security") => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('superadmin.general') || 'General'}</SelectItem>
                    <SelectItem value="maintenance">{t('superadmin.maintenance') || 'Maintenance'}</SelectItem>
                    <SelectItem value="feature">{t('superadmin.feature') || 'Feature'}</SelectItem>
                    <SelectItem value="security">{t('superadmin.security') || 'Security'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('superadmin.priority') || 'Priority'}</Label>
                <Select value={formData.priority} onValueChange={(value: "low" | "normal" | "high" | "critical") => setFormData({...formData, priority: value})}>
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
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
              <Label htmlFor="edit-active">{t('superadmin.activeAnnouncement') || 'Active announcement'}</Label>
            </div>
          </div>
          <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
              {t('superadmin.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? (t('superadmin.updating') || 'Updating...') : (t('superadmin.update') || 'Update')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superadmin.deleteAnnouncement')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('superadmin.confirmDelete')} "{announcementToDelete?.title}"? {t('superadmin.confirmAction')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('superadmin.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {t('superadmin.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}