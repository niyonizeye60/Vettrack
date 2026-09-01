"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Search, Tag, Calendar, MapPin, DollarSign } from "lucide-react"
import AdminProductCard from "@/components/admin/admin-product-card"
import { useLanguage } from "@/contexts/LanguageContext"
import { rwandaData } from "@/lib/rwanda-data"
import { MARKETPLACE_CATEGORIES, type MarketplaceCategory } from "@/lib/marketplace-access"

type Cat = MarketplaceCategory

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  image: string
  category: string
  categoryId: string
  animalType?: string
  breed?: string
  age?: string
  sex?: string
  district?: string
  sector?: string
  village?: string
  sellerPhone?: string
  sellerEmail?: string
  drugType?: string
  usageDescription?: string
  feedType?: string
  quality?: string
  targetAnimal?: string
  sellerId?: string
  listingStatus?: string
}

interface Category {
  id: string
  name: string
  description: string
  image: string
  type: string
}

const emptyForm = {
  name: "", description: "", price: "", duration: "", image: "", categoryId: "",
  animalType: "", breed: "", age: "", sex: "", district: "", sector: "", village: "",
  sellerPhone: "", sellerEmail: "", drugType: "", usageDescription: "",
  feedType: "", quality: "", targetAnimal: "",
}

const CATEGORIES: Cat[] = [...MARKETPLACE_CATEGORIES]

/**
 * The one place marketplace listings are created, edited and removed.
 *
 * This used to live inside the admin content-management screen alongside blog posts
 * and announcements, with the same ~120 lines repeated once per category. It now
 * renders one parameterised block for all three, in the portal whose job this is.
 *
 * `allowedCategories` scopes a marketplace_admin account to the categories its
 * superadmin grant named - unlisted categories render nowhere here, and the API
 * rejects writes to them independently, so this prop is a UI convenience rather
 * than the enforcement point.
 */
