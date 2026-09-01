"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Eye, Megaphone, AlertTriangle, Info, Shield, Users } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Skeleton } from "@/components/ui/skeleton"
import RichTextEditor from "@/components/ui/rich-text-editor"
import { useToast } from "@/hooks/use-toast"
import { getAdminBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, type BlogPostInput } from "@/lib/actions/blog"
import {
  getAdminAnnouncements,
  getTargetableUsers,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AnnouncementInput,
  type TargetableUser,
} from "@/lib/actions/announcements"
import AnnouncementTargetFields from "@/components/announcements/announcement-target-fields"
import { getAnnouncementTargetLabel } from "@/lib/announcement-utils"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  image: string
  category: string
  author: string
  status: "draft" | "published"
  views: number
  createdAt: string | Date
  updatedAt: string | Date
}

const emptyBlogFormData: BlogPostInput = {
  title: '',
  excerpt: '',
  content: '',
  image: '',
  category: '',
  author: '',
  status: 'draft'
}

interface Announcement {
  id: string
  title: string
  content: string
  type: "general" | "maintenance" | "feature" | "security"
  priority: "low" | "normal" | "high" | "critical"
  active: boolean
  targetType: "all" | "role" | "user"
  targetRole: "farmer" | "doctor" | "admin" | null
  targetUserId: string | null
  targetUserName: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

const emptyAnnouncementFormData: AnnouncementInput = {
  title: '',
  content: '',
  type: 'general',
  priority: 'normal',
  active: true,
  targetType: 'all',
  targetRole: '',
  targetUserId: '',
  targetUserName: ''
}

function announcementTypeIcon(type: string, className: string) {
  switch (type) {
    case 'maintenance': return <AlertTriangle className={className} />
    case 'security': return <Shield className={className} />
    case 'feature': return <Info className={className} />
    default: return <Megaphone className={className} />
  }
}

function announcementPriorityBadgeVariant(priority: string): "destructive" | "secondary" | "outline" | "default" {
  switch (priority) {
    case 'critical': return 'destructive'
    case 'high': return 'secondary'
    default: return 'outline'
  }
}

export default function AdminContentManagement() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isEditPostOpen, setIsEditPostOpen] = useState(false)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogLoading, setBlogLoading] = useState(true)
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null)
  const [blogFormData, setBlogFormData] = useState<BlogPostInput>(emptyBlogFormData)
  const [isSubmittingPost, setIsSubmittingPost] = useState(false)
  const [deleteBlogTarget, setDeleteBlogTarget] = useState<BlogPost | null>(null)
  const [isDeletingPost, setIsDeletingPost] = useState(false)
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false)
  const [isEditAnnouncementOpen, setIsEditAnnouncementOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null)
  const [announcementFormData, setAnnouncementFormData] = useState<AnnouncementInput>(emptyAnnouncementFormData)
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false)
  const [deleteAnnouncementTarget, setDeleteAnnouncementTarget] = useState<Announcement | null>(null)
  const [isDeletingAnnouncement, setIsDeletingAnnouncement] = useState(false)
  const [targetableUsers, setTargetableUsers] = useState<TargetableUser[]>([])
  const [targetableUsersLoading, setTargetableUsersLoading] = useState(true)

  useEffect(() => {
    fetchBlogPosts()
    fetchAnnouncements()
    fetchTargetableUsers()

    // Keep view counts, post status, and announcements current without requiring a manual refresh.
    const interval = setInterval(() => {
      fetchBlogPosts({ silent: true })
      fetchAnnouncements({ silent: true })
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchBlogPosts = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setBlogLoading(true)
    try {
      const posts = await getAdminBlogPosts()
      setBlogPosts(posts)
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      if (!opts?.silent) setBlogLoading(false)
    }
  }

  const resetBlogForm = () => setBlogFormData(emptyBlogFormData)

  const handleCreateBlogPost = async () => {
    if (!blogFormData.title || !blogFormData.content) {
      toast({ title: "Error", description: "Please fill in the title and content", variant: "destructive" })
      return
    }
    setIsSubmittingPost(true)
    try {
      const result = await createBlogPost(blogFormData)
      if (result.success) {
        toast({ title: "Success", description: "Blog post created successfully" })
        setIsCreatePostOpen(false)
        resetBlogForm()
        await fetchBlogPosts()
      } else {
        toast({ title: "Error", description: result.message || "Failed to create blog post", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create blog post", variant: "destructive" })
    } finally {
      setIsSubmittingPost(false)
    }
  }

  const openEditPostDialog = (post: BlogPost) => {
    setCurrentPost(post)
    setBlogFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image,
      category: post.category,
      author: post.author,
      status: post.status
    })
    setIsEditPostOpen(true)
  }

  const handleUpdateBlogPost = async () => {
    if (!currentPost || !blogFormData.title || !blogFormData.content) {
      toast({ title: "Error", description: "Please fill in the title and content", variant: "destructive" })
      return
    }
    setIsSubmittingPost(true)
    try {
      const result = await updateBlogPost(currentPost.id, blogFormData)
      if (result.success) {
        toast({ title: "Success", description: "Blog post updated successfully" })
        setIsEditPostOpen(false)
        setCurrentPost(null)
        resetBlogForm()
        await fetchBlogPosts()
      } else {
        toast({ title: "Error", description: result.message || "Failed to update blog post", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update blog post", variant: "destructive" })
    } finally {
      setIsSubmittingPost(false)
    }
  }

  const confirmDeleteBlogPost = async () => {
    if (!deleteBlogTarget) return
    setIsDeletingPost(true)
    try {
      const result = await deleteBlogPost(deleteBlogTarget.id)
      if (result.success) {
        toast({ title: "Success", description: "Blog post deleted successfully" })
        setBlogPosts(prev => prev.filter(p => p.id !== deleteBlogTarget.id))
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete blog post", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete blog post", variant: "destructive" })
    } finally {
      setIsDeletingPost(false)
      setDeleteBlogTarget(null)
    }
  }

  const handleViewPost = (post: BlogPost) => {
    if (post.status !== 'published') {
      toast({ title: "Draft post", description: "Publish this post before it can be viewed on the public blog" })
      return
    }
    window.open(`/blog/${post.id}`, '_blank')
  }

  const fetchAnnouncements = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setAnnouncementsLoading(true)
    try {
      const data = await getAdminAnnouncements()
      setAnnouncements(data)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      if (!opts?.silent) setAnnouncementsLoading(false)
    }
  }

  const fetchTargetableUsers = async () => {
    setTargetableUsersLoading(true)
    try {
      const users = await getTargetableUsers()
      setTargetableUsers(users)
    } catch (error) {
      console.error('Failed to fetch targetable users:', error)
    } finally {
      setTargetableUsersLoading(false)
    }
  }

  const resetAnnouncementForm = () => setAnnouncementFormData(emptyAnnouncementFormData)

  const validateAnnouncementTarget = () => {
    if (!announcementFormData.title || !announcementFormData.content) {
      toast({ title: "Error", description: "Please fill in the title and content", variant: "destructive" })
      return false
    }
    if (announcementFormData.targetType === 'role' && !announcementFormData.targetRole) {
      toast({ title: "Error", description: "Please select a recipient role", variant: "destructive" })
      return false
    }
    if (announcementFormData.targetType === 'user' && !announcementFormData.targetUserId) {
      toast({ title: "Error", description: "Please select a recipient", variant: "destructive" })
      return false
    }
    return true
  }

  const handleCreateAnnouncement = async () => {
    if (!validateAnnouncementTarget()) return
    setIsSubmittingAnnouncement(true)
    try {
      const result = await createAnnouncement(announcementFormData)
      if (result.success) {
        toast({ title: "Success", description: "Announcement created successfully" })
        setIsCreateAnnouncementOpen(false)
        resetAnnouncementForm()
        await fetchAnnouncements()
      } else {
        toast({ title: "Error", description: result.message || "Failed to create announcement", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" })
    } finally {
      setIsSubmittingAnnouncement(false)
    }
  }

  const openEditAnnouncementDialog = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement)
    setAnnouncementFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      active: announcement.active,
      targetType: announcement.targetType,
      targetRole: announcement.targetRole || '',
      targetUserId: announcement.targetUserId || '',
      targetUserName: announcement.targetUserName || ''
    })
    setIsEditAnnouncementOpen(true)
  }

  const handleUpdateAnnouncement = async () => {
    if (!currentAnnouncement || !validateAnnouncementTarget()) return
    setIsSubmittingAnnouncement(true)
    try {
      const result = await updateAnnouncement(currentAnnouncement.id, announcementFormData)
      if (result.success) {
        toast({ title: "Success", description: "Announcement updated successfully" })
        setIsEditAnnouncementOpen(false)
        setCurrentAnnouncement(null)
        resetAnnouncementForm()
        await fetchAnnouncements()
      } else {
        toast({ title: "Error", description: result.message || "Failed to update announcement", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" })
    } finally {
      setIsSubmittingAnnouncement(false)
    }
  }

  const confirmDeleteAnnouncement = async () => {
    if (!deleteAnnouncementTarget) return
    setIsDeletingAnnouncement(true)
    try {
      const result = await deleteAnnouncement(deleteAnnouncementTarget.id)
      if (result.success) {
        toast({ title: "Success", description: "Announcement deleted successfully" })
        setAnnouncements(prev => prev.filter(a => a.id !== deleteAnnouncementTarget.id))
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete announcement", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete announcement", variant: "destructive" })
    } finally {
      setIsDeletingAnnouncement(false)
      setDeleteAnnouncementTarget(null)
    }
  }


  return (
    <div className="space-y-6">
      <Tabs defaultValue="blog" className="w-full">
        <TabsList className="flex w-full justify-start gap-1 overflow-x-auto sm:grid sm:grid-cols-2">
          <TabsTrigger value="blog" className="flex-shrink-0">{t('content.blogPosts')}</TabsTrigger>
          <TabsTrigger value="announcements" className="flex-shrink-0">{t('content.announcements')}</TabsTrigger>
        </TabsList>

        <TabsContent value="blog" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold text-gray-900">{t('content.blogPosts')}</CardTitle>
                <Button onClick={() => setIsCreatePostOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('content.newPost')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead>{t('content.title')}</TableHead>
                    <TableHead>{t('content.status')}</TableHead>
                    <TableHead>{t('content.views')}</TableHead>
                    <TableHead>{t('content.date')}</TableHead>
                    <TableHead className="text-right">{t('content.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : blogPosts.length ? (
                    blogPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>
                          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                            {post.status === 'published' ? t('content.published') : t('content.draft')}
                          </Badge>
                        </TableCell>
                        <TableCell>{post.views}</TableCell>
                        <TableCell>{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewPost(post)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditPostDialog(post)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteBlogTarget(post)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">
                        {t('content.noBlogPosts')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold text-gray-900">{t('content.systemAnnouncements')}</CardTitle>
                <Button onClick={() => setIsCreateAnnouncementOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('content.newAnnouncement')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead>{t('content.title')}</TableHead>
                    <TableHead>{t('content.priority')}</TableHead>
                    <TableHead>{t('content.recipient')}</TableHead>
                    <TableHead>{t('content.status')}</TableHead>
                    <TableHead>{t('content.date')}</TableHead>
                    <TableHead className="text-right">{t('content.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcementsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : announcements.length ? (
                    announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {announcementTypeIcon(announcement.type, "h-4 w-4 text-gray-500 flex-shrink-0")}
                            {announcement.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={announcementPriorityBadgeVariant(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            {announcement.targetType !== 'all' && <Users className="h-3.5 w-3.5 text-gray-400" />}
                            {getAnnouncementTargetLabel(announcement, t)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={announcement.active ? 'default' : 'secondary'}>
                            {announcement.active ? t('content.published') : t('content.draft')}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(announcement.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditAnnouncementDialog(announcement)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteAnnouncementTarget(announcement)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-500">
                        {t('content.noAnnouncements')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Blog Post Dialog */}
      <Dialog open={isCreatePostOpen} onOpenChange={(open) => { setIsCreatePostOpen(open); if (!open) resetBlogForm() }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('content.createNewPost')}</DialogTitle>
            <DialogDescription>{t('content.writeNewPost')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <Label htmlFor="title">{t('content.title')}</Label>
              <Input
                id="title"
                placeholder={t('content.postTitle')}
                value={blogFormData.title}
                onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="excerpt">{t('content.excerpt')}</Label>
              <Textarea
                id="excerpt"
                placeholder={t('content.excerptPlaceholder')}
                rows={2}
                value={blogFormData.excerpt}
                onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('content.content')}</Label>
              <RichTextEditor
                value={blogFormData.content}
                onChange={(html) => setBlogFormData({ ...blogFormData, content: html })}
                placeholder={t('content.writeContent')}
                minHeight={200}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="image">{t('content.featuredImage')}</Label>
                <Input
                  id="image"
                  placeholder="https://..."
                  value={blogFormData.image}
                  onChange={(e) => setBlogFormData({ ...blogFormData, image: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postCategory">{t('content.category')}</Label>
                <Input
                  id="postCategory"
                  placeholder={t('content.categoryPlaceholder')}
                  value={blogFormData.category}
                  onChange={(e) => setBlogFormData({ ...blogFormData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="author">{t('content.author')}</Label>
                <Input
                  id="author"
                  placeholder={t('content.authorPlaceholder')}
                  value={blogFormData.author}
                  onChange={(e) => setBlogFormData({ ...blogFormData, author: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">{t('content.status')}</Label>
                <Select value={blogFormData.status} onValueChange={(value: "draft" | "published") => setBlogFormData({ ...blogFormData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('content.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('content.draft')}</SelectItem>
                    <SelectItem value="published">{t('content.published')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsCreatePostOpen(false); resetBlogForm() }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateBlogPost} disabled={isSubmittingPost}>
              {isSubmittingPost ? t('common.loading') : t('content.createPost')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Blog Post Dialog */}
      <Dialog open={isEditPostOpen} onOpenChange={(open) => { setIsEditPostOpen(open); if (!open) { setCurrentPost(null); resetBlogForm() } }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('content.editPost')}</DialogTitle>
            <DialogDescription>{t('content.updateDetails')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <Label htmlFor="editPostTitle">{t('content.title')}</Label>
              <Input
                id="editPostTitle"
                value={blogFormData.title}
                onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editExcerpt">{t('content.excerpt')}</Label>
              <Textarea
                id="editExcerpt"
                rows={2}
                value={blogFormData.excerpt}
                onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('content.content')}</Label>
              <RichTextEditor
                value={blogFormData.content}
                onChange={(html) => setBlogFormData({ ...blogFormData, content: html })}
                minHeight={200}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editImage">{t('content.featuredImage')}</Label>
                <Input
                  id="editImage"
                  value={blogFormData.image}
                  onChange={(e) => setBlogFormData({ ...blogFormData, image: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editPostCategory">{t('content.category')}</Label>
                <Input
                  id="editPostCategory"
                  value={blogFormData.category}
                  onChange={(e) => setBlogFormData({ ...blogFormData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editAuthor">{t('content.author')}</Label>
                <Input
                  id="editAuthor"
                  value={blogFormData.author}
                  onChange={(e) => setBlogFormData({ ...blogFormData, author: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editStatus">{t('content.status')}</Label>
                <Select value={blogFormData.status} onValueChange={(value: "draft" | "published") => setBlogFormData({ ...blogFormData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('content.draft')}</SelectItem>
                    <SelectItem value="published">{t('content.published')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsEditPostOpen(false); setCurrentPost(null); resetBlogForm() }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateBlogPost} disabled={isSubmittingPost}>
              {isSubmittingPost ? t('common.loading') : t('content.updatePost')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Blog Post Confirmation */}
      <AlertDialog open={!!deleteBlogTarget} onOpenChange={(open) => !open && setDeleteBlogTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('content.deletePostConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('content.deletePostConfirmDesc').replace('{name}', deleteBlogTarget?.title || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPost}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBlogPost}
              disabled={isDeletingPost}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingPost ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Announcement Dialog */}
      <Dialog open={isCreateAnnouncementOpen} onOpenChange={(open) => { setIsCreateAnnouncementOpen(open); if (!open) resetAnnouncementForm() }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('content.createNewAnnouncement')}</DialogTitle>
            <DialogDescription>{t('content.writeNewAnnouncement')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <Label htmlFor="announcementTitle">{t('content.title')}</Label>
              <Input
                id="announcementTitle"
                placeholder={t('content.announcementTitlePlaceholder')}
                value={announcementFormData.title}
                onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('content.content')}</Label>
              <RichTextEditor
                value={announcementFormData.content}
                onChange={(html) => setAnnouncementFormData({ ...announcementFormData, content: html })}
                placeholder={t('content.announcementContentPlaceholder')}
                minHeight={160}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="announcementType">{t('content.type')}</Label>
                <Select value={announcementFormData.type} onValueChange={(value: AnnouncementInput['type']) => setAnnouncementFormData({ ...announcementFormData, type: value })}>
                  <SelectTrigger id="announcementType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('content.general')}</SelectItem>
                    <SelectItem value="maintenance">{t('content.maintenance')}</SelectItem>
                    <SelectItem value="feature">{t('content.feature')}</SelectItem>
                    <SelectItem value="security">{t('content.security')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="announcementPriority">{t('content.priority')}</Label>
                <Select value={announcementFormData.priority} onValueChange={(value: AnnouncementInput['priority']) => setAnnouncementFormData({ ...announcementFormData, priority: value })}>
                  <SelectTrigger id="announcementPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('content.low')}</SelectItem>
                    <SelectItem value="normal">{t('content.normal')}</SelectItem>
                    <SelectItem value="high">{t('content.high')}</SelectItem>
                    <SelectItem value="critical">{t('content.critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AnnouncementTargetFields
              idPrefix="create"
              formData={announcementFormData}
              setFormData={setAnnouncementFormData}
              targetableUsers={targetableUsers}
              targetableUsersLoading={targetableUsersLoading}
              t={t}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="announcementActive"
                checked={announcementFormData.active}
                onCheckedChange={(checked) => setAnnouncementFormData({ ...announcementFormData, active: checked })}
              />
              <Label htmlFor="announcementActive">{t('content.activeAnnouncement')}</Label>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsCreateAnnouncementOpen(false); resetAnnouncementForm() }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateAnnouncement} disabled={isSubmittingAnnouncement}>
              {isSubmittingAnnouncement ? t('common.loading') : t('content.createAnnouncement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={isEditAnnouncementOpen} onOpenChange={(open) => { setIsEditAnnouncementOpen(open); if (!open) { setCurrentAnnouncement(null); resetAnnouncementForm() } }}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('content.editAnnouncement')}</DialogTitle>
            <DialogDescription>{t('content.updateDetails')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <Label htmlFor="editAnnouncementTitle">{t('content.title')}</Label>
              <Input
                id="editAnnouncementTitle"
                value={announcementFormData.title}
                onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t('content.content')}</Label>
              <RichTextEditor
                value={announcementFormData.content}
                onChange={(html) => setAnnouncementFormData({ ...announcementFormData, content: html })}
                minHeight={160}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editAnnouncementType">{t('content.type')}</Label>
                <Select value={announcementFormData.type} onValueChange={(value: AnnouncementInput['type']) => setAnnouncementFormData({ ...announcementFormData, type: value })}>
                  <SelectTrigger id="editAnnouncementType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('content.general')}</SelectItem>
                    <SelectItem value="maintenance">{t('content.maintenance')}</SelectItem>
                    <SelectItem value="feature">{t('content.feature')}</SelectItem>
                    <SelectItem value="security">{t('content.security')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editAnnouncementPriority">{t('content.priority')}</Label>
                <Select value={announcementFormData.priority} onValueChange={(value: AnnouncementInput['priority']) => setAnnouncementFormData({ ...announcementFormData, priority: value })}>
                  <SelectTrigger id="editAnnouncementPriority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('content.low')}</SelectItem>
                    <SelectItem value="normal">{t('content.normal')}</SelectItem>
                    <SelectItem value="high">{t('content.high')}</SelectItem>
                    <SelectItem value="critical">{t('content.critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AnnouncementTargetFields
              idPrefix="edit"
              formData={announcementFormData}
              setFormData={setAnnouncementFormData}
              targetableUsers={targetableUsers}
              targetableUsersLoading={targetableUsersLoading}
              t={t}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="editAnnouncementActive"
                checked={announcementFormData.active}
                onCheckedChange={(checked) => setAnnouncementFormData({ ...announcementFormData, active: checked })}
              />
              <Label htmlFor="editAnnouncementActive">{t('content.activeAnnouncement')}</Label>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsEditAnnouncementOpen(false); setCurrentAnnouncement(null); resetAnnouncementForm() }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateAnnouncement} disabled={isSubmittingAnnouncement}>
              {isSubmittingAnnouncement ? t('common.loading') : t('content.updateAnnouncement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Announcement Confirmation */}
      <AlertDialog open={!!deleteAnnouncementTarget} onOpenChange={(open) => !open && setDeleteAnnouncementTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('content.deleteAnnouncementConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('content.deleteAnnouncementConfirmDesc').replace('{name}', deleteAnnouncementTarget?.title || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAnnouncement}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAnnouncement}
              disabled={isDeletingAnnouncement}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingAnnouncement ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}