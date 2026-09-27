"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, CheckCircle2, XCircle, Pill, Plus } from "lucide-react"

interface RequestSummary {
  status: "pending" | "approved" | "rejected" | "withdrawn"
  removed: boolean
}

/**
 * Where a pharmacy lands after login: how its drug requests stand, and the way in to
 * add another. The work itself happens on the listings page.
 */
export default function PharmacyDashboardPage() {
  const { t } = useLanguage()
  const [requests, setRequests] = useState<RequestSummary[] | null>(null)

  useEffect(() => {
    fetch("/api/listing-requests")
      .then((res) => (res.ok ? res.json() : []))
      .then(setRequests)
      .catch(() => setRequests([]))
  }, [])

  const count = (match: (r: RequestSummary) => boolean) => requests?.filter(match).length ?? 0

  const stats = [
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("pharmacy.dashboard")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("pharmacy.dashboardDesc")}</p>
        </div>
        <Button asChild>
          <Link href="/pharmacy-portal/listings">
            <Plus className="h-4 w-4 mr-2" />
            {t("pharmacy.requestListing")}
          </Link>
        </Button>
      </div>

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

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex gap-3">
          <Pill className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-green-900">{t("pharmacy.howItWorks")}</p>
            <Link href="/pharmacy-portal/listings" className="text-sm font-medium text-green-800 hover:underline">
              {t("pharmacy.goToListings")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
