"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { getCurrentUser } from "@/lib/actions/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { rwandaData } from "@/lib/rwanda-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus, X, Loader2, ImagePlus, Info, Expand, Crosshair, Pencil, EyeOff, Trash2, Ban, Package, PackageX,
  CalendarClock, AlertTriangle,
} from "lucide-react"
import {
  FEED_QUALITIES, FEED_TARGET_ANIMALS, FEED_TYPES, MAX_LISTING_PHOTOS,
} from "@/lib/validations/listing-request"
import {
  DEFAULT_LOW_STOCK_AT, earliestAcceptableExpiry, expiryState, isLowStock, lastSellableDay,
} from "@/lib/product-rules"
import PhotoLightbox from "@/components/marketplace/photo-lightbox"
import { useProductRules } from "@/hooks/use-product-rules"

interface FeedRequest {
  id: string
  title: string
  feedType: string | null
  quality: string | null
  targetAnimal: string | null
  /** What one unit is, e.g. "50 kg bag". The price is per unit. */
  unit: string | null
  /** Units in stock when the request was sent; the live count is on `listing`. */
  stock: number | null
  /** Optional on feed: hay and minerals often carry no date. */
  expiryDate: string | null
  batchNumber: string | null
  proposedPrice: number
  description: string
  district: string
  sector: string | null
  village: string | null
  photos: string[]
  latitude: number | null
  longitude: number | null
  status: "pending" | "approved" | "rejected" | "withdrawn"
  reviewNote: string | null
  resubmitCount: number
  reviewHistory: { note: string; reviewedAt: string | null }[]
  publishedServiceId: string | null
  /** Live state of the published listing; null when unpublished or staff deleted it. */
  listing: {
    hidden: boolean
    reason: string | null
    locked: boolean
    stock: number | null
    held: number
    lowStockAt: number | null
  } | null
  /** Decided by the server, which is also what enforces them. */
  removed: boolean
  editable: boolean
  deletable: boolean
  editedAt: string | null
  removal: {
    status: "pending" | "approved" | "declined"
    reason: string | null
    reviewNote: string | null
  } | null
  createdAt: string
}

/** Labels for the feed fields, reusing the ones staff see when they list feed themselves. */
const FEED_TYPE_LABEL_KEYS: Record<(typeof FEED_TYPES)[number], string> = {
  Hay: "content.hay",
  Concentrates: "content.concentrates",
  Minerals: "content.minerals",
  Supplements: "content.supplements",
}

const QUALITY_LABEL_KEYS: Record<(typeof FEED_QUALITIES)[number], string> = {
  High: "content.high",
  Medium: "content.medium",
  Low: "content.low",
}

const TARGET_ANIMAL_LABEL_KEYS: Record<(typeof FEED_TARGET_ANIMALS)[number], string> = {
  Cattle: "content.cattle",
  Goats: "content.goats",
  Sheep: "content.sheep",
  Poultry: "content.poultry",
  Pigs: "content.pigs",
}

/**
 * A Select item can't carry an empty value, so an optional field left unset shows as
 * this item ("Any animal", "Not stated") and is sent as "".
 */
const NOT_SET = "__none"

const emptyForm = {
  title: "",
  feedType: "",
  quality: "",
  targetAnimal: "",
  unit: "",
  proposedPrice: "",
  stock: "",
  expiryDate: "",
  batchNumber: "",
  description: "",
  district: "",
  sector: "",
  village: "",
}

function statusVariant(status: FeedRequest["status"]) {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800"
    case "rejected": return "bg-red-100 text-red-800"
    case "withdrawn": return "bg-gray-100 text-gray-700"
    default: return "bg-amber-100 text-amber-800"
  }
}

/**
 * A feed supplier's feed listings: ask Vettrack to put a feed on the feeds page, and
 * follow each request through review. The same request lifecycle as a pharmacy's drugs
 * (app/(pharmacy)/pharmacy-portal/listings) - the marketplace reviews both in one queue -
 * with the feed form in place of the drug one.
 */
