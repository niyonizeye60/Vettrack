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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Plus, Edit, Trash2, Eye, Calendar, DollarSign, Pill, Wheat, Search, MapPin, Tag } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import AdminProductCard from "@/components/admin/admin-product-card"
import { Skeleton } from "@/components/ui/skeleton"

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

const mockBlogPosts = [
  {
    id: "1",
    title: "Animal Health Tips for Farmers",
    status: "published",
    author: "Admin",
    createdAt: "2024-01-15",
    views: 245
  },
  {
    id: "2",
    title: "Vaccination Schedule Guide",
    status: "draft",
    author: "Admin",
    createdAt: "2024-01-20",
    views: 0
  }
]

export default function AdminContentManagement() {
  const { t } = useLanguage()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
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
  }, [])

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="blog">{t('content.blogPosts')}</TabsTrigger>
          <TabsTrigger value="sales">{t('content.animalSales')}</TabsTrigger>
          <TabsTrigger value="drugs">{t('content.pharmacy')}</TabsTrigger>
          <TabsTrigger value="feeds">{t('content.feeds')}</TabsTrigger>
          <TabsTrigger value="announcements">{t('content.announcements')}</TabsTrigger>
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
                  {mockBlogPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>
                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                          {post.status === 'published' ? t('content.published') : t('content.draft')}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.views}</TableCell>
                      <TableCell>{post.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
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
              <CardTitle className="text-base font-semibold text-gray-900">{t('content.systemAnnouncements')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('content.noAnnouncements')}</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('content.newAnnouncement')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Blog Post Dialog */}
      <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('content.createNewPost')}</DialogTitle>
            <DialogDescription>{t('content.writeNewPost')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">{t('content.title')}</Label>
              <Input id="title" placeholder={t('content.postTitle')} />
            </div>
            <div>
              <Label htmlFor="content">{t('content.content')}</Label>
              <Textarea id="content" placeholder={t('content.writeContent')} rows={8} />
            </div>
            <div>
              <Label htmlFor="status">{t('content.status')}</Label>
              <Select>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button>{t('content.createPost')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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