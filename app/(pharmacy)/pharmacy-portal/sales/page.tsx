"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Info, Receipt, RefreshCw, Wallet, Search, Phone, Mail, MapPin, MessageSquare, FileCheck, Undo2, HandCoins, Loader2,
} from "lucide-react"
import { PAYMENT_METHOD_LABEL_KEYS } from "@/lib/product-rules"
import { REFUND_REASONS, REFUND_REASON_LABEL_KEYS, type RefundReason } from "@/lib/validations/refund"

interface SaleLine {
  serviceId: string
  name: string
  image: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  commissionPercent: number
  commissionAmount: number
  sellerAmount: number
  refundedQuantity: number
  prescriptionRequired: boolean
  payoutStatus: "pending" | "paid" | "cancelled" | null
}

interface RefundSummary {
  id: string
  status: "requested" | "completed" | "declined"
  lines: { serviceId: string; name: string; quantity: number; amount: number }[]
  amount: number
  reason: RefundReason
  note: string | null
  requestedAt: string
  decidedAt: string | null
  decisionNote: string | null
}

interface SaleOrder {
  orderId: string
  reference: string
  paidAt: string | null
  paymentMethod: string | null
  buyer: { name: string; phone: string; email?: string; district?: string; sector?: string; village?: string; notes?: string }
  lines: SaleLine[]
  gross: number
  commission: number
  share: number
  refunded: number
  prescriptionId: string | null
  refunds: RefundSummary[]
}

interface Totals {
  orders: number
  units: number
  gross: number
  commission: number
  share: number
  paidOut: number
}

interface SalesData {
  orders: SaleOrder[]
  total: Totals
  thisMonth: Totals
  truncated: boolean
}

const money = (amount: number) => `RWF ${amount.toLocaleString()}`

const PAYOUT_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
}

const REFUND_BADGE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-600",
}

/**
 * What the pharmacy's drugs sold for, and everything it needs to hand each order over:
 * the buyer's contact and location from checkout, what they bought, how they paid,
 * and the prescription when the drug needs one.
 *
 * Buyers pay Vettrack. Each sale shows Vettrack's commission and the pharmacy's share,
 * and whether that share has been paid out yet.
 */