export default function FeedSupplierListingsPage() {
  const { t } = useLanguage()
  const rules = useProductRules()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [home, setHome] = useState<{ district: string; sector: string }>({ district: "", sector: "" })
  const [requests, setRequests] = useState<FeedRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  // Set while revising a rejected request; null means the dialog is a fresh request.
  const [revising, setRevising] = useState<FeedRequest | null>(null)
  // Set while editing a listing that is already live; the dialog then saves in place.
  const [editing, setEditing] = useState<FeedRequest | null>(null)
  const [withdrawTarget, setWithdrawTarget] = useState<FeedRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FeedRequest | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<FeedRequest | null>(null)
  const [removeReason, setRemoveReason] = useState("")
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [stockTarget, setStockTarget] = useState<FeedRequest | null>(null)
  const [stockValue, setStockValue] = useState("")
  const [lowStockValue, setLowStockValue] = useState("")
  const [savingStock, setSavingStock] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [detailTarget, setDetailTarget] = useState<FeedRequest | null>(null)
  const [detailIndex, setDetailIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const [userData] = await Promise.all([getCurrentUser().catch(() => null), fetchRequests()])
      // The supplier's own location pre-fills new requests; most feed ships from there.
      if (userData) {
        setHome({ district: String(userData.district ?? ""), sector: String(userData.sector ?? "") })
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/listing-requests")
      if (res.ok) setRequests(await res.json())
    } catch {
      // Leaving the list as-is is better than blanking it on a flaky connection.
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    const room = MAX_LISTING_PHOTOS - photos.length
    if (room <= 0) {
      setError(t("listing.tooManyPhotos"))
      return
    }

    setUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files).slice(0, room)) {
      const body = new FormData()
      body.append("file", file)
      try {
        const res = await fetch("/api/upload/listing", { method: "POST", body })
        const data = await res.json()
        if (data.success) {
          uploaded.push(data.url)
        } else {
          setError(data.message || t("listing.uploadFailed"))
        }
      } catch {
        setError(t("listing.uploadFailed"))
      }
    }
    setPhotos((prev) => [...prev, ...uploaded])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const resetForm = () => {
    setForm(emptyForm)
    setPhotos([])
    setGps(null)
    setRevising(null)
    setEditing(null)
    setError(null)
  }

  const startNew = () => {
    resetForm()
    setForm({ ...emptyForm, district: home.district, sector: home.sector })
    setOpen(true)
  }

  /** Load a request's details into the form, ready to change. */
  const fillForm = (request: FeedRequest) => {
    setDetailTarget(null)
    setForm({
      title: request.title,
      feedType: request.feedType ?? "",
      quality: request.quality ?? "",
      targetAnimal: request.targetAnimal ?? "",
      unit: request.unit ?? "",
      proposedPrice: String(request.proposedPrice),
      stock: request.stock != null ? String(request.stock) : "",
      expiryDate: request.expiryDate ?? "",
      batchNumber: request.batchNumber ?? "",
      description: request.description,
      district: request.district,
      sector: request.sector ?? "",
      village: request.village ?? "",
    })
    setPhotos(request.photos)
    setGps(
      request.latitude != null && request.longitude != null
        ? { lat: request.latitude, lng: request.longitude }
        : null
    )
    setError(null)
  }

  /** Reopen a rejected request with everything that was sent, ready to fix and resend. */
  const startRevising = (request: FeedRequest) => {
    fillForm(request)
    setEditing(null)
    setRevising(request)
    setOpen(true)
  }

  /** Change a listing that is already live. Saved in place; the marketplace sees it was edited. */
  const startEditing = (request: FeedRequest) => {
    fillForm(request)
    setRevising(null)
    setEditing(request)
    setOpen(true)
  }

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        photos,
        ...(gps ? { latitude: gps.lat, longitude: gps.lng } : {}),
      }
      const existing = revising ?? editing
      const res = existing
        ? await fetch(`/api/listing-requests/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: revising ? "resubmit" : "edit", ...payload }),
          })
        : await fetch("/api/listing-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (editing ? t("listing.editFailed") : t("listing.submitFailed")))
        return
      }
      setOpen(false)
      resetForm()
      await fetchRequests()
    } catch {
      setError(editing ? t("listing.editFailed") : t("listing.submitFailed"))
    } finally {
      setSaving(false)
    }
  }

  const closeDelete = () => {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  /** Clear a removed or unpublished feed from the list. The server refuses anything still live. */
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/listing-requests/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || t("listing.deleteFailed"))
        return
      }
      closeDelete()
      await fetchRequests()
    } catch {
      setDeleteError(t("listing.deleteFailed"))
    } finally {
      setDeleting(false)
    }
  }

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return
    try {
      await fetch(`/api/listing-requests/${withdrawTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      })
      await fetchRequests()
    } finally {
      setWithdrawTarget(null)
    }
  }

  const closeRemoval = () => {
    setRemoveTarget(null)
    setRemoveReason("")
    setRemoveError(null)
  }

  /** Ask Vettrack to take a published feed down. Only staff can actually hide it. */
  const submitRemoval = async () => {
    if (!removeTarget) return
    setRemoveError(null)
    setRemoving(true)
    try {
      const res = await fetch(`/api/listing-requests/${removeTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_removal", reason: removeReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRemoveError(data.error || t("listing.removalFailed"))
        return
      }
      closeRemoval()
      await fetchRequests()
    } catch {
      setRemoveError(t("listing.removalFailed"))
    } finally {
      setRemoving(false)
    }
  }

  const openStock = (request: FeedRequest) => {
    setStockTarget(request)
    setStockValue(request.listing?.stock != null ? String(request.listing.stock) : "")
    setLowStockValue(String(request.listing?.lowStockAt ?? DEFAULT_LOW_STOCK_AT))
    setStockError(null)
  }

  const closeStock = () => {
    setStockTarget(null)
    setStockError(null)
  }

  /** Set how many units the supplier has. Live at once; 0 takes the feed off the feeds page. */
  const saveStock = async () => {
    if (!stockTarget) return
    setStockError(null)
    setSavingStock(true)
    try {
      const res = await fetch(`/api/listing-requests/${stockTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stock",
          stock: stockValue,
          ...(lowStockValue.trim() !== "" ? { lowStockAt: lowStockValue } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStockError(data.error || t("pharmacy.stockFailed"))
        return
      }
      closeStock()
      await fetchRequests()
    } catch {
      setStockError(t("pharmacy.stockFailed"))
    } finally {
      setSavingStock(false)
    }
  }

  /** A published feed that staff have not taken off the feeds page. */
  const isLive = (request: FeedRequest) =>
    request.status === "approved" && !request.removed && !!request.listing && !request.listing.hidden

  /** Units buyers can still order, or null when the feed doesn't count stock. */
  const available = (request: FeedRequest) =>
    request.listing?.stock != null ? Math.max(0, request.listing.stock - request.listing.held) : null

  /** Live, but every unit is sold or in someone's checkout, so buyers can't see it. */
  const isOutOfStock = (request: FeedRequest) => isLive(request) && available(request) === 0

  /** Live, with stock at or below the supplier's warning level. */
  const isLow = (request: FeedRequest) =>
    isLive(request) && isLowStock(available(request), request.listing?.lowStockAt)

  /** Live, but too close to its expiry date to be ordered. Never true for feed without a date. */
  const isExpiredOffSale = (request: FeedRequest) =>
    isLive(request) && expiryState(request.expiryDate, rules.sellByDays) === "unsellable"

  /** The live count once published, the count that was sent before that. */
  const stockShown = (request: FeedRequest) =>
    request.status === "approved" ? request.listing?.stock ?? null : request.stock

  /** A published listing staff have taken off the public pages but could bring back. */
  const isHidden = (request: FeedRequest) =>
    request.status === "approved" && !request.removed && request.listing?.hidden === true

  /** One status to read: "Removed" or "Hidden" replaces "Published" once the feed is off the page. */
  const statusBadge = (request: FeedRequest) =>
    request.removed ? (
      <Badge className="bg-gray-200 text-gray-700" variant="secondary">
        <Trash2 className="h-3 w-3 mr-1" />
        {t("listing.removedBadge")}
      </Badge>
    ) : isHidden(request) ? (
      <Badge className="bg-gray-200 text-gray-700" variant="secondary">
        <EyeOff className="h-3 w-3 mr-1" />
        {t("listing.hiddenBadge")}
      </Badge>
    ) : isOutOfStock(request) ? (
      <Badge className="bg-red-100 text-red-800" variant="secondary">
        <PackageX className="h-3 w-3 mr-1" />
        {t("pharmacy.outOfStock")}
      </Badge>
    ) : isExpiredOffSale(request) ? (
      <Badge className="bg-red-100 text-red-800" variant="secondary">
        <CalendarClock className="h-3 w-3 mr-1" />
        {t("pharmacy.offSaleExpiry")}
      </Badge>
    ) : (
      <Badge className={statusVariant(request.status)} variant="secondary">
        {t(`listing.status.${request.status}`)}
      </Badge>
    )

  const label = (keys: Record<string, string>, value: string | null) => (value ? t(keys[value] ?? value) : null)
  const feedTypeLabel = (value: string | null) => label(FEED_TYPE_LABEL_KEYS, value)
  const qualityLabel = (value: string | null) => label(QUALITY_LABEL_KEYS, value)
  const targetAnimalLabel = (value: string | null) => label(TARGET_ANIMAL_LABEL_KEYS, value)

  /** "Concentrates · Cattle · High quality" - whichever of them the supplier filled in. */
  const feedSummary = (request: FeedRequest) =>
    [
      feedTypeLabel(request.feedType),
      targetAnimalLabel(request.targetAnimal),
      request.quality ? `${qualityLabel(request.quality)} ${t("feeds.quality").toLowerCase()}` : null,
    ]
      .filter(Boolean)
      .join(" · ")

  const perUnit = (request: FeedRequest) => (request.unit ? ` / ${request.unit}` : "")

  const sectors = form.district ? rwandaData[form.district] ?? [] : []

  const openDetails = (request: FeedRequest) => {
    setDetailTarget(request)
    setDetailIndex(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("feedSupplier.myListings")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("feedSupplier.myListingsDesc")}</p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t("feedSupplier.requestListing")}
        </Button>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-900">{t("feedSupplier.howItWorks")}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-24 w-24 rounded-md flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex sm:flex-col gap-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500 text-sm">
            {t("feedSupplier.noRequests")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => openDetails(request)}
                  className="group relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100"
                >
                  {request.photos[0] && (
                    <Image src={request.photos[0]} alt={request.title} fill className="object-cover" sizes="96px" />
                  )}
                  {request.photos.length > 1 && (
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      +{request.photos.length - 1}
                    </span>
                  )}
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Expand className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDetails(request)}
                      className="font-medium text-gray-900 truncate hover:underline text-left"
                    >
                      {request.title}
                    </button>
                    {statusBadge(request)}
                    {isLow(request) && (
                      <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t("pharmacy.lowStock")}
                      </Badge>
                    )}
                    {isLive(request) && expiryState(request.expiryDate, rules.sellByDays) === "soon" && (
                      <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                        <CalendarClock className="h-3 w-3 mr-1" />
                        {t("pharmacy.expiresSoon")}
                      </Badge>
                    )}
                    {request.status === "approved" && !request.removed && request.removal?.status === "pending" && (
                      <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                        {t("listing.removalRequested")}
                      </Badge>
                    )}
                  </div>
                  {feedSummary(request) && <p className="text-sm text-gray-600">{feedSummary(request)}</p>}
                  {request.removed && <p className="text-xs text-gray-500">{t("listing.removedNote")}</p>}
                  {isHidden(request) && (
                    <p className="text-xs text-gray-500">
                      {t("listing.hiddenNote")}
                      {request.listing?.reason ? ` ${request.listing.reason}` : ""}
                    </p>
                  )}
                  {request.status === "approved" && request.editedAt && !request.removed && (
                    <p className="text-xs text-gray-400">
                      {t("listing.editedOn")} {new Date(request.editedAt).toLocaleDateString()}
                    </p>
                  )}
                  {request.status === "approved" && !isHidden(request) && !request.removed && request.removal?.status === "declined" && (
                    <p className="text-xs text-red-700">
                      {t("listing.removalDeclined")}
                      {request.removal.reviewNote ? `: ${request.removal.reviewNote}` : ""}
                    </p>
                  )}
                  <p className="text-sm font-medium text-gray-900">
                    RWF {request.proposedPrice.toLocaleString()}
                    {request.unit && <span className="text-xs font-normal text-gray-500">{perUnit(request)}</span>}
                  </p>
                  {request.status === "approved" && !request.removed && request.listing?.stock != null ? (
                    <p className="text-sm text-gray-600 flex flex-wrap items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      {t("pharmacy.inStockCount")}: {request.listing.stock.toLocaleString()}
                      {request.listing.held > 0 && (
                        <span className="text-xs text-gray-500">
                          ({request.listing.held.toLocaleString()} {t("pharmacy.inCheckout")})
                        </span>
                      )}
                    </p>
                  ) : (
                    request.status !== "approved" && request.stock != null && (
                      <p className="text-sm text-gray-600 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        {t("pharmacy.inStockCount")}: {request.stock.toLocaleString()}
                      </p>
                    )
                  )}
                  {isOutOfStock(request) && (
                    <p className="text-xs text-red-700">
                      {request.listing!.held > 0 ? t("pharmacy.allInCheckoutNote") : t("feedSupplier.outOfStockNote")}
                    </p>
                  )}
                  {request.expiryDate && !request.removed && (
                    <p className={`text-xs ${isExpiredOffSale(request) ? "text-red-700" : "text-gray-500"}`}>
                      {t("pharmacy.expiresOn")} {request.expiryDate}
                      {isExpiredOffSale(request)
                        ? ` · ${t("pharmacy.offSaleExpiryNote")}`
                        : isLive(request) && expiryState(request.expiryDate, rules.sellByDays) === "soon"
                          ? ` · ${t("pharmacy.sellsUntil")} ${lastSellableDay(request.expiryDate, rules.sellByDays)}`
                          : ""}
                    </p>
                  )}
                  {request.status === "pending" && request.resubmitCount > 0 && (
                    <p className="text-xs text-amber-700 pt-1">
                      {t("listing.resubmittedTimes")} {request.resubmitCount + 1}
                    </p>
                  )}
                  {request.reviewNote && (
                    request.status === "rejected" ? (
                      <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-900">
                        <span className="font-medium">{t("listing.whatToChange")}:</span> {request.reviewNote}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 pt-1">
                        <span className="font-medium">{t("listing.noteFromVettrack")}:</span> {request.reviewNote}
                      </p>
                    )
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2">
                  {request.status === "rejected" && (
                    <Button size="sm" onClick={() => startRevising(request)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("listing.reviseResubmit")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openDetails(request)}>
                    {t("listing.viewDetails")}
                  </Button>
                  {request.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => setWithdrawTarget(request)}>
                      {t("listing.withdraw")}
                    </Button>
                  )}
                  {request.status === "approved" && request.listing && !request.removed && (
                    <Button
                      variant={isOutOfStock(request) ? "default" : "outline"}
                      size="sm"
                      onClick={() => openStock(request)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      {t("pharmacy.updateStock")}
                    </Button>
                  )}
                  {request.editable && (
                    <Button variant="outline" size="sm" onClick={() => startEditing(request)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("listing.editListing")}
                    </Button>
                  )}
                  {request.status === "approved" &&
                    request.listing &&
                    !request.removed &&
                    request.removal?.status !== "pending" && (
                      <Button variant="outline" size="sm" onClick={() => setRemoveTarget(request)}>
                        <Ban className="h-4 w-4 mr-2" />
                        {t("listing.requestRemoval")}
                      </Button>
                    )}
                  {request.deletable && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => { setDeleteError(null); setDeleteTarget(request) }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("listing.deletePost")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request form */}
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("listing.editTitle") : revising ? t("listing.reviseTitle") : t("feedSupplier.requestListing")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* A live listing is edited in place, so say so: nothing is re-reviewed, but Vettrack is told. */}
            {editing && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                {t("listing.editNotice")}
              </div>
            )}

            {/* Kept in view while editing, so what was asked can be fixed without going back. */}
            {revising?.reviewNote && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <p className="font-medium">{t("listing.whatToChange")}</p>
                <p className="mt-0.5">{revising.reviewNote}</p>
              </div>
            )}

            <div>
              <Label htmlFor="title">{t("feedSupplier.feedName")}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("feedSupplier.feedNamePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>{t("content.feedType")}</Label>
                <Select value={form.feedType || undefined} onValueChange={(v) => setForm({ ...form, feedType: v })}>
                  <SelectTrigger><SelectValue placeholder={t("content.selectFeedType")} /></SelectTrigger>
                  <SelectContent>
                    {FEED_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{t(FEED_TYPE_LABEL_KEYS[type])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("content.targetAnimal")}</Label>
                <Select
                  value={form.targetAnimal || NOT_SET}
                  onValueChange={(v) => setForm({ ...form, targetAnimal: v === NOT_SET ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_SET}>{t("feedSupplier.anyAnimal")}</SelectItem>
                    {FEED_TARGET_ANIMALS.map((animal) => (
                      <SelectItem key={animal} value={animal}>{t(TARGET_ANIMAL_LABEL_KEYS[animal])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("content.quality")}</Label>
                <Select
                  value={form.quality || NOT_SET}
                  onValueChange={(v) => setForm({ ...form, quality: v === NOT_SET ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_SET}>{t("feedSupplier.notStated")}</SelectItem>
                    {FEED_QUALITIES.map((quality) => (
                      <SelectItem key={quality} value={quality}>{t(QUALITY_LABEL_KEYS[quality])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="unit">{t("feedSupplier.unit")}</Label>
                <Input
                  id="unit"
                  value={form.unit}
                  maxLength={40}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder={t("feedSupplier.unitPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="price">{t("feedSupplier.pricePerUnit")}</Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="numeric"
                  value={form.proposedPrice}
                  onChange={(e) => setForm({ ...form, proposedPrice: e.target.value })}
                  placeholder="RWF"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">{t("feedSupplier.unitHint")}</p>

            {/* A live feed's count is changed with "Update stock", which needs no review. */}
            {!editing && (
              <div>
                <Label htmlFor="stock">{t("pharmacy.stockLabel")}</Label>
                <Input
                  id="stock"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder={t("pharmacy.stockPlaceholder")}
                  className="sm:max-w-[50%]"
                />
                <p className="text-xs text-gray-500 mt-1">{t("feedSupplier.stockHint")}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expiry">{t("pharmacy.expiryDate")}</Label>
                <Input
                  id="expiry"
                  type="date"
                  min={earliestAcceptableExpiry(rules.sellByDays)}
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="batch">{t("pharmacy.batchNumber")}</Label>
                <Input
                  id="batch"
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              {t("feedSupplier.expiryHint")
                .replace("{days}", String(rules.sellByDays))
                .replace("{minDays}", String(rules.minDaysOnSale))}
            </p>

            <div>
              <Label htmlFor="description">{t("listing.description")}</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("feedSupplier.descriptionPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>{t("listing.district")}</Label>
                <Select
                  value={form.district || undefined}
                  onValueChange={(v) => setForm({ ...form, district: v, sector: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(rwandaData).sort().map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("listing.sector")}</Label>
                <Select
                  value={form.sector || undefined}
                  onValueChange={(v) => setForm({ ...form, sector: v })}
                  disabled={!form.district}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="village">{t("listing.village")}</Label>
                <Input id="village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
            </div>

            {/* Exact spot: optional GPS pin, district/sector fallback otherwise */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={locating}
                onClick={() => {
                  if (!navigator.geolocation) return
                  setLocating(true)
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setGps({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) })
                      setLocating(false)
                    },
                    () => setLocating(false),
                    { enableHighAccuracy: true, timeout: 10000 }
                  )
                }}
              >
                {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
                {locating ? t("common.loading") : t("listing.useLiveLocation")}
              </Button>
              {gps ? (
                <>
                  <span className="text-xs text-green-600">
                    {t("listing.locationPinned")}: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
                  </span>
                  <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setGps(null)}>
                    {t("common.clear")}
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-400">{t("listing.liveLocationHint")}</span>
              )}
            </div>

            {/* Photos */}
            <div>
              <Label>{t("listing.photos")}</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {photos.map((url) => (
                  <div key={url} className="relative h-20 w-20 rounded-md overflow-hidden border border-gray-200">
                    <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((p) => p !== url))}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                      aria-label={t("listing.removePhoto")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {photos.length < MAX_LISTING_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-20 w-20 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <p className="text-xs text-gray-500 mt-1.5">{t("feedSupplier.photosHint")}</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? t("listing.saveChanges") : revising ? t("listing.resubmitRequest") : t("listing.submitRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete a removed or unpublished feed from the list */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(next) => !next && closeDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("listing.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("listing.deleteDesc")} <strong>{deleteTarget?.title}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            {/* Not AlertDialogAction: that closes the dialog itself, which would hide a failed delete's error. */}
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("listing.deletePost")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!withdrawTarget} onOpenChange={(next) => !next && setWithdrawTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("listing.withdrawTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("listing.withdrawDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdraw}>{t("listing.withdraw")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ask Vettrack to take a published feed down */}
      <Dialog open={!!removeTarget} onOpenChange={(next) => { if (!next) closeRemoval() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("listing.removalTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("feedSupplier.removalDesc")} <strong>{removeTarget?.title}</strong>
            </p>
            <div>
              <Label htmlFor="removal-reason">{t("listing.removalReason")}</Label>
              <Textarea
                id="removal-reason"
                rows={3}
                maxLength={300}
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder={t("feedSupplier.removalReasonPlaceholder")}
              />
            </div>
            {removeError && <p className="text-sm text-red-600">{removeError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRemoval}>{t("common.cancel")}</Button>
            <Button onClick={submitRemoval} disabled={removing}>
              {removing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("listing.removalSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How many units the supplier has */}
      <Dialog open={!!stockTarget} onOpenChange={(next) => { if (!next) closeStock() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pharmacy.updateStock")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("pharmacy.updateStockDesc")} <strong>{stockTarget?.title}</strong>
              {stockTarget?.unit ? ` (${stockTarget.unit})` : ""}
            </p>
            <div>
              <Label htmlFor="stock-value">{t("pharmacy.stockLabel")}</Label>
              <Input
                id="stock-value"
                type="number"
                inputMode="numeric"
                min={0}
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && stockValue.trim() !== "") saveStock() }}
              />
              <p className="text-xs text-gray-500 mt-1">{t("feedSupplier.updateStockHint")}</p>
              {!!stockTarget?.listing?.held && (
                <p className="text-xs text-amber-700 mt-1">
                  {stockTarget.listing.held.toLocaleString()} {t("pharmacy.inCheckoutHint")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="low-stock-value">{t("pharmacy.lowStockAt")}</Label>
              <Input
                id="low-stock-value"
                type="number"
                inputMode="numeric"
                min={0}
                value={lowStockValue}
                onChange={(e) => setLowStockValue(e.target.value)}
                className="sm:max-w-[50%]"
              />
              <p className="text-xs text-gray-500 mt-1">{t("pharmacy.lowStockAtHint")}</p>
            </div>
            {stockError && <p className="text-sm text-red-600">{stockError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeStock}>{t("common.cancel")}</Button>
            <Button onClick={saveStock} disabled={savingStock || stockValue.trim() === ""}>
              {savingStock && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("pharmacy.saveStock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feed details */}
      <Dialog open={!!detailTarget} onOpenChange={(next) => !next && setDetailTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTarget?.title}</DialogTitle>
          </DialogHeader>

          {detailTarget && (
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block h-64 w-full rounded-lg overflow-hidden bg-gray-100"
                >
                  {detailTarget.photos[detailIndex] && (
                    <Image
                      src={detailTarget.photos[detailIndex]}
                      alt={detailTarget.title}
                      fill
                      className="object-cover"
                    />
                  )}
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Expand className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  {detailTarget.photos.length > 1 && (
                    <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {detailIndex + 1} / {detailTarget.photos.length}
                    </span>
                  )}
                </button>

                {detailTarget.photos.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {detailTarget.photos.map((url, i) => (
                      <button
                        key={url + i}
                        type="button"
                        onClick={() => setDetailIndex(i)}
                        className={`relative h-14 w-14 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                          i === detailIndex ? "border-primary" : "border-transparent hover:border-gray-300"
                        }`}
                      >
                        <Image src={url} alt={`${detailTarget.title} ${i + 1}`} fill className="object-cover" sizes="56px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {statusBadge(detailTarget)}
                <span className="text-lg font-semibold text-gray-900">
                  RWF {detailTarget.proposedPrice.toLocaleString()}
                  {detailTarget.unit && (
                    <span className="text-sm font-normal text-gray-500">{perUnit(detailTarget)}</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                {detailTarget.feedType && (
                  <div>
                    <span className="text-gray-500">{t("content.feedType")}:</span> {feedTypeLabel(detailTarget.feedType)}
                  </div>
                )}
                {detailTarget.targetAnimal && (
                  <div>
                    <span className="text-gray-500">{t("content.targetAnimal")}:</span> {targetAnimalLabel(detailTarget.targetAnimal)}
                  </div>
                )}
                {detailTarget.quality && (
                  <div>
                    <span className="text-gray-500">{t("content.quality")}:</span> {qualityLabel(detailTarget.quality)}
                  </div>
                )}
              </div>

              {stockShown(detailTarget) != null && (
                <div className="text-sm flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-500">{t("pharmacy.inStockCount")}:</span>{" "}
                  {stockShown(detailTarget)!.toLocaleString()}
                  {detailTarget.unit ? ` × ${detailTarget.unit}` : ""}
                </div>
              )}

              {(detailTarget.expiryDate || detailTarget.batchNumber) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {detailTarget.expiryDate && (
                    <div>
                      <span className="text-gray-500">{t("pharmacy.expiryDate")}:</span> {detailTarget.expiryDate}
                    </div>
                  )}
                  {detailTarget.batchNumber && (
                    <div>
                      <span className="text-gray-500">{t("pharmacy.batchNumber")}:</span> {detailTarget.batchNumber}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">{t("listing.description")}</p>
                <p className="text-sm text-gray-600">{detailTarget.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">{t("common.location")}</p>
                <p className="text-sm text-gray-600">
                  {[detailTarget.village, detailTarget.sector, detailTarget.district].filter(Boolean).join(", ")}
                </p>
              </div>

              {detailTarget.reviewNote && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{t("listing.noteFromVettrack")}</p>
                  <p className="text-sm text-gray-600">{detailTarget.reviewNote}</p>
                </div>
              )}

              {detailTarget.reviewHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{t("listing.earlierFeedback")}</p>
                  <ul className="space-y-1">
                    {detailTarget.reviewHistory.map((entry, i) => (
                      <li key={i} className="text-sm text-gray-600">
                        {entry.reviewedAt && (
                          <span className="text-xs text-gray-400 mr-2">
                            {new Date(entry.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                        {entry.note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-400">
                {t("listing.submittedOn")} {new Date(detailTarget.createdAt).toLocaleDateString()}
              </p>

              {detailTarget.status === "rejected" && (
                <div className="flex justify-end">
                  <Button onClick={() => startRevising(detailTarget)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("listing.reviseResubmit")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PhotoLightbox
        photos={detailTarget?.photos ?? []}
        alt={detailTarget?.title ?? ""}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        initialIndex={detailIndex}
      />
    </div>
  )
}
