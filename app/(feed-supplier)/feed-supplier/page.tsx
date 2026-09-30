"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, CheckCircle2, XCircle, Wheat, Plus, PackageX, Wallet, AlertTriangle, CalendarClock } from "lucide-react"
import { expiryState, isLowStock } from "@/lib/product-rules"
import { useProductRules } from "@/hooks/use-product-rules"

interface RequestSummary {
  status: "pending" | "approved" | "rejected" | "withdrawn"
  removed: boolean
  expiryDate: string | null
  listing: { hidden: boolean; stock: number | null; held: number; lowStockAt: number | null } | null
}

interface Totals {
  orders: number
  units: number
  gross: number
  commission: number
  share: number
  paidOut: number
}

interface SalesSummary {
  total: Totals
  thisMonth: Totals
}

/**
 * Where a feed supplier lands after login: how its feed requests stand, which live feed
 * needs attention (stock or expiry), and what it has earned. The work itself happens on
 * the feed and sales pages. The pharmacy dashboard's twin.
 */
export default function FeedSupplierDashboardPage() {
  const { t } = useLanguage()
  const rules = useProductRules()
  const [requests, setRequests] = useState<RequestSummary[] | null>(null)
  const [sales, setSales] = useState<SalesSummary | null>(null)
  const [salesLoaded, setSalesLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/listing-requests")
      .then((res) => (res.ok ? res.json() : []))
      .then(setRequests)
      .catch(() => setRequests([]))
    fetch("/api/seller/sales")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSales)
      .catch(() => setSales(null))
      .finally(() => setSalesLoaded(true))
  }, [])

  const count = (match: (r: RequestSummary) => boolean) => requests?.filter(match).length ?? 0

  /** Published, and neither removed nor hidden by staff. */
  const live = (r: RequestSummary) => r.status === "approved" && !r.removed && !!r.listing && !r.listing.hidden
  const available = (r: RequestSummary) =>
    r.listing?.stock != null ? Math.max(0, r.listing.stock - r.listing.held) : null

  const requestStats = [
    {
      label: t("pharmacy.statPending"),
      value: count((r) => r.status === "pending"),
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      tint: "bg-amber-50",
    },
    {
      label: t("pharmacy.statPublished"),
      value: count((r) => r.status === "approved" && !r.removed),
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      tint: "bg-green-50",
    },
    {
      label: t("pharmacy.statNotApproved"),
      value: count((r) => r.status === "rejected"),
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      tint: "bg-red-50",
    },
  ]

  const attentionStats = [
    {
      // Live feed buyers can't see because every unit is sold or in a checkout.
      label: t("pharmacy.outOfStock"),
      value: count((r) => live(r) && available(r) === 0),
      icon: <PackageX className="h-5 w-5 text-red-600" />,
      tint: "bg-red-50",
    },
    {
      label: t("pharmacy.lowStock"),
      value: count((r) => live(r) && isLowStock(available(r), r.listing?.lowStockAt)),
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      tint: "bg-amber-50",
    },
    {
      // Feed without an expiry date never counts here.
      label: t("pharmacy.expiringOrOffSale"),
      value: count((r) => live(r) && ["soon", "unsellable"].includes(expiryState(r.expiryDate, rules.sellByDays))),
      icon: <CalendarClock className="h-5 w-5 text-orange-600" />,
      tint: "bg-orange-50",
    },
  ]

  const money = (amount: number) => `RWF ${amount.toLocaleString()}`
  const owed = sales ? Math.max(0, sales.total.share - sales.total.paidOut) : 0

  const statGrid = (stats: typeof requestStats) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`rounded-lg p-2 ${stat.tint}`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              {requests === null ? (
                <Skeleton className="h-7 w-10 mt-1" />
              ) : (
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("pharmacy.dashboard")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("feedSupplier.dashboardDesc")}</p>
        </div>
        <Button asChild>
          <Link href="/feed-supplier/listings">
            <Plus className="h-4 w-4 mr-2" />
            {t("feedSupplier.requestListing")}
          </Link>
        </Button>
      </div>

      {statGrid(requestStats)}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-700">{t("pharmacy.needsAttention")}</h2>
          <Link href="/feed-supplier/listings" className="text-sm font-medium text-primary hover:underline">
            {t("feedSupplier.goToListings")}
          </Link>
        </div>
        {statGrid(attentionStats)}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-blue-50">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t("pharmacy.sales")}</p>
                <p className="text-xs text-gray-500">{t("feedSupplier.collectedByVettrackNote")}</p>
              </div>
            </div>
            <Link href="/feed-supplier/sales" className="text-sm font-medium text-primary hover:underline">
              {t("pharmacy.viewSales")}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: t("pharmacy.collectedThisMonth"), value: money(sales?.thisMonth.gross ?? 0), sub: `${(sales?.thisMonth.units ?? 0).toLocaleString()} ${t("pharmacy.unitsSold")}` },
              { label: t("pharmacy.yourShareTotal"), value: money(sales?.total.share ?? 0), sub: `${t("pharmacy.afterCommission")} ${money(sales?.total.commission ?? 0)}` },
              { label: t("pharmacy.stillToBePaid"), value: money(owed), sub: `${t("pharmacy.paidOutSoFar")} ${money(sales?.total.paidOut ?? 0)}` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm text-gray-500">{label}</p>
                {!salesLoaded ? (
                  <>
                    <Skeleton className="h-7 w-32 mt-1" />
                    <Skeleton className="h-4 w-24 mt-1" />
                  </>
                ) : (
                  <>
                    <p className="text-xl font-semibold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex gap-3">
          <Wheat className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-green-900">{t("feedSupplier.howItWorks")}</p>
            <Link href="/feed-supplier/listings" className="text-sm font-medium text-green-800 hover:underline">
              {t("feedSupplier.goToListings")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