export default function PharmacySalesPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [search, setSearch] = useState("")

  const [refundTarget, setRefundTarget] = useState<SaleOrder | null>(null)
  const [refundQty, setRefundQty] = useState<Record<string, string>>({})
  const [refundReason, setRefundReason] = useState<RefundReason | "">("")
  const [refundNote, setRefundNote] = useState("")
  const [refundError, setRefundError] = useState<string | null>(null)
  const [sendingRefund, setSendingRefund] = useState(false)

  const load = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch("/api/pharmacy/sales")
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!data) return []
    if (!q) return data.orders
    return data.orders.filter((order) =>
      [order.reference, order.buyer.name, order.buyer.phone, ...order.lines.map((line) => line.name)]
        .some((value) => value?.toLowerCase().includes(q))
    )
  }, [data, search])

  /** Units of a line that are neither refunded nor waiting in an open request. */
  const refundable = (order: SaleOrder, line: SaleLine) => {
    const pending = order.refunds
      .filter((refund) => refund.status === "requested")
      .flatMap((refund) => refund.lines)
      .filter((l) => l.serviceId === line.serviceId)
      .reduce((sum, l) => sum + l.quantity, 0)
    return Math.max(0, line.quantity - line.refundedQuantity - pending)
  }

  const openRefund = (order: SaleOrder) => {
    setRefundTarget(order)
    setRefundQty(Object.fromEntries(order.lines.map((line) => [line.serviceId, ""])))
    setRefundReason("")
    setRefundNote("")
    setRefundError(null)
  }

  const submitRefund = async () => {
    if (!refundTarget) return
    const lines = Object.entries(refundQty)
      .map(([serviceId, value]) => ({ serviceId, quantity: Number(value) }))
      .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0)
    if (lines.length === 0) {
      setRefundError(t("refund.chooseItems"))
      return
    }
    if (!refundReason) {
      setRefundError(t("refund.chooseReason"))
      return
    }
    setSendingRefund(true)
    setRefundError(null)
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: refundTarget.orderId, lines, reason: refundReason, note: refundNote }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setRefundError(body.error || t("refund.requestFailed"))
        return
      }
      setRefundTarget(null)
      await load()
    } catch {
      setRefundError(t("refund.requestFailed"))
    } finally {
      setSendingRefund(false)
    }
  }

  const owed = data ? data.total.share - data.total.paidOut : 0

  const cards = [
    {
      label: t("pharmacy.collectedThisMonth"),
      value: data ? money(data.thisMonth.gross) : "",
      sub: data ? `${data.thisMonth.units.toLocaleString()} ${t("pharmacy.unitsSold")}` : "",
      icon: <Wallet className="h-5 w-5 text-blue-600" />,
      tint: "bg-blue-50",
    },
    {
      label: t("pharmacy.collectedTotal"),
      value: data ? money(data.total.gross) : "",
      sub: data ? `${data.total.orders.toLocaleString()} ${t("pharmacy.ordersCount")}` : "",
      icon: <Receipt className="h-5 w-5 text-gray-600" />,
      tint: "bg-gray-50",
    },
    {
      label: t("pharmacy.yourShareTotal"),
      value: data ? money(data.total.share) : "",
      sub: data ? `${t("pharmacy.afterCommission")} ${money(data.total.commission)}` : "",
      icon: <HandCoins className="h-5 w-5 text-green-600" />,
      tint: "bg-green-50",
    },
    {
      label: owed < 0 ? t("pharmacy.owedBack") : t("pharmacy.stillToBePaid"),
      value: data ? money(Math.abs(owed)) : "",
      sub: data ? `${t("pharmacy.paidOutSoFar")} ${money(data.total.paidOut)}` : "",
      icon: <Wallet className={`h-5 w-5 ${owed < 0 ? "text-red-600" : "text-amber-600"}`} />,
      tint: owed < 0 ? "bg-red-50" : "bg-amber-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("pharmacy.sales")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("pharmacy.salesDesc")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("notifications.refresh")}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">{t("pharmacy.salesExplainer")}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.tint}`}>{card.icon}</div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">{card.label}</p>
                {loading && !data ? (
                  <Skeleton className="h-7 w-28 mt-1" />
                ) : (
                  <>
                    <p className="text-xl font-semibold text-gray-900 truncate">{card.value || "—"}</p>
                    {card.sub && <p className="text-xs text-gray-500">{card.sub}</p>}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pharmacy.salesSearch")}
          className="pl-9"
        />
      </div>

      {loading && !data ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : failed && !data ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-red-600">{t("pharmacy.salesFailed")}</CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">
            {search ? t("pharmacy.noSalesMatch") : t("pharmacy.noSales")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => {
            const canRefund = order.lines.some((line) => refundable(order, line) > 0)
            const location = [order.buyer.village, order.buyer.sector, order.buyer.district].filter(Boolean).join(", ")
            return (
              <Card key={order.orderId}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{order.reference}</span>
                      {order.paidAt && (
                        <span className="text-xs text-gray-500">{new Date(order.paidAt).toLocaleString()}</span>
                      )}
                    </div>
                    {order.paymentMethod && (
                      <Badge variant="secondary">
                        {t(PAYMENT_METHOD_LABEL_KEYS[order.paymentMethod] ?? order.paymentMethod)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* The buyer, as they filled it in at checkout */}
                    <div className="space-y-1.5 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("pharmacy.buyer")}</p>
                      <p className="font-medium text-gray-900">{order.buyer.name}</p>
                      <a href={`tel:${order.buyer.phone}`} className="flex items-center gap-1.5 text-gray-700 hover:text-primary">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {order.buyer.phone}
                      </a>
                      {order.buyer.email && (
                        <a href={`mailto:${order.buyer.email}`} className="flex items-center gap-1.5 text-gray-700 hover:text-primary break-all">
                          <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {order.buyer.email}
                        </a>
                      )}
                      {location && (
                        <p className="flex items-center gap-1.5 text-gray-700">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {location}
                        </p>
                      )}
                      {order.buyer.notes && (
                        <p className="flex items-start gap-1.5 text-gray-700">
                          <MessageSquare className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="whitespace-pre-line">{order.buyer.notes}</span>
                        </p>
                      )}
                      {order.prescriptionId && (
                        <a
                          href={`/api/prescriptions/${order.prescriptionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-purple-700 hover:underline pt-1"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          {t("pharmacy.viewPrescription")}
                        </a>
                      )}
                    </div>

                    {/* What they bought from this pharmacy */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("pharmacy.itemsBought")}</p>
                      {order.lines.map((line) => (
                        <div key={line.serviceId} className="flex items-start gap-2">
                          <div className="relative h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                            {line.image && <Image src={line.image} alt="" fill className="object-cover" sizes="40px" />}
                          </div>
                          <div className="flex-1 min-w-0 text-sm">
                            <p className="text-gray-900">
                              {line.quantity} × {line.name}
                              {line.prescriptionRequired && (
                                <FileCheck className="inline h-3.5 w-3.5 ml-1 text-purple-600" aria-label={t("pharmacy.prescriptionOnly")} />
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {money(line.unitPrice)} · {money(line.lineTotal)}
                              {line.refundedQuantity > 0 && (
                                <span className="text-red-700"> · {line.refundedQuantity} {t("pharmacy.refundedUnits")}</span>
                              )}
                            </p>
                          </div>
                          {line.payoutStatus && (
                            <Badge className={PAYOUT_BADGE[line.payoutStatus]} variant="secondary">
                              {t(`pharmacy.payout.${line.payoutStatus}`)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">{t("pharmacy.saleCollected")}</p>
                      <p className="font-medium text-gray-900">{money(order.gross)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {t("pharmacy.commission")} ({order.lines[0]?.commissionPercent ?? 0}%)
                      </p>
                      <p className="font-medium text-gray-900">{money(order.commission)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t("pharmacy.yourShare")}</p>
                      <p className="font-semibold text-green-700">{money(order.share)}</p>
                    </div>
                    {order.refunded > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">{t("pharmacy.refunded")}</p>
                        <p className="font-medium text-red-700">{money(order.refunded)}</p>
                      </div>
                    )}
                  </div>

                  {order.refunds.length > 0 && (
                    <div className="space-y-2">
                      {order.refunds.map((refund) => (
                        <div key={refund.id} className="rounded-md border border-gray-200 p-2.5 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={REFUND_BADGE[refund.status]} variant="secondary">
                              {t(`refund.status.${refund.status}`)}
                            </Badge>
                            <span className="text-gray-900">
                              {money(refund.amount)} · {refund.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {t(REFUND_REASON_LABEL_KEYS[refund.reason])}
                            {refund.note ? ` · ${refund.note}` : ""}
                          </p>
                          {refund.decisionNote && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              <span className="font-medium">{t("listing.noteFromVettrack")}:</span> {refund.decisionNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canRefund && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openRefund(order)}>
                        <Undo2 className="h-4 w-4 mr-2" />
                        {t("refund.request")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {data?.truncated && <p className="text-xs text-gray-500">{t("pharmacy.salesTruncated")}</p>}
        </div>
      )}

      {/* Ask Vettrack to refund the buyer for some of this pharmacy's items */}
      <Dialog open={!!refundTarget} onOpenChange={(next) => { if (!next) setRefundTarget(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("refund.request")} · {refundTarget?.reference}</DialogTitle>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t("refund.requestDesc")}</p>
              <div className="space-y-2">
                {refundTarget.lines.map((line) => {
                  const max = refundable(refundTarget, line)
                  return (
                    <div key={line.serviceId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-sm">
                        <p className="text-gray-900 truncate">{line.name}</p>
                        <p className="text-xs text-gray-500">
                          {t("refund.upTo")} {max} · {money(line.unitPrice)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={max}
                        disabled={max === 0}
                        value={refundQty[line.serviceId] ?? ""}
                        onChange={(e) => setRefundQty({ ...refundQty, [line.serviceId]: e.target.value })}
                        className="w-24"
                        placeholder="0"
                      />
                    </div>
                  )
                })}
              </div>
              <div>
                <Label>{t("refund.reason")}</Label>
                <Select value={refundReason || undefined} onValueChange={(v) => setRefundReason(v as RefundReason)}>
                  <SelectTrigger><SelectValue placeholder={t("refund.chooseReason")} /></SelectTrigger>
                  <SelectContent>
                    {REFUND_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{t(REFUND_REASON_LABEL_KEYS[reason])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="refund-note">{t("refund.note")}</Label>
                <Textarea
                  id="refund-note"
                  rows={3}
                  maxLength={500}
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                />
              </div>
              {refundError && <p className="text-sm text-red-600">{refundError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>{t("common.cancel")}</Button>
            <Button onClick={submitRefund} disabled={sendingRefund}>
              {sendingRefund && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("refund.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
