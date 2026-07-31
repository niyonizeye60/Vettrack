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
import { FileText, Plus, Edit, Trash2, Eye, Calendar, DollarSign, Pill, Wheat, Search, MapPin, Tag, Megaphone, AlertTriangle, Info, Shield, Users } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import AdminProductCard from "@/components/admin/admin-product-card"
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

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  images?: string[]
  category: string
  categoryId: string
  // Animal Sales fields
  animalType?: string
  breed?: string
  age?: string
  sex?: string
  district?: string
  sector?: string
  village?: string
  sellerPhone?: string
  sellerEmail?: string
  // Drug fields
  drugType?: string
  usageDescription?: string
  // Feed fields
  feedType?: string
  quality?: string
  targetAnimal?: string
}

interface Category {
  id: string
  name: string
  description: string
  image: string
  type: string
}

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
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false)
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false)
  const [services, setServices] = useState<{sales: Service[], drugs: Service[], feeds: Service[]}>({
    sales: [],
    drugs: [],
    feeds: []
  })
  const [categories, setCategories] = useState<{sales: Category[], drugs: Category[], feeds: Category[]}>({
    sales: [],
    drugs: [],
    feeds: []
  })
  const [currentService, setCurrentService] = useState<Service | null>(null)
  const [currentCategoryEdit, setCurrentCategoryEdit] = useState<Category | null>(null)
  const [currentCategory, setCurrentCategory] = useState<string>('sales')
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    image: '',
    categoryId: '',
    // Animal Sales fields
    animalType: '',
    breed: '',
    age: '',
    sex: '',
    district: '',
    sector: '',
    village: '',
    sellerPhone: '',
    sellerEmail: '',
    // Drug fields
    drugType: '',
    usageDescription: '',
    // Feed fields
    feedType: '',
    quality: '',
    targetAnimal: ''
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    image: ''
  })
  const [salesSearch, setSalesSearch] = useState('')
  const [drugsSearch, setDrugsSearch] = useState('')
  const [feedsSearch, setFeedsSearch] = useState('')
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<Service | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [contentLoading, setContentLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchServices(), fetchCategories()]).finally(() => setContentLoading(false))
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


  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleCreateCategory = async () => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryFormData,
          type: currentCategory
        })
      })
      
      if (response.ok) {
        await fetchCategories()
        setIsCreateCategoryOpen(false)
        setCategoryFormData({ name: '', description: '', image: '' })
      }
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }

  const handleEditCategory = async () => {
    if (!currentCategoryEdit) return
    
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCategoryEdit.id,
          type: currentCategoryEdit.type,
          ...categoryFormData
        })
      })
      
      if (response.ok) {
        await fetchCategories()
        setIsEditCategoryOpen(false)
        setCurrentCategoryEdit(null)
        setCategoryFormData({ name: '', description: '', image: '' })
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    try {
      const response = await fetch(`/api/categories?id=${category.id}&type=${category.type}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchCategories()
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return
    setIsDeleting(true)
    try {
      await handleDeleteCategory(deleteCategoryTarget)
    } finally {
      setIsDeleting(false)
      setDeleteCategoryTarget(null)
    }
  }

  const openEditCategoryDialog = (category: Category) => {
    setCurrentCategoryEdit(category)
    setCategoryFormData({
      name: category.name,
      description: category.description,
      image: category.image || ''
    })
    setIsEditCategoryOpen(true)
  }

  const handleCreateService = async () => {
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          category: currentCategory
        })
      })
      
      if (response.ok) {
        await fetchServices()
        setIsCreateServiceOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to create service:', error)
    }
  }

  const handleEditService = async () => {
    if (!currentService) return
    
    try {
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentService.id,
          category: currentService.category,
          ...formData,
          price: Number(formData.price)
        })
      })
      
      if (response.ok) {
        await fetchServices()
        setIsEditServiceOpen(false)
        setCurrentService(null)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to update service:', error)
    }
  }

  const handleDeleteService = async (service: Service) => {
    try {
      const response = await fetch(`/api/services?id=${service.id}&category=${service.category}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchServices()
      }
    } catch (error) {
      console.error('Failed to delete service:', error)
    }
  }

  const confirmDeleteService = async () => {
    if (!deleteServiceTarget) return
    setIsDeleting(true)
    try {
      await handleDeleteService(deleteServiceTarget)
    } finally {
      setIsDeleting(false)
      setDeleteServiceTarget(null)
    }
  }

  const openEditDialog = (service: Service) => {
    setCurrentService(service)
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration,
      image: service.image,
      categoryId: service.categoryId,
      animalType: service.animalType || '',
      breed: service.breed || '',
      age: service.age || '',
      sex: service.sex || '',
      district: service.district || '',
      sector: service.sector || '',
      village: service.village || '',
      sellerPhone: service.sellerPhone || '',
      sellerEmail: service.sellerEmail || '',
      drugType: service.drugType || '',
      usageDescription: service.usageDescription || '',
      feedType: service.feedType || '',
      quality: service.quality || '',
      targetAnimal: service.targetAnimal || ''
    })
    setIsEditServiceOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      image: '',
      categoryId: '',
      animalType: '',
      breed: '',
      age: '',
      sex: '',
      district: '',
      sector: '',
      village: '',
      sellerPhone: '',
      sellerEmail: '',
      drugType: '',
      usageDescription: '',
      feedType: '',
      quality: '',
      targetAnimal: ''
    })
  }

  const getCategoryName = (categoryId: string, type: string) => {
    const category = categories[type as keyof typeof categories]?.find(c => c.id === categoryId)
    return category?.name || t('content.unknown')
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="blog" className="w-full">
        <TabsList className="flex w-full justify-start gap-1 overflow-x-auto sm:grid sm:grid-cols-5">
          <TabsTrigger value="blog" className="flex-shrink-0">{t('content.blogPosts')}</TabsTrigger>
          <TabsTrigger value="sales" className="flex-shrink-0">{t('content.animalSales')}</TabsTrigger>
          <TabsTrigger value="drugs" className="flex-shrink-0">{t('content.pharmacy')}</TabsTrigger>
          <TabsTrigger value="feeds" className="flex-shrink-0">{t('content.feeds')}</TabsTrigger>
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

        <TabsContent value="sales" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  {t('content.animalSalesCategories')}
                </CardTitle>
                <Button onClick={() => { setCurrentCategory('sales'); setIsCreateCategoryOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('content.addCategory')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead>{t('content.categoryName')}</TableHead>
                    <TableHead>{t('content.description')}</TableHead>
                    <TableHead>{t('content.itemsCount')}</TableHead>
                    <TableHead className="text-right">{t('content.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : categories.sales?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                      <TableCell>{services.sales?.filter(s => s.categoryId === category.id).length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setCurrentCategory('sales'); setFormData({...formData, categoryId: category.id}); setIsCreateServiceOpen(true) }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditCategoryDialog(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteCategoryTarget(category)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-gray-900">{t('content.animals')}</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t('content.searchItems')}
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contentLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <Skeleton className="h-32 w-full rounded" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : services.sales?.filter((s) => s.name.toLowerCase().includes(salesSearch.toLowerCase())).length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.sales
                    .filter((s) => s.name.toLowerCase().includes(salesSearch.toLowerCase()))
                    .map((service) => (
                      <AdminProductCard
                        key={service.id}
                        image={service.image}
                        name={service.name}
                        categoryName={getCategoryName(service.categoryId, 'sales')}
                        price={service.price}
                        unit={service.duration}
                        description={service.description}
                        details={[
                          ...(service.animalType || service.breed
                            ? [{ icon: Tag, text: [service.animalType, service.breed].filter(Boolean).join(' · ') }]
                            : []),
                          ...(service.age || service.sex
                            ? [{ icon: Calendar, text: [service.age, service.sex].filter(Boolean).join(' · ') }]
                            : []),
                          ...(service.district
                            ? [{ icon: MapPin, text: [service.district, service.sector].filter(Boolean).join(', ') }]
                            : []),
                        ]}
                        onEdit={() => openEditDialog(service)}
                        onDelete={() => setDeleteServiceTarget(service)}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-gray-500">{t('content.noItemsFound')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drugs" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Pill className="h-4 w-4 text-green-600" />
                  {t('content.pharmacyCategories')}
                </CardTitle>
                <Button onClick={() => { setCurrentCategory('drugs'); setIsCreateCategoryOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('content.addCategory')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : categories.drugs?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                      <TableCell>{services.drugs?.filter(s => s.categoryId === category.id).length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setCurrentCategory('drugs'); setFormData({...formData, categoryId: category.id}); setIsCreateServiceOpen(true) }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditCategoryDialog(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteCategoryTarget(category)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-gray-900">{t('content.drugs')}</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t('content.searchItems')}
                    value={drugsSearch}
                    onChange={(e) => setDrugsSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contentLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <Skeleton className="h-32 w-full rounded" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : services.drugs?.filter((s) => s.name.toLowerCase().includes(drugsSearch.toLowerCase())).length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.drugs
                    .filter((s) => s.name.toLowerCase().includes(drugsSearch.toLowerCase()))
                    .map((service) => (
                      <AdminProductCard
                        key={service.id}
                        image={service.image}
                        name={service.name}
                        categoryName={getCategoryName(service.categoryId, 'drugs')}
                        price={service.price}
                        unit={service.duration}
                        description={service.description}
                        details={[
                          ...(service.drugType ? [{ icon: Pill, text: service.drugType }] : []),
                          ...(service.district
                            ? [{ icon: MapPin, text: [service.district, service.sector].filter(Boolean).join(', ') }]
                            : []),
                        ]}
                        onEdit={() => openEditDialog(service)}
                        onDelete={() => setDeleteServiceTarget(service)}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-gray-500">{t('content.noItemsFound')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feeds" className="space-y-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Wheat className="h-4 w-4 text-green-600" />
                  {t('content.feedCategories')}
                </CardTitle>
                <Button onClick={() => { setCurrentCategory('feeds'); setIsCreateCategoryOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('content.addCategory')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : categories.feeds?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                      <TableCell>{services.feeds?.filter(s => s.categoryId === category.id).length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setCurrentCategory('feeds'); setFormData({...formData, categoryId: category.id}); setIsCreateServiceOpen(true) }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditCategoryDialog(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteCategoryTarget(category)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-gray-900">{t('content.feeds')}</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t('content.searchItems')}
                    value={feedsSearch}
                    onChange={(e) => setFeedsSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contentLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <Skeleton className="h-32 w-full rounded" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : services.feeds?.filter((s) => s.name.toLowerCase().includes(feedsSearch.toLowerCase())).length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.feeds
                    .filter((s) => s.name.toLowerCase().includes(feedsSearch.toLowerCase()))
                    .map((service) => (
                      <AdminProductCard
                        key={service.id}
                        image={service.image}
                        name={service.name}
                        categoryName={getCategoryName(service.categoryId, 'feeds')}
                        price={service.price}
                        unit={service.duration}
                        description={service.description}
                        details={[
                          ...(service.feedType || service.quality
                            ? [{ icon: Wheat, text: [service.feedType, service.quality].filter(Boolean).join(' · ') }]
                            : []),
                          ...(service.targetAnimal ? [{ icon: Tag, text: service.targetAnimal }] : []),
                          ...(service.district
                            ? [{ icon: MapPin, text: [service.district, service.sector].filter(Boolean).join(', ') }]
                            : []),
                        ]}
                        onEdit={() => openEditDialog(service)}
                        onDelete={() => setDeleteServiceTarget(service)}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-gray-500">{t('content.noItemsFound')}</div>
              )}
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

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('content.createNewCategory')}</DialogTitle>
            <DialogDescription>{t('content.addNewCategory')} {currentCategory}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="categoryName">{t('content.categoryName')}</Label>
              <Input 
                id="categoryName" 
                placeholder={t('content.categoryName')}
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="categoryDescription">{t('content.description')}</Label>
              <Textarea 
                id="categoryDescription" 
                placeholder={t('content.categoryDescription')}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="categoryImage">{t('content.imageUrl')}</Label>
              <Input 
                id="categoryImage" 
                placeholder="https://..."
                value={categoryFormData.image}
                onChange={(e) => setCategoryFormData({...categoryFormData, image: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateCategoryOpen(false); setCategoryFormData({ name: '', description: '', image: '' }) }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateCategory}>{t('content.createCategory')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('content.editCategory')}</DialogTitle>
            <DialogDescription>{t('content.updateCategoryDetails')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="editCategoryName">Category Name</Label>
              <Input 
                id="editCategoryName" 
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategoryDescription">Description</Label>
              <Textarea 
                id="editCategoryDescription" 
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategoryImage">Image URL</Label>
              <Input 
                id="editCategoryImage" 
                value={categoryFormData.image}
                onChange={(e) => setCategoryFormData({...categoryFormData, image: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditCategoryOpen(false); setCurrentCategoryEdit(null); setCategoryFormData({ name: '', description: '', image: '' }) }}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>{t('content.updateCategory')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Service Dialog */}
      <Dialog open={isCreateServiceOpen} onOpenChange={setIsCreateServiceOpen}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentCategory === 'sales' ? t('content.addAnimal') : currentCategory === 'drugs' ? t('content.addDrug') : t('content.addFeed')}</DialogTitle>
            <DialogDescription>{t('content.addItemToCategory')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="category">{t('content.category')}</Label>
              <Select value={formData.categoryId || undefined} onValueChange={(value) => setFormData({...formData, categoryId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder={t('content.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories[currentCategory as keyof typeof categories]?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">{t('common.name')}</Label>
              <Input 
                id="name" 
                placeholder={t('content.itemName')}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="price">{t('content.priceRWF')}</Label>
              <Input 
                id="price" 
                type="number" 
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="duration">{t('content.unitPackage')}</Label>
              <Input 
                id="duration" 
                placeholder={t('content.perHeadPerBag')}
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="image">{t('content.imageUrl')}</Label>
              <Input 
                id="image" 
                placeholder="https://..."
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="description">{t('common.description')}</Label>
              <Textarea 
                id="description" 
                placeholder={t('common.description')}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            {/* Animal Sales specific fields */}
            {currentCategory === 'sales' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="animalType">{t('content.animalType')}</Label>
                    <Select value={formData.animalType || undefined} onValueChange={(value) => setFormData({...formData, animalType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('content.selectAnimalType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cow">{t('content.cow')}</SelectItem>
                        <SelectItem value="Goat">{t('content.goat')}</SelectItem>
                        <SelectItem value="Sheep">{t('content.sheep')}</SelectItem>
                        <SelectItem value="Dog">{t('content.dog')}</SelectItem>
                        <SelectItem value="Cat">{t('content.cat')}</SelectItem>
                        <SelectItem value="Chicken">{t('content.chicken')}</SelectItem>
                        <SelectItem value="Pig">{t('content.pig')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="breed">{t('content.breed')}</Label>
                    <Input 
                      id="breed" 
                      placeholder={t('content.animalBreed')}
                      value={formData.breed}
                      onChange={(e) => setFormData({...formData, breed: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input 
                      id="age" 
                      placeholder="e.g., 2 years, 6 months"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sex">Sex</Label>
                    <Select value={formData.sex || undefined} onValueChange={(value) => setFormData({...formData, sex: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Select value={formData.district || undefined} onValueChange={(value) => setFormData({...formData, district: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kigali">Kigali</SelectItem>
                        <SelectItem value="Northern">Northern</SelectItem>
                        <SelectItem value="Southern">Southern</SelectItem>
                        <SelectItem value="Eastern">Eastern</SelectItem>
                        <SelectItem value="Western">Western</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sector">Sector</Label>
                    <Input 
                      id="sector" 
                      placeholder="Sector"
                      value={formData.sector}
                      onChange={(e) => setFormData({...formData, sector: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="village">Village</Label>
                    <Input 
                      id="village" 
                      placeholder="Village"
                      value={formData.village}
                      onChange={(e) => setFormData({...formData, village: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sellerPhone">Seller Phone</Label>
                    <Input 
                      id="sellerPhone" 
                      placeholder="+250..."
                      value={formData.sellerPhone}
                      onChange={(e) => setFormData({...formData, sellerPhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellerEmail">Seller Email</Label>
                    <Input 
                      id="sellerEmail" 
                      type="email"
                      placeholder="seller@example.com"
                      value={formData.sellerEmail}
                      onChange={(e) => setFormData({...formData, sellerEmail: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
            
            {/* Drug specific fields */}
            {currentCategory === 'drugs' && (
              <>
                <div>
                  <Label htmlFor="drugType">Drug Type</Label>
                  <Select value={formData.drugType || undefined} onValueChange={(value) => setFormData({...formData, drugType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select drug type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                      <SelectItem value="Dewormer">Dewormer</SelectItem>
                      <SelectItem value="Vaccine">Vaccine</SelectItem>
                      <SelectItem value="Vitamins">Vitamins</SelectItem>
                      <SelectItem value="Pain Relief">Pain Relief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Select value={formData.district || undefined} onValueChange={(value) => setFormData({...formData, district: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kigali">Kigali</SelectItem>
                        <SelectItem value="Northern">Northern</SelectItem>
                        <SelectItem value="Southern">Southern</SelectItem>
                        <SelectItem value="Eastern">Eastern</SelectItem>
                        <SelectItem value="Western">Western</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sector">Sector</Label>
                    <Input 
                      id="sector" 
                      placeholder="Sector"
                      value={formData.sector}
                      onChange={(e) => setFormData({...formData, sector: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="village">Village</Label>
                    <Input 
                      id="village" 
                      placeholder="Village"
                      value={formData.village}
                      onChange={(e) => setFormData({...formData, village: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="usageDescription">Usage Description</Label>
                  <Textarea 
                    id="usageDescription" 
                    placeholder="How to use this drug (optional)"
                    rows={3}
                    value={formData.usageDescription}
                    onChange={(e) => setFormData({...formData, usageDescription: e.target.value})}
                  />
                </div>
              </>
            )}
            
            {/* Feed specific fields */}
            {currentCategory === 'feeds' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="feedType">Feed Type</Label>
                    <Select value={formData.feedType || undefined} onValueChange={(value) => setFormData({...formData, feedType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feed type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hay">Hay</SelectItem>
                        <SelectItem value="Concentrates">Concentrates</SelectItem>
                        <SelectItem value="Minerals">Minerals</SelectItem>
                        <SelectItem value="Supplements">Supplements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quality">Quality</Label>
                    <Select value={formData.quality || undefined} onValueChange={(value) => setFormData({...formData, quality: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="targetAnimal">Target Animal</Label>
                    <Select value={formData.targetAnimal || undefined} onValueChange={(value) => setFormData({...formData, targetAnimal: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target animal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cattle">Cattle</SelectItem>
                        <SelectItem value="Goats">Goats</SelectItem>
                        <SelectItem value="Poultry">Poultry</SelectItem>
                        <SelectItem value="Sheep">Sheep</SelectItem>
                        <SelectItem value="Pigs">Pigs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Select value={formData.district || undefined} onValueChange={(value) => setFormData({...formData, district: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kigali">Kigali</SelectItem>
                        <SelectItem value="Northern">Northern</SelectItem>
                        <SelectItem value="Southern">Southern</SelectItem>
                        <SelectItem value="Eastern">Eastern</SelectItem>
                        <SelectItem value="Western">Western</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sector">Sector</Label>
                    <Input 
                      id="sector" 
                      placeholder="Sector"
                      value={formData.sector}
                      onChange={(e) => setFormData({...formData, sector: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="village">Village</Label>
                    <Input 
                      id="village" 
                      placeholder="Village"
                      value={formData.village}
                      onChange={(e) => setFormData({...formData, village: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateServiceOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreateService}>{t('content.addItem')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentService?.category === 'sales' ? t('content.editAnimal') : currentService?.category === 'drugs' ? t('content.editDrug') : t('content.editFeed')}</DialogTitle>
            <DialogDescription>{t('content.updateDetails')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="editName">Name</Label>
              <Input 
                id="editName" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editCategory">Category</Label>
              <Select value={formData.categoryId || undefined} onValueChange={(value) => setFormData({...formData, categoryId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories[currentService?.category as keyof typeof categories]?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editPrice">Price (RWF)</Label>
              <Input 
                id="editPrice" 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editDuration">Unit/Package</Label>
              <Input 
                id="editDuration" 
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editImage">Image URL</Label>
              <Input 
                id="editImage" 
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Textarea 
                id="editDescription" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditServiceOpen(false); setCurrentService(null); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleEditService}>{t('content.update')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteServiceTarget} onOpenChange={(open) => !open && setDeleteServiceTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('content.deleteItemConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('content.deleteItemConfirmDesc').replace('{name}', deleteServiceTarget?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteService}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryTarget} onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('content.deleteCategoryConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('content.deleteCategoryConfirmDesc').replace('{name}', deleteCategoryTarget?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}