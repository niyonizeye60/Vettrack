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
import { Plus, Edit, Trash2, Search, Tag, Calendar, MapPin, DollarSign, Crosshair, Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import AdminProductCard from "@/components/admin/admin-product-card"
import { useLanguage } from "@/contexts/LanguageContext"
import { rwandaData } from "@/lib/rwanda-data"
import { MARKETPLACE_CATEGORIES, type MarketplaceCategory } from "@/lib/marketplace-access"
import {
  LISTING_CHANGE_LABEL_KEYS,
  type ListingChange,
  type ListingEditLogEntry,
} from "@/lib/validations/listing-request"

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
  reservedUntil?: string | null
  hidden?: boolean
  hiddenReason?: string | null
  images?: string[]
  latitude?: number | null
  longitude?: number | null
  createdAt?: string
  /** Set when the seller changed the listing after it went live. */
  editedAt?: string
  editCount?: number
  editLog?: ListingEditLogEntry[]
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
  latitude: "" as string | number, longitude: "" as string | number,
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
  const [hideTarget, setHideTarget] = useState<Service | null>(null)
  const [hideReason, setHideReason] = useState("")
  const [viewTarget, setViewTarget] = useState<Service | null>(null)
  const [viewIndex, setViewIndex] = useState(0)

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", image: "" })
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [editCategoryTarget, setEditCategoryTarget] = useState<Category | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  const loadAll = async () => {
    try {
      // includeHidden: the public pages never see hidden listings, but the people who
      // manage them have to, or they could never bring one back.
      const [sRes, cRes] = await Promise.all([fetch("/api/services?includeHidden=1"), fetch("/api/categories")])
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
      // Explicit coordinates only travel when the seller pinned them; the API
      // otherwise stamps district/sector-derived ones.
      const { latitude, longitude, ...rest } = form
      const hasCoords = latitude !== "" && longitude !== "" && latitude !== undefined && longitude !== undefined
      const payload = {
        ...rest,
        price: Number(form.price) || 0,
        category: activeCat,
        ...(hasCoords ? { latitude: Number(latitude), longitude: Number(longitude) } : {}),
      }
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

  /** Hide from / restore to the public pages. Unlike delete, nothing is lost. */
  const setVisibility = async (service: Service, action: "hide" | "show", reason?: string) => {
    setBusy(true)
    try {
      await fetch(`/api/listings/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      })
      await loadAll()
    } finally {
      setBusy(false)
      setHideTarget(null)
      setHideReason("")
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
      latitude: (service as any).latitude ?? "", longitude: (service as any).longitude ?? "",
    })
  }

  // --- details ----------------------------------------------------------------

  const openView = (service: Service) => {
    setViewTarget(service)
    setViewIndex(0)
  }

  /** A hold that has lapsed no longer counts, the same as the reservation code treats it. */
  const listingState = (service: Service) => {
    const status = service.listingStatus || "active"
    if (status === "reserved" && service.reservedUntil && new Date(service.reservedUntil) < new Date()) return "active"
    return status
  }

  const detailRows = (service: Service): [string, string][] => {
    const rows: [string, string | undefined][] =
      service.category === "sales"
        ? [
            [t("content.animalType"), service.animalType],
            [t("content.breed"), service.breed],
            [t("content.age"), service.age],
            [t("content.sex"), service.sex],
            [t("common.location"), [service.village, service.sector, service.district].filter(Boolean).join(", ")],
          ]
        : service.category === "drugs"
        ? [
            [t("content.drugType"), service.drugType],
            [t("content.usageDescription"), service.usageDescription],
          ]
        : [
            [t("content.feedType"), service.feedType],
            [t("content.quality"), service.quality],
            [t("content.targetAnimal"), service.targetAnimal],
          ]
    return rows.filter((row): row is [string, string] => !!row[1])
  }

  /** "from → to" for a seller's edit; photos read out as counts, so a swap with the same count says so. */
  const changeText = (change: ListingChange) =>
    change.field === "photos" && change.from === change.to
      ? t("listing.photosUpdated")
      : `${change.from || "—"} → ${change.to || "—"}`

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

  /** Capture the device's GPS position into the form; beats district-center guesses. */
  const captureLiveLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
        })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={captureLiveLocation} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
              {locating ? t("common.loading") : t("content.useLiveLocation")}
            </Button>
            {form.latitude && form.longitude ? (
              <span className="text-xs text-green-600">
                {t("content.pinnedAt")}: {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">{t("content.liveLocationHint")}</span>
            )}
            {form.latitude && form.longitude ? (
              <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => set({ latitude: "", longitude: "" })}>
                {t("common.clear")}
              </button>
            ) : null}
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
                    hidden={service.hidden === true}
                    onToggleHidden={() =>
                      service.hidden ? setVisibility(service, "show") : setHideTarget(service)
                    }
                    onView={() => openView(service)}
                    edited={!!service.editedAt}
                    labels={{
                      view: t("marketplace.viewDetails"),
                      edited: t("marketplace.editedBadge"),
                      hidden: t("listing.hiddenBadge"),
                    }}
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

      {/* Hide from the public pages */}
      <Dialog open={!!hideTarget} onOpenChange={(next) => { if (!next) { setHideTarget(null); setHideReason("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.hideTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("marketplace.hideDesc")} <strong>{hideTarget?.name}</strong>
            </p>
            {hideTarget?.sellerId && (
              <div>
                <Label htmlFor="hide-reason">{t("marketplace.hideReason")}</Label>
                <Textarea
                  id="hide-reason"
                  rows={3}
                  maxLength={300}
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">{t("marketplace.hideReasonHint")}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setHideTarget(null); setHideReason("") }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => hideTarget && setVisibility(hideTarget, "hide", hideReason.trim() || undefined)} disabled={busy}>
              {t("marketplace.hide")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Listing details: everything on the listing, plus what the seller has changed since it went live */}
      <Dialog open={!!viewTarget} onOpenChange={(next) => !next && setViewTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTarget?.name}</DialogTitle>
          </DialogHeader>

          {viewTarget && (() => {
            const photos = viewTarget.images?.length ? viewTarget.images : viewTarget.image ? [viewTarget.image] : []
            const state = listingState(viewTarget)
            const rows = detailRows(viewTarget)
            return (
              <div className="space-y-4">
                {photos.length > 0 && (
                  <div>
                    <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={photos[Math.min(viewIndex, photos.length - 1)]}
                        alt={viewTarget.name}
                        fill
                        className={`object-cover ${viewTarget.hidden ? "opacity-50 grayscale" : ""}`}
                      />
                    </div>
                    {photos.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                        {photos.map((url, i) => (
                          <button
                            key={url + i}
                            type="button"
                            onClick={() => setViewIndex(i)}
                            className={`relative h-14 w-14 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                              i === viewIndex ? "border-primary" : "border-transparent hover:border-gray-300"
                            }`}
                          >
                            <Image src={url} alt={`${viewTarget.name} ${i + 1}`} fill className="object-cover" sizes="56px" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{categoryName(viewTarget.categoryId, viewTarget.category as Cat)}</Badge>
                    {viewTarget.category === "sales" && (
                      <Badge variant="outline">
                        {t("marketplace.listingStatus")}: {t(`marketplace.state.${state}`)}
                      </Badge>
                    )}
                    {viewTarget.hidden && (
                      <Badge className="bg-gray-800 text-white hover:bg-gray-800">
                        <EyeOff className="h-3 w-3 mr-1" />
                        {t("listing.hiddenBadge")}
                      </Badge>
                    )}
                    {viewTarget.editedAt && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        {t("marketplace.editedBadge")} · {new Date(viewTarget.editedAt).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    RWF {(viewTarget.price || 0).toLocaleString()}
                    {viewTarget.duration ? <span className="text-xs font-normal text-gray-500"> / {viewTarget.duration}</span> : null}
                  </span>
                </div>

                {viewTarget.hidden && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{t("marketplace.hiddenState")}</span>
                    {viewTarget.hiddenReason ? `: ${viewTarget.hiddenReason}` : ""}
                  </p>
                )}

                {rows.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {rows.map(([label, value]) => (
                      <div key={label}><span className="text-gray-500">{label}:</span> {value}</div>
                    ))}
                  </div>
                )}

                {viewTarget.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{t("content.description")}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{viewTarget.description}</p>
                  </div>
                )}

                {(viewTarget.sellerPhone || viewTarget.sellerEmail) && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{t("marketplace.sellerContact")}</p>
                    <p className="text-sm text-gray-600">
                      {[viewTarget.sellerPhone, viewTarget.sellerEmail].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}

                {viewTarget.editLog && viewTarget.editLog.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">{t("marketplace.editHistory")}</p>
                    <ul className="space-y-2">
                      {[...viewTarget.editLog].reverse().map((entry, i) => (
                        <li key={i} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                          <p className="text-xs text-amber-800 mb-1">
                            {t("marketplace.editedBySeller")} · {new Date(entry.at).toLocaleString()}
                          </p>
                          <ul className="space-y-0.5 text-gray-700">
                            {entry.changes.map((change) => (
                              <li key={change.field} className="break-words">
                                <span className="font-medium">{t(LISTING_CHANGE_LABEL_KEYS[change.field])}:</span>{" "}
                                {changeText(change)}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewTarget.createdAt && (
                  <p className="text-xs text-gray-400">
                    {t("marketplace.postedOn")} {new Date(viewTarget.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )
          })()}

          {/* Acting from here closes this view first, so it is never left showing a stale listing. */}
          {viewTarget && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { const s = viewTarget; setViewTarget(null); openEdit(s) }}>
                <Edit className="h-4 w-4 mr-2" />
                {t("common.edit")}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const s = viewTarget
                  setViewTarget(null)
                  if (s.hidden) setVisibility(s, "show")
                  else setHideTarget(s)
                }}
              >
                {viewTarget.hidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                {viewTarget.hidden ? t("marketplace.show") : t("marketplace.hide")}
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => { const s = viewTarget; setViewTarget(null); setDeleteTarget(s) }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete")}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteItemConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.deleteItemConfirmDesc").replace("{name}", deleteTarget?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteService} disabled={busy}>{t("common.delete")}</AlertDialogAction>
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
