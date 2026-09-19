"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { getCurrentUser } from "@/lib/actions/auth"
import { getAnimals } from "@/lib/actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { rwandaData } from "@/lib/rwanda-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, X, Loader2, ImagePlus, Info, Expand, Crosshair, Pencil, EyeOff, Trash2 } from "lucide-react"
import { ANIMAL_TYPES, ANIMAL_SEXES, MAX_LISTING_PHOTOS } from "@/lib/validations/listing-request"
import PhotoLightbox from "@/components/marketplace/photo-lightbox"

interface Animal { _id: string; name: string; type: string }

interface ListingRequest {
  id: string
  title: string
  animalType: string
  breed: string | null
  age: string | null
  sex: string | null
  proposedPrice: number
  description: string
  district: string
  sector: string | null
  village: string | null
  photos: string[]
  animalId: string | null
  latitude: number | null
  longitude: number | null
  status: "pending" | "approved" | "rejected" | "withdrawn"
  reviewNote: string | null
  resubmitCount: number
  reviewHistory: { note: string; reviewedAt: string | null }[]
  publishedServiceId: string | null
  /** Live state of the published listing; null when unpublished or staff deleted it. */
  listing: { hidden: boolean; reason: string | null } | null
  /** The farmer's ask for the published listing to be taken down; null until they ask. */
  removal: {
    status: "pending" | "approved" | "declined"
    reason: string | null
    reviewNote: string | null
  } | null
  createdAt: string
}

const emptyForm = {
  title: "",
  animalType: "",
  breed: "",
  age: "",
  sex: "",
  proposedPrice: "",
  description: "",
  district: "",
  sector: "",
  village: "",
  animalId: "",
}

function statusVariant(status: ListingRequest["status"]) {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800"
    case "rejected": return "bg-red-100 text-red-800"
    case "withdrawn": return "bg-gray-100 text-gray-700"
    default: return "bg-amber-100 text-amber-800"
  }
}

