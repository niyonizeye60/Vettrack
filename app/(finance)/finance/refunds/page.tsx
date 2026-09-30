"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, RefreshCw, Search, Phone, AlertTriangle } from "lucide-react"
import { PAYMENT_METHOD_LABEL_KEYS } from "@/lib/product-rules"
import {
  REFUND_METHODS,
  REFUND_METHOD_LABEL_KEYS,
  REFUND_REASONS,
  REFUND_REASON_LABEL_KEYS,
  type RefundMethod,
  type RefundReason,
} from "@/lib/validations/refund"

interface Refund {
  id: string
  orderId: string
  reference: string
  status: "requested" | "completed" | "declined"
  lines: { serviceId: string; name: string; quantity: number; unitPrice: number; amount: number; sellerId: string | null }[]
  amount: number
  reason: RefundReason
  note: string | null
  buyer: { name: string; phone: string; email: string | null }
  paymentMethod: string | null
  requestedBy: { name: string; role: string }
  requestedAt: string
  decidedBy: { name: string } | null
  decidedAt: string | null
  decisionNote: string | null
  method: RefundMethod | null
  refundReference: string | null
  restocked: boolean
  clawbackAmount?: number
}

interface LookedUpOrder {
  orderId: string
  reference: string
  paidAt: string | null
  paymentMethod: string | null
  buyer: { name: string; phone: string }
  total: number
  refundedAmount: number
  items: { serviceId: string; name: string; quantity: number; unitPrice: number; seller: string | null; refundable: number }[]
}

const money = (amount: number) => `RWF ${amount.toLocaleString()}`

const STATUS_BADGE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-600",
}

/**
 * Refunds: requests from pharmacies (and ones finance opens itself) waiting for the
 * buyer to be paid back, and the record of every decision.
 *
 * The money goes back through Vettrack's own channels - mobile money, bank - and
 * finance records how and the transaction reference here. Completing a refund takes it
 * off the income figures and the seller's payout.
 */