export default function ListingsManager({ allowedCategories }: { allowedCategories: Cat[] }) {
  const { t } = useLanguage()

  const [services, setServices] = useState<Record<Cat, Service[]>>({ sales: [], drugs: [], feeds: [] })
  const [categories, setCategories] = useState<Record<Cat, Category[]>>({ sales: [], drugs: [], feeds: [] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState<Record<Cat, string>>({ sales: "", drugs: "", feeds: "" })

  const visibleCategories = CATEGORIES.filter((cat) => allowedCategories.includes(cat))
  const [activeCat, setActiveCat] = useState<Cat>(visibleCategories[0] ?? "sales")
  const [form, setForm] = useState(emptyForm)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", image: "" })
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [editCategoryTarget, setEditCategoryTarget] = useState<Category | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)

  const loadAll = async () => {
    try {
      const [sRes, cRes] = await Promise.all([fetch("/api/services"), fetch("/api/categories")])
      if (sRes.ok) setServices(await sRes.json())
      if (cRes.ok) setCategories(await cRes.json())
    } catch (error) {
      console.error("Failed to load listings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  // --- services ---------------------------------------------------------------

  const saveService = async () => {
    setBusy(true)
    try {
      const payload = { ...form, price: Number(form.price) || 0, category: activeCat }
      const res = editTarget
        ? await fetch("/api/services", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editTarget.id, ...payload }),
          })
        : await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      if (res.ok) {
        await loadAll()
        setCreateOpen(false)
        setEditTarget(null)
        setForm(emptyForm)
      }
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteService = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await fetch(`/api/services?id=${deleteTarget.id}&category=${deleteTarget.category}`, { method: "DELETE" })
      await loadAll()
    } finally {
      setBusy(false)
      setDeleteTarget(null)
    }
  }

  const openEdit = (service: Service) => {
    setActiveCat(service.category as Cat)
    setEditTarget(service)
    setForm({
      name: service.name, description: service.description, price: String(service.price),
      duration: service.duration || "", image: service.image || "", categoryId: service.categoryId || "",
      animalType: service.animalType || "", breed: service.breed || "", age: service.age || "",
      sex: service.sex || "", district: service.district || "", sector: service.sector || "",
      village: service.village || "", sellerPhone: service.sellerPhone || "",
      sellerEmail: service.sellerEmail || "", drugType: service.drugType || "",
      usageDescription: service.usageDescription || "", feedType: service.feedType || "",
      quality: service.quality || "", targetAnimal: service.targetAnimal || "",
    })
  }

  // --- categories -------------------------------------------------------------

  const saveCategory = async () => {
    setBusy(true)
    try {
      const res = editCategoryTarget
        ? await fetch("/api/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editCategoryTarget.id, type: editCategoryTarget.type, ...categoryForm }),
          })
        : await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...categoryForm, type: activeCat }),
          })
      if (res.ok) {
        await loadAll()
        setCreateCategoryOpen(false)
        setEditCategoryTarget(null)
        setCategoryForm({ name: "", description: "", image: "" })
      }
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return
    setBusy(true)
    try {
      await fetch(`/api/categories?id=${deleteCategoryTarget.id}&type=${deleteCategoryTarget.type}`, { method: "DELETE" })
      await loadAll()
    } finally {
      setBusy(false)
      setDeleteCategoryTarget(null)
    }
  }

  const categoryName = (categoryId: string, cat: Cat) =>
    categories[cat]?.find((c) => c.id === categoryId)?.name || t("content.unknown")

  // --- category-specific form fields ------------------------------------------

  const set = (patch: Partial<typeof emptyForm>) => setForm({ ...form, ...patch })

  const specificFields = (cat: Cat) => {
    if (cat === "sales") {
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("content.animalType")}</Label>
              <Select value={form.animalType || undefined} onValueChange={(v) => set({ animalType: v })}>
                <SelectTrigger><SelectValue placeholder={t("content.selectAnimalType")} /></SelectTrigger>
                <SelectContent>
                  {["Cow", "Goat", "Sheep", "Dog", "Cat", "Chicken", "Pig"].map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("content.breed")}</Label>
              <Input value={form.breed} onChange={(e) => set({ breed: e.target.value })} placeholder={t("content.animalBreed")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("content.age")}</Label>
              <Input value={form.age} onChange={(e) => set({ age: e.target.value })} placeholder={t("content.ageExample")} />
            </div>
            <div>
              <Label>{t("content.sex")}</Label>
              <Select value={form.sex || undefined} onValueChange={(v) => set({ sex: v })}>
                <SelectTrigger><SelectValue placeholder={t("content.selectSex")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">{t("content.male")}</SelectItem>
                  <SelectItem value="Female">{t("content.female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>{t("content.district")}</Label>
              <Select value={form.district || undefined} onValueChange={(v) => set({ district: v, sector: "" })}>
                <SelectTrigger><SelectValue placeholder={t("content.selectDistrict")} /></SelectTrigger>
                <SelectContent>
                  {Object.keys(rwandaData).sort().map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("content.sector")}</Label>
              <Select value={form.sector || undefined} onValueChange={(v) => set({ sector: v })} disabled={!form.district}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(rwandaData[form.district] ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("content.village")}</Label>
              <Input value={form.village} onChange={(e) => set({ village: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("content.sellerPhone")}</Label>
              <Input value={form.sellerPhone} onChange={(e) => set({ sellerPhone: e.target.value })} />
            </div>
            <div>
              <Label>{t("content.sellerEmail")}</Label>
              <Input value={form.sellerEmail} onChange={(e) => set({ sellerEmail: e.target.value })} />
            </div>
          </div>
        </>
      )
    }

    if (cat === "drugs") {
      return (
        <>
          <div>
            <Label>{t("content.drugType")}</Label>
            <Select value={form.drugType || undefined} onValueChange={(v) => set({ drugType: v })}>
              <SelectTrigger><SelectValue placeholder={t("content.selectDrugType")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Antibiotic">{t("content.antibiotic")}</SelectItem>
                <SelectItem value="Vaccine">{t("content.vaccine")}</SelectItem>
                <SelectItem value="Dewormer">{t("content.dewormer")}</SelectItem>
                <SelectItem value="Pain Relief">{t("content.painRelief")}</SelectItem>
                <SelectItem value="Vitamins">{t("content.vitamins")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("content.usageDescription")}</Label>
            <Textarea rows={3} value={form.usageDescription} onChange={(e) => set({ usageDescription: e.target.value })} placeholder={t("content.howToUse")} />
          </div>
        </>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>{t("content.feedType")}</Label>
            <Select value={form.feedType || undefined} onValueChange={(v) => set({ feedType: v })}>
              <SelectTrigger><SelectValue placeholder={t("content.selectFeedType")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Hay">{t("content.hay")}</SelectItem>
                <SelectItem value="Concentrates">{t("content.concentrates")}</SelectItem>
                <SelectItem value="Minerals">{t("content.minerals")}</SelectItem>
                <SelectItem value="Supplements">{t("content.supplements")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("content.quality")}</Label>
            <Select value={form.quality || undefined} onValueChange={(v) => set({ quality: v })}>
              <SelectTrigger><SelectValue placeholder={t("content.selectQuality")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">{t("content.high")}</SelectItem>
                <SelectItem value="Medium">{t("content.medium")}</SelectItem>
                <SelectItem value="Low">{t("content.low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{t("content.targetAnimal")}</Label>
          <Select value={form.targetAnimal || undefined} onValueChange={(v) => set({ targetAnimal: v })}>
            <SelectTrigger><SelectValue placeholder={t("content.selectTargetAnimal")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Cattle">{t("content.cattle")}</SelectItem>
              <SelectItem value="Goats">{t("content.goats")}</SelectItem>
              <SelectItem value="Poultry">{t("content.poultry")}</SelectItem>
              <SelectItem value="Pigs">{t("content.pigs")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    )
  }

  const productDetails = (service: Service, cat: Cat) => {
    if (cat === "sales") {
      return [
        ...(service.animalType || service.breed
          ? [{ icon: Tag, text: [service.animalType, service.breed].filter(Boolean).join(" · ") }] : []),
        ...(service.age || service.sex
          ? [{ icon: Calendar, text: [service.age, service.sex].filter(Boolean).join(" · ") }] : []),
        ...(service.district
          ? [{ icon: MapPin, text: [service.district, service.sector].filter(Boolean).join(", ") }] : []),
      ]
    }
    if (cat === "drugs") {
      return service.drugType ? [{ icon: Tag, text: service.drugType }] : []
    }
    return [
      ...(service.feedType ? [{ icon: Tag, text: service.feedType }] : []),
      ...(service.targetAnimal ? [{ icon: Calendar, text: service.targetAnimal }] : []),
    ]
  }

  const categoriesTitleKey: Record<Cat, string> = {
    sales: "content.animalSalesCategories",
    drugs: "content.pharmacyCategories",
    feeds: "content.feedCategories",
  }
  const itemsTitleKey: Record<Cat, string> = {
    sales: "content.animals",
    drugs: "content.drugs",
    feeds: "content.feeds",
  }

  const renderTab = (cat: Cat) => {
    const filtered = (services[cat] ?? []).filter((s) =>
      s.name.toLowerCase().includes(search[cat].toLowerCase())
    )

    return (
      <TabsContent key={cat} value={cat} className="space-y-4">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <DollarSign className="h-4 w-4 text-green-600" />
                {t(categoriesTitleKey[cat])}
              </CardTitle>
              <Button onClick={() => { setActiveCat(cat); setCategoryForm({ name: "", description: "", image: "" }); setCreateCategoryOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                {t("content.addCategory")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead>{t("content.categoryName")}</TableHead>
                  <TableHead>{t("content.description")}</TableHead>
                  <TableHead>{t("content.itemsCount")}</TableHead>
                  <TableHead className="text-right">{t("content.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  : (categories[cat] ?? []).map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                        <TableCell>{(services[cat] ?? []).filter((s) => s.categoryId === category.id).length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" aria-label={t("content.addItemToCategory")}
                              onClick={() => { setActiveCat(cat); setEditTarget(null); setForm({ ...emptyForm, categoryId: category.id }); setCreateOpen(true) }}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label={t("content.editCategory")}
                              onClick={() => { setEditCategoryTarget(category); setCategoryForm({ name: category.name, description: category.description, image: category.image || "" }) }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label={t("content.actions")}
                              onClick={() => setDeleteCategoryTarget(category)}>
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
              <CardTitle className="text-base font-semibold text-gray-900">{t(itemsTitleKey[cat])}</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t("content.searchItems")}
                  value={search[cat]}
                  onChange={(e) => setSearch({ ...search, [cat]: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <Skeleton className="h-32 w-full rounded" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : filtered.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((service) => (
                  <AdminProductCard
                    key={service.id}
                    image={service.image}
                    name={service.name}
                    categoryName={categoryName(service.categoryId, cat)}
                    price={service.price}
                    unit={service.duration}
                    description={service.description}
                    details={productDetails(service, cat)}
                    onEdit={() => openEdit(service)}
                    onDelete={() => setDeleteTarget(service)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-gray-500">{t("content.noItemsFound")}</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  const serviceDialogOpen = createOpen || !!editTarget

  const tabLabelKey: Record<Cat, string> = {
    sales: "content.animalSales",
    drugs: "content.pharmacy",
    feeds: "content.feeds",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t("marketplace.listings")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("marketplace.listingsDesc")}</p>
      </div>

      {visibleCategories.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">
            {t("marketplace.noCategoryAccess")}
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeCat} onValueChange={(v) => setActiveCat(v as Cat)}>
          <TabsList>
            {visibleCategories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>{t(tabLabelKey[cat])}</TabsTrigger>
            ))}
          </TabsList>
          {visibleCategories.map(renderTab)}
        </Tabs>
      )}

      {/* Create / edit listing */}
      <Dialog
        open={serviceDialogOpen}
        onOpenChange={(next) => { if (!next) { setCreateOpen(false); setEditTarget(null); setForm(emptyForm) } }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget
                ? activeCat === "sales" ? t("content.editAnimal") : activeCat === "drugs" ? t("content.editDrug") : t("content.editFeed")
                : activeCat === "sales" ? t("content.addAnimal") : activeCat === "drugs" ? t("content.addDrug") : t("content.addFeed")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("content.itemName")}</Label>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <Label>{t("content.category")}</Label>
              <Select value={form.categoryId || undefined} onValueChange={(v) => set({ categoryId: v })}>
                <SelectTrigger><SelectValue placeholder={t("content.selectCategory")} /></SelectTrigger>
                <SelectContent>
                  {(categories[activeCat] ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("content.priceRWF")}</Label>
                <Input type="number" value={form.price} onChange={(e) => set({ price: e.target.value })} />
              </div>
              <div>
                <Label>{t("content.unitPackage")}</Label>
                <Input value={form.duration} onChange={(e) => set({ duration: e.target.value })} placeholder={t("content.perHeadPerBag")} />
              </div>
            </div>
            <div>
              <Label>{t("content.description")}</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div>
              <Label>{t("content.imageUrl")}</Label>
              <Input value={form.image} onChange={(e) => set({ image: e.target.value })} />
            </div>

            {specificFields(activeCat)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null); setForm(emptyForm) }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveService} disabled={busy || !form.name}>
              {editTarget ? t("content.update") : t("content.addItem")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / edit category */}
      <Dialog
        open={createCategoryOpen || !!editCategoryTarget}
        onOpenChange={(next) => { if (!next) { setCreateCategoryOpen(false); setEditCategoryTarget(null) } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategoryTarget ? t("content.editCategory") : t("content.createNewCategory")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("content.categoryName")}</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("content.categoryDescription")}</Label>
              <Textarea rows={3} value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
            </div>
            <div>
              <Label>{t("content.imageUrl")}</Label>
              <Input value={categoryForm.image} onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateCategoryOpen(false); setEditCategoryTarget(null) }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveCategory} disabled={busy || !categoryForm.name}>
              {editCategoryTarget ? t("content.updateCategory") : t("content.createCategory")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteItemConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("content.deleteItemConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteService} disabled={busy}>{t("content.actions")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCategoryTarget} onOpenChange={(next) => !next && setDeleteCategoryTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteCategoryConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("content.deleteCategoryConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} disabled={busy}>{t("content.actions")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