export default function FarmerListingsPage() {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [requests, setRequests] = useState<ListingRequest[]>([])
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
  const [revising, setRevising] = useState<ListingRequest | null>(null)
  const [withdrawTarget, setWithdrawTarget] = useState<ListingRequest | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ListingRequest | null>(null)
  const [removeReason, setRemoveReason] = useState("")
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [detailTarget, setDetailTarget] = useState<ListingRequest | null>(null)
  const [detailIndex, setDetailIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setUser(userData)
      const [animalsData] = await Promise.all([
        getAnimals(userData._id.toString()).catch(() => []),
        fetchRequests(),
      ])
      setAnimals(animalsData as Animal[])
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
    setError(null)
  }

  /** Reopen a rejected request with everything the farmer sent, ready to fix and resend. */
  const startRevising = (request: ListingRequest) => {
    setDetailTarget(null)
    setForm({
      title: request.title,
      animalType: request.animalType,
      breed: request.breed ?? "",
      age: request.age ?? "",
      sex: request.sex ?? "",
      proposedPrice: String(request.proposedPrice),
      description: request.description,
      district: request.district,
      sector: request.sector ?? "",
      village: request.village ?? "",
      animalId: request.animalId ?? "",
    })
    setPhotos(request.photos)
    setGps(
      request.latitude != null && request.longitude != null
        ? { lat: request.latitude, lng: request.longitude }
        : null
    )
    setError(null)
    setRevising(request)
    setOpen(true)
  }

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        sex: form.sex || undefined,
        photos,
        ...(gps ? { latitude: gps.lat, longitude: gps.lng } : {}),
      }
      const res = revising
        ? await fetch(`/api/listing-requests/${revising.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resubmit", ...payload }),
          })
        : await fetch("/api/listing-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t("listing.submitFailed"))
        return
      }
      setOpen(false)
      resetForm()
      await fetchRequests()
    } catch {
      setError(t("listing.submitFailed"))
    } finally {
      setSaving(false)
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

  /** Ask Vettrack to take a published animal down. Only staff can actually hide it. */
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

  /** A published listing staff have taken off the public pages. */
  const isHidden = (request: ListingRequest) => request.status === "approved" && request.listing?.hidden === true

  /** One status for the seller to read: "Hidden" replaces "Published" while staff have it down. */
  const statusBadge = (request: ListingRequest) =>
    isHidden(request) ? (
      <Badge className="bg-gray-200 text-gray-700" variant="secondary">
        <EyeOff className="h-3 w-3 mr-1" />
        {t("listing.hiddenBadge")}
      </Badge>
    ) : (
      <Badge className={statusVariant(request.status)} variant="secondary">
        {t(`listing.status.${request.status}`)}
      </Badge>
    )

  const sectors = form.district ? rwandaData[form.district] ?? [] : []

  const openDetails = (request: ListingRequest) => {
    setDetailTarget(request)
    setDetailIndex(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("listing.myListings")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("listing.myListingsDesc")}</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          {t("listing.requestListing")}
        </Button>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-900">{t("listing.howItWorks")}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500 text-sm">
            {t("listing.noRequests")}
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
                    {request.status === "approved" && request.removal?.status === "pending" && (
                      <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                        {t("listing.removalRequested")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {[request.animalType, request.breed, request.age].filter(Boolean).join(" · ")}
                  </p>
                  {isHidden(request) && (
                    <p className="text-xs text-gray-500">
                      {t("listing.hiddenNote")}
                      {request.listing?.reason ? ` ${request.listing.reason}` : ""}
                    </p>
                  )}
                  {request.status === "approved" && !isHidden(request) && request.removal?.status === "declined" && (
                    <p className="text-xs text-red-700">
                      {t("listing.removalDeclined")}
                      {request.removal.reviewNote ? `: ${request.removal.reviewNote}` : ""}
                    </p>
                  )}
                  <p className="text-sm font-medium text-gray-900">
                    RWF {request.proposedPrice.toLocaleString()}
                  </p>
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

                <div className="flex sm:flex-col gap-2">
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
                  {request.status === "approved" &&
                    request.listing &&
                    !request.listing.hidden &&
                    request.removal?.status !== "pending" && (
                      <Button variant="outline" size="sm" onClick={() => setRemoveTarget(request)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("listing.requestRemoval")}
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
            <DialogTitle>{revising ? t("listing.reviseTitle") : t("listing.requestListing")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Kept in view while editing, so the farmer can fix what was asked without going back. */}
            {revising?.reviewNote && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <p className="font-medium">{t("listing.whatToChange")}</p>
                <p className="mt-0.5">{revising.reviewNote}</p>
              </div>
            )}

            <div>
              <Label htmlFor="title">{t("listing.title")}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("listing.titlePlaceholder")}
              />
            </div>

            {animals.length > 0 && (
              <div>
                <Label>{t("listing.whichAnimal")}</Label>
                <Select
                  value={form.animalId || undefined}
                  onValueChange={(value) => {
                    const animal = animals.find((a) => a._id === value)
                    setForm({
                      ...form,
                      animalId: value,
                      animalType: animal?.type || form.animalType,
                      title: form.title || (animal?.name ?? ""),
                    })
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={t("listing.whichAnimalPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {animals.map((animal) => (
                      <SelectItem key={animal._id} value={animal._id}>
                        {animal.name} {animal.type ? `(${animal.type})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("listing.animalType")}</Label>
                <Select value={form.animalType || undefined} onValueChange={(v) => setForm({ ...form, animalType: v })}>
                  <SelectTrigger><SelectValue placeholder={t("listing.animalTypePlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {ANIMAL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="breed">{t("listing.breed")}</Label>
                <Input id="breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="age">{t("listing.age")}</Label>
                <Input
                  id="age"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder={t("listing.agePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("listing.sex")}</Label>
                <Select value={form.sex || undefined} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {ANIMAL_SEXES.map((sex) => (
                      <SelectItem key={sex} value={sex}>{sex}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">{t("listing.askingPrice")}</Label>
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

            <div>
              <Label htmlFor="description">{t("listing.description")}</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("listing.descriptionPlaceholder")}
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
              <p className="text-xs text-gray-500 mt-1.5">{t("listing.photosHint")}</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {revising ? t("listing.resubmitRequest") : t("listing.submitRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Ask Vettrack to take a published listing down */}
      <Dialog open={!!removeTarget} onOpenChange={(next) => { if (!next) closeRemoval() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("listing.removalTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("listing.removalDesc")} <strong>{removeTarget?.title}</strong>
            </p>
            <div>
              <Label htmlFor="removal-reason">{t("listing.removalReason")}</Label>
              <Textarea
                id="removal-reason"
                rows={3}
                maxLength={300}
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder={t("listing.removalReasonPlaceholder")}
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

      {/* Listing details */}
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
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {detailTarget.animalType && (
                  <div><span className="text-gray-500">{t("listing.animalType")}:</span> {detailTarget.animalType}</div>
                )}
                {detailTarget.breed && (
                  <div><span className="text-gray-500">{t("listing.breed")}:</span> {detailTarget.breed}</div>
                )}
                {detailTarget.age && (
                  <div><span className="text-gray-500">{t("listing.age")}:</span> {detailTarget.age}</div>
                )}
                {detailTarget.sex && (
                  <div><span className="text-gray-500">{t("listing.sex")}:</span> {detailTarget.sex}</div>
                )}
              </div>

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