export default function FinanceRefundsPage() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<"waiting" | "history">("waiting")
  const [refunds, setRefunds] = useState<Refund[] | null>(null)
  const [loading, setLoading] = useState(true)

  const [completeTarget, setCompleteTarget] = useState<Refund | null>(null)
  const [method, setMethod] = useState<RefundMethod | "">("")
  const [reference, setReference] = useState("")
  const [restock, setRestock] = useState(false)
  const [decisionNote, setDecisionNote] = useState("")
  const [declineTarget, setDeclineTarget] = useState<Refund | null>(null)
  const [deciding, setDeciding] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const [newOpen, setNewOpen] = useState(false)
  const [lookupRef, setLookupRef] = useState("")
  const [lookingUp, setLookingUp] = useState(false)
  const [found, setFound] = useState<LookedUpOrder | null>(null)
  const [newQty, setNewQty] = useState<Record<string, string>>({})
  const [newReason, setNewReason] = useState<RefundReason | "">("")
  const [newNote, setNewNote] = useState("")
  const [newError, setNewError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/refunds")
      if (res.ok) setRefunds(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const shown = (refunds ?? []).filter((refund) =>
    tab === "waiting" ? refund.status === "requested" : refund.status !== "requested"
  )
  const waitingCount = (refunds ?? []).filter((refund) => refund.status === "requested").length

  const openComplete = (refund: Refund) => {
    setCompleteTarget(refund)
    setMethod(refund.paymentMethod === "intouchpay" ? "mobile_money" : "")
    setReference("")
    setRestock(false)
    setDecisionNote("")
    setDecisionError(null)
  }

  const openDecline = (refund: Refund) => {
    setDeclineTarget(refund)
    setDecisionNote("")
    setDecisionError(null)
  }

  const decide = async (target: Refund, body: Record<string, unknown>) => {
    setDeciding(true)
    setDecisionError(null)
    try {
      const res = await fetch(`/api/refunds/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDecisionError(data.error || t("refund.decisionFailed"))
        return false
      }
      await load()
      return true
    } catch {
      setDecisionError(t("refund.decisionFailed"))
      return false
    } finally {
      setDeciding(false)
    }
  }

  const submitComplete = async () => {
    if (!completeTarget) return
    if (!method) {
      setDecisionError(t("refund.chooseMethod"))
      return
    }
    if (await decide(completeTarget, { action: "complete", method, reference, restock, note: decisionNote })) {
      setCompleteTarget(null)
    }
  }

  const submitDecline = async () => {
    if (!declineTarget) return
    if (await decide(declineTarget, { action: "decline", note: decisionNote })) {
      setDeclineTarget(null)
    }
  }

  const openNew = () => {
    setNewOpen(true)
    setLookupRef("")
    setFound(null)
    setNewQty({})
    setNewReason("")
    setNewNote("")
    setNewError(null)
  }

  const lookup = async () => {
    if (!lookupRef.trim()) return
    setLookingUp(true)
    setNewError(null)
    setFound(null)
    try {
      const res = await fetch(`/api/refunds/lookup?ref=${encodeURIComponent(lookupRef.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setNewError(data.error || t("refund.orderNotFound"))
        return
      }
      setFound(data)
      setNewQty(Object.fromEntries(data.items.map((item: LookedUpOrder["items"][number]) => [item.serviceId, ""])))
    } catch {
      setNewError(t("refund.orderNotFound"))
    } finally {
      setLookingUp(false)
    }
  }

  const createRefund = async () => {
    if (!found) return
    const lines = Object.entries(newQty)
      .map(([serviceId, value]) => ({ serviceId, quantity: Number(value) }))
      .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0)
    if (lines.length === 0) {
      setNewError(t("refund.chooseItems"))
      return
    }
    if (!newReason) {
      setNewError(t("refund.chooseReason"))
      return
    }
    setCreating(true)
    setNewError(null)
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: found.orderId, lines, reason: newReason, note: newNote }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNewError(data.error || t("refund.requestFailed"))
        return
      }
      setNewOpen(false)
      setTab("waiting")
      await load()
      // Straight on to recording it, which is almost always the next step.
      openComplete(data)
    } catch {
      setNewError(t("refund.requestFailed"))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("refund.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("refund.financeDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t("notifications.refresh")}
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t("refund.new")}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "waiting" | "history")}>
        <TabsList>
          <TabsTrigger value="waiting">
            {t("refund.waiting")}
            {waitingCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[11px] text-white">{waitingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">{t("refund.history")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && !refunds ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-gray-500">
            {tab === "waiting" ? t("refund.noneWaiting") : t("refund.noHistory")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shown.map((refund) => (
            <Card key={refund.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">{refund.reference}</span>
                    <Badge className={STATUS_BADGE[refund.status]} variant="secondary">
                      {t(`refund.status.${refund.status}`)}
                    </Badge>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{money(refund.amount)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    {refund.lines.map((line) => (
                      <p key={line.serviceId} className="text-gray-900">
                        {line.quantity} × {line.name} <span className="text-gray-500">· {money(line.amount)}</span>
                      </p>
                    ))}
                    <p className="text-xs text-gray-500">
                      {t(REFUND_REASON_LABEL_KEYS[refund.reason])}
                      {refund.note ? ` · ${refund.note}` : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t("refund.requestedBy")} {refund.requestedBy.name} · {new Date(refund.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("refund.payBackTo")}</p>
                    <p className="text-gray-900">{refund.buyer.name}</p>
                    <a href={`tel:${refund.buyer.phone}`} className="flex items-center gap-1.5 text-gray-700 hover:text-primary">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {refund.buyer.phone}
                    </a>
                    {refund.paymentMethod && (
                      <p className="text-xs text-gray-500">
                        {t("refund.paidWith")} {t(PAYMENT_METHOD_LABEL_KEYS[refund.paymentMethod] ?? refund.paymentMethod)}
                      </p>
                    )}
                  </div>
                </div>

                {refund.status !== "requested" && (
                  <div className="rounded-md bg-gray-50 p-2.5 text-xs text-gray-600 space-y-0.5">
                    {refund.status === "completed" && refund.method && (
                      <p>
                        {t(REFUND_METHOD_LABEL_KEYS[refund.method])} · {t("refund.reference")} {refund.refundReference}
                        {refund.restocked ? ` · ${t("refund.restocked")}` : ""}
                      </p>
                    )}
                    {refund.decisionNote && <p>{refund.decisionNote}</p>}
                    <p className="text-gray-400">
                      {refund.decidedBy?.name} · {refund.decidedAt ? new Date(refund.decidedAt).toLocaleString() : ""}
                    </p>
                    {!!refund.clawbackAmount && (
                      <p className="flex items-center gap-1 text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t("refund.clawback")} {money(refund.clawbackAmount)}
                      </p>
                    )}
                  </div>
                )}

                {refund.status === "requested" && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDecline(refund)}>
                      {t("refund.decline")}
                    </Button>
                    <Button size="sm" onClick={() => openComplete(refund)}>
                      {t("refund.markPaid")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Record that the buyer was paid back */}
      <Dialog open={!!completeTarget} onOpenChange={(next) => { if (!next) setCompleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("refund.markPaid")} · {completeTarget?.reference}</DialogTitle>
          </DialogHeader>
          {completeTarget && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t("refund.markPaidDesc")} <strong>{money(completeTarget.amount)}</strong> → {completeTarget.buyer.name} ({completeTarget.buyer.phone})
              </p>
              <div>
                <Label>{t("refund.method")}</Label>
                <Select value={method || undefined} onValueChange={(v) => setMethod(v as RefundMethod)}>
                  <SelectTrigger><SelectValue placeholder={t("refund.chooseMethod")} /></SelectTrigger>
                  <SelectContent>
                    {REFUND_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{t(REFUND_METHOD_LABEL_KEYS[m])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="refund-reference">{t("refund.reference")}</Label>
                <Input id="refund-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">{t("refund.referenceHint")}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={restock} onCheckedChange={(checked) => setRestock(checked === true)} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{t("refund.restock")}</span>
                  <span className="block text-xs text-gray-500">{t("refund.restockHint")}</span>
                </span>
              </label>
              <div>
                <Label htmlFor="refund-decision-note">{t("refund.note")}</Label>
                <Textarea id="refund-decision-note" rows={2} maxLength={500} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
              </div>
              {decisionError && <p className="text-sm text-red-600">{decisionError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteTarget(null)}>{t("common.cancel")}</Button>
            <Button onClick={submitComplete} disabled={deciding}>
              {deciding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("refund.markPaid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline */}
      <Dialog open={!!declineTarget} onOpenChange={(next) => { if (!next) setDeclineTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("refund.decline")} · {declineTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="decline-note">{t("refund.declineReason")}</Label>
              <Textarea id="decline-note" rows={3} maxLength={500} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
            </div>
            {decisionError && <p className="text-sm text-red-600">{decisionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={submitDecline} disabled={deciding}>
              {deciding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("refund.decline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open a refund from an order reference */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("refund.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lookup-ref">{t("refund.orderReference")}</Label>
              <div className="flex gap-2">
                <Input
                  id="lookup-ref"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") lookup() }}
                  placeholder="ORD-1A2B3C4D"
                />
                <Button variant="outline" onClick={lookup} disabled={lookingUp}>
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {found && (
              <>
                <div className="rounded-md bg-gray-50 p-3 text-sm">
                  <p className="font-medium text-gray-900">{found.reference} · {money(found.total)}</p>
                  <p className="text-gray-600">{found.buyer.name} · {found.buyer.phone}</p>
                  {found.refundedAmount > 0 && (
                    <p className="text-xs text-red-700">{t("refund.alreadyRefunded")} {money(found.refundedAmount)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {found.items.map((item) => (
                    <div key={item.serviceId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-sm">
                        <p className="text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.seller ?? "Vettrack"} · {t("refund.upTo")} {item.refundable} · {money(item.unitPrice)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={item.refundable}
                        disabled={item.refundable === 0}
                        value={newQty[item.serviceId] ?? ""}
                        onChange={(e) => setNewQty({ ...newQty, [item.serviceId]: e.target.value })}
                        className="w-24"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Label>{t("refund.reason")}</Label>
                  <Select value={newReason || undefined} onValueChange={(v) => setNewReason(v as RefundReason)}>
                    <SelectTrigger><SelectValue placeholder={t("refund.chooseReason")} /></SelectTrigger>
                    <SelectContent>
                      {REFUND_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>{t(REFUND_REASON_LABEL_KEYS[reason])}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-refund-note">{t("refund.note")}</Label>
                  <Textarea id="new-refund-note" rows={2} maxLength={500} value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                </div>
              </>
            )}
            {newError && <p className="text-sm text-red-600">{newError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createRefund} disabled={!found || creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("refund.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
