"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Check, X, MapPin, Phone, ExternalLink, Expand } from "lucide-react"
import PhotoLightbox from "@/components/marketplace/photo-lightbox"

interface ListingRequest {
  id: string
  farmerName: string
  title: string
  animalType: string
  breed: string | null
  age: string | null
  sex: string | null
  proposedPrice: number
  description: string
  district: string
  sector: string | null
  photos: string[]
  status: "pending" | "approved" | "rejected" | "withdrawn"
  reviewNote: string | null
  publishedServiceId: string | null
  createdAt: string
}

interface Category { id: string; name: string }

const TABS = ["pending", "approved", "rejected"] as const
type Tab = (typeof TABS)[number]

export default function MarketplaceRequestsPage() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>("pending")
  const [requests, setRequests] = useState<ListingRequest[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [approveTarget, setApproveTarget] = useState<ListingRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ListingRequest | null>(null)
  const [lightbox, setLightbox] = useState<{ request: ListingRequest; index: number } | null>(null)
  const [categoryId, setCategoryId] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRequests(tab)
  }, [tab])

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.sales && setCategories(data.sales))
      .catch(() => {})
  }, [])

  const fetchRequests = async (status: Tab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing-requests?status=${status}`)
      if (res.ok) setRequests(await res.json())
    } catch {
      // Keep whatever is on screen rather than blanking the queue.
    } finally {
      setLoading(false)
    }
  }

  const decide = async (body: Record<string, unknown>, id: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/listing-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t("marketplace.decisionFailed"))
        return false
      }
      await fetchRequests(tab)
      return true
    } catch {
      setError(t("marketplace.decisionFailed"))
      return false
    } finally {
      setBusy(false)
    }
  }

  const confirmApprove = async () => {
    if (!approveTarget) return
    const ok = await decide({ decision: "approve", categoryId, note }, approveTarget.id)
    if (ok) {
      setApproveTarget(null)
      setCategoryId("")
      setNote("")
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    const ok = await decide({ decision: "reject", note }, rejectTarget.id)
    if (ok) {
      setRejectTarget(null)
      setNote("")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t("marketplace.requests")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("marketplace.requestsDesc")}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {TABS.map((value) => (
            <TabsTrigger key={value} value={value}>{t(`listing.status.${value}`)}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex flex-col lg:flex-row gap-4">
                <div className="flex gap-2 flex-shrink-0">
                  <Skeleton className="h-28 w-28 rounded-md" />
                  <Skeleton className="h-28 w-28 rounded-md" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex flex-col gap-2 lg:w-48 flex-shrink-0">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500 text-sm">
            {t("marketplace.queueEmpty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4 flex flex-col lg:flex-row gap-4">
                <div className="flex gap-2 flex-shrink-0">
                  {request.photos.slice(0, 2).map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox({ request, index: i })}
                      className="group relative h-28 w-28 rounded-md overflow-hidden bg-gray-100"
                    >
                      <Image src={url} alt={request.title} fill className="object-cover" sizes="112px" />
                      <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Expand className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{request.title}</h3>
                    <Badge variant="secondary">{request.animalType}</Badge>
                    {request.photos.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setLightbox({ request, index: 2 })}
                        className="text-xs text-gray-500 underline hover:text-gray-700"
                      >
                        +{request.photos.length - 2} {t("marketplace.morePhotos")}
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    {[request.breed, request.age, request.sex].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">{request.description}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {request.farmerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[request.district, request.sector].filter(Boolean).join(", ")}
                    </span>
                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>

                  {request.reviewNote && (
                    <p className="text-sm text-gray-500 pt-1">
                      <span className="font-medium">{t("marketplace.note")}:</span> {request.reviewNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 lg:w-48 flex-shrink-0">
                  <p className="text-lg font-semibold text-gray-900">
                    RWF {request.proposedPrice.toLocaleString()}
                  </p>

                  {request.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => { setApproveTarget(request); setNote(""); setError(null) }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t("marketplace.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRejectTarget(request); setNote(""); setError(null) }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t("marketplace.reject")}
                      </Button>
                    </>
                  ) : request.publishedServiceId ? (
                    <Link
                      href={`/animal-sales/${request.publishedServiceId}`}
                      target="_blank"
                      className="inline-flex items-center text-sm text-green-700 hover:text-green-800"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t("marketplace.viewListing")}
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve */}
      <Dialog open={!!approveTarget} onOpenChange={(next) => !next && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.approveTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("marketplace.approveDesc")} <strong>{approveTarget?.title}</strong>
            </p>
            <div>
              <Label>{t("marketplace.category")}</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder={t("marketplace.selectCategory")} /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>{t("common.cancel")}</Button>
            <Button onClick={confirmApprove} disabled={busy || !categoryId}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("marketplace.publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejectTarget} onOpenChange={(next) => !next && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.rejectTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-note">{t("marketplace.rejectReason")}</Label>
              <Textarea
                id="reject-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("marketplace.rejectReasonPlaceholder")}
              />
              <p className="text-xs text-gray-500 mt-1">{t("marketplace.rejectReasonHint")}</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={busy || note.trim().length < 3}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("marketplace.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PhotoLightbox
        photos={lightbox?.request.photos ?? []}
        alt={lightbox?.request.title ?? ""}
        open={!!lightbox}
        onOpenChange={(next) => !next && setLightbox(null)}
        initialIndex={lightbox?.index ?? 0}
      />
    </div>
  )
}
