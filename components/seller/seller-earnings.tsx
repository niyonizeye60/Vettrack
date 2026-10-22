"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2, DollarSign, CheckCircle, Clock, AlertTriangle, RefreshCw, FileText, XCircle
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface PayoutItem {
  _id: string
  orderId: string
  sellerName: string
  sellerPhone: string
  itemName: string
  itemTotal: number
  commissionPercentage: number
  commissionAmount: number
  sellerAmount: number
  status: "pending" | "paid" | "cancelled"
  paidAt?: string
  createdAt: string
}

interface PayoutStats {
  pending: number
  paid: number
  cancelled: number
  pendingAmount: number
  paidAmount: number
}

/**
 * A seller's payouts: one per sale, sent to their mobile money number by
 * superadmin from Commissions. There is no withdrawal step (see
 * app/api/withdrawals POST). The Earnings page of the pharmacy and feed
 * supplier portals - the cart sellers who are owed payouts.
 */
export default function SellerEarnings() {
  const { t } = useLanguage()
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/payouts")
      const data = await res.json()
      if (res.ok) {
        setPayouts(data.payouts || [])
        setStats(data.stats)
      } else {
        setError(data.error || t("earnings.failedToFetchEarnings"))
      }
    } catch {
      setError(t("earnings.failedToFetchEarnings"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-RW", {
        year: "numeric", month: "short", day: "numeric",
      })
    } catch { return dateStr }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> {t("earnings.paid")}</Badge>
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> {t("earnings.pending")}</Badge>
      case "cancelled": return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> {t("earnings.cancelled")}</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-3">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t("earnings.retry")}
        </Button>
      </div>
    )
  }

  const paidAmount = stats?.paidAmount || 0
  const pendingAmount = stats?.pendingAmount || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("earnings.myEarnings")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("earnings.trackYourSalesEarningsSentToYourPhone")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("notifications.refresh")}
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-green-50 via-white to-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t("earnings.totalEarned")}</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              RWF {(paidAmount + pendingAmount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t("earnings.paidOut")}</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              RWF {paidAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium">{t("earnings.pending")}</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">
              RWF {pendingAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            {t("earnings.payoutHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t("earnings.noEarningsYetStartSellingTo")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((payout) => (
                <div key={payout._id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{payout.itemName}</p>
                      <p className="text-xs text-gray-500">{formatDate(payout.createdAt)}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className="text-sm font-semibold text-green-600">
                        RWF {payout.sellerAmount.toLocaleString()}
                      </p>
                      {getStatusBadge(payout.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
