import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { CATEGORY_TO_SOURCE, getOrderById, sellerLedgerId, type Order, type OrderCategory } from "@/lib/db-orders"
import { recordIncome } from "@/lib/db-income"
import { applyRefundToPayout } from "@/lib/db-payouts"
import { returnStock } from "@/lib/stock"
import { notifyFarmer, notifyFinance } from "@/lib/marketplace-notifications"
import { sendRefundEmail } from "@/lib/email"
import {
  type RefundDecision,
  type RefundMethod,
  type RefundReason,
  type RefundRequestInput,
  type RefundStatus,
} from "@/lib/validations/refund"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Paying a buyer back for some or all of a paid order.
 *
 * A request (from the pharmacy whose items they are, or from finance) waits in
 * "requested" until finance records that the money went back - Vettrack refunds
 * through its own channels, the app does not move money. Completing it then unwinds
 * the sale for those units: a negative ledger entry in the refund's month, the
 * seller's payout, and (if the units never left the shelf) the stock.
 *
 * Requested units are reserved against the order line, so two requests can never add
 * up to more than was bought.
 */

export interface RefundLine {
  serviceId: string
  name: string
  category: OrderCategory
  quantity: number
  unitPrice: number
  amount: number
  sellerId: string | null
  /** Vettrack's commission on these units, and the seller's share - zero for Vettrack's own stock. */
  commissionShare: number
  sellerShare: number
}

export interface Refund {
  _id: ObjectId
  orderId: string
  reference: string
  status: RefundStatus
  lines: RefundLine[]
  amount: number
  reason: RefundReason
  note: string | null
  buyer: { name: string; phone: string; email: string | null }
  paymentMethod: string | null
  requestedBy: { id: string; name: string; role: string }
  requestedAt: Date
  decidedBy: { id: string; name: string } | null
  decidedAt: Date | null
  decisionNote: string | null
  method: RefundMethod | null
  refundReference: string | null
  restocked: boolean
  /** The seller had already been paid for refunded units and owes their share back. */
  clawbackAmount: number
}

export class RefundError extends Error {}

type Actor = { _id: string; name: string; role: string }

async function getCollection() {
  const client = await clientPromise
  return client.db(DB_NAME).collection<Refund>("refunds")
}

export function orderReference(orderId: string): string {
  return `ORD-${orderId.slice(-8).toUpperCase()}`
}

/** Units of each line already refunded or waiting in an open request. */
async function committedQuantities(order: Order): Promise<Map<string, number>> {
  const collection = await getCollection()
  const open = await collection.find({ orderId: order._id.toString(), status: "requested" }).toArray()
  const committed = new Map<string, number>()
  for (const item of order.items) committed.set(item.serviceId, item.refundedQuantity ?? 0)
  for (const refund of open) {
    for (const line of refund.lines) committed.set(line.serviceId, (committed.get(line.serviceId) ?? 0) + line.quantity)
  }
  return committed
}

/** What each line of an order can still be refunded, for the refund forms. */
export async function refundableQuantities(order: Order): Promise<Record<string, number>> {
  const committed = await committedQuantities(order)
  return Object.fromEntries(
    order.items.map((item) => [item.serviceId, Math.max(0, item.quantity - (committed.get(item.serviceId) ?? 0))])
  )
}

/**
 * Ask for a refund. `sellerId` limits the request to that seller's own lines - a
 * pharmacy can't ask to refund someone else's items.
 */
export async function createRefundRequest(
  input: RefundRequestInput,
  requester: Actor,
  scope: { sellerId?: string } = {}
): Promise<Refund> {
  const order = await getOrderById(input.orderId)
  if (!order) throw new RefundError("Order not found")
  if (scope.sellerId && !order.items.some((item) => item.sellerId === scope.sellerId)) {
    throw new RefundError("Order not found")
  }
  if (order.status !== "paid") throw new RefundError("Only a paid order can be refunded")

  const committed = await committedQuantities(order)
  const lines: RefundLine[] = []
  for (const wanted of input.lines) {
    const item = order.items.find((i) => i.serviceId === wanted.serviceId)
    if (!item) throw new RefundError("That item is not on this order")
    if (scope.sellerId && item.sellerId !== scope.sellerId) {
      throw new RefundError("You can only ask for a refund on your own items")
    }
    if (lines.some((line) => line.serviceId === item.serviceId)) continue
    const left = item.quantity - (committed.get(item.serviceId) ?? 0)
    if (wanted.quantity > left) {
      throw new RefundError(
        left > 0
          ? `Only ${left} of ${item.name} can still be refunded`
          : `${item.name} has already been refunded or has a refund waiting`
      )
    }
    const amount = item.unitPrice * wanted.quantity
    const commissionShare = item.sellerId
      ? Math.round(((item.commissionAmount ?? 0) * wanted.quantity) / item.quantity)
      : 0
    lines.push({
      serviceId: item.serviceId,
      name: item.name,
      category: item.category,
      quantity: wanted.quantity,
      unitPrice: item.unitPrice,
      amount,
      sellerId: item.sellerId ?? null,
      commissionShare,
      sellerShare: item.sellerId ? amount - commissionShare : 0,
    })
  }

  const orderId = order._id.toString()
  const doc: Omit<Refund, "_id"> = {
    orderId,
    reference: orderReference(orderId),
    status: "requested",
    lines,
    amount: lines.reduce((sum, line) => sum + line.amount, 0),
    reason: input.reason,
    note: input.note?.trim() || null,
    buyer: { name: order.buyer.name, phone: order.buyer.phone, email: order.buyer.email ?? null },
    paymentMethod: order.paymentMethod ?? null,
    requestedBy: { id: requester._id, name: requester.name, role: requester.role },
    requestedAt: new Date(),
    decidedBy: null,
    decidedAt: null,
    decisionNote: null,
    method: null,
    refundReference: null,
    restocked: false,
    clawbackAmount: 0,
  }

  const collection = await getCollection()
  const result = await collection.insertOne(doc as Refund)

  await notifyFinance(
    "Refund requested",
    `${requester.name} asked to refund RWF ${doc.amount.toLocaleString()} on order ${doc.reference} ` +
      `(${lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")}).`
  )

  return { ...doc, _id: result.insertedId } as Refund
}

/**
 * Record that the buyer was paid back, and unwind the sale for those units.
 *
 * The `status: "requested"` filter makes this happen once: two finance staff pressing
 * Complete at the same time can't refund the buyer twice.
 */
export async function completeRefund(
  id: string,
  decider: Actor,
  decision: Extract<RefundDecision, { action: "complete" }>
): Promise<Refund> {
  if (!ObjectId.isValid(id)) throw new RefundError("Refund not found")
  const collection = await getCollection()

  const refund = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), status: "requested" },
    {
      $set: {
        status: "completed",
        decidedBy: { id: decider._id, name: decider.name },
        decidedAt: new Date(),
        decisionNote: decision.note?.trim() || null,
        method: decision.method,
        refundReference: decision.reference.trim(),
        restocked: decision.restock,
      },
    },
    { returnDocument: "after" }
  )
  if (!refund) throw new RefundError("This refund has already been decided")

  const client = await clientPromise
  const orders = client.db(DB_NAME).collection("orders")
  const orderObjectId = new ObjectId(refund.orderId)

  // The order: how many units of each line and how much money went back.
  for (const line of refund.lines) {
    await orders.updateOne(
      { _id: orderObjectId },
      { $inc: { "items.$[line].refundedQuantity": line.quantity } },
      { arrayFilters: [{ "line.serviceId": line.serviceId }] }
    )
  }
  await orders.updateOne({ _id: orderObjectId }, { $inc: { refundedAmount: refund.amount } })

  await bookRefund(refund)

  // Payouts, stock, and the seller.
  let clawbackTotal = 0
  const sellerNotes = new Map<string, { lines: RefundLine[]; clawback: number }>()
  for (const line of refund.lines) {
    if (refund.restocked) await returnStock(line.serviceId, line.quantity)
    if (!line.sellerId) continue
    const { clawback } = await applyRefundToPayout(refund.orderId, line.serviceId, line.amount, line.sellerShare, line.commissionShare)
    clawbackTotal += clawback
    const note = sellerNotes.get(line.sellerId) ?? { lines: [], clawback: 0 }
    note.lines.push(line)
    note.clawback += clawback
    sellerNotes.set(line.sellerId, note)
  }

  if (clawbackTotal > 0) {
    await collection.updateOne({ _id: refund._id }, { $set: { clawbackAmount: clawbackTotal } })
    await notifyFinance(
      "Refund after the seller was paid",
      `Refund on order ${refund.reference} covers items the seller had already been paid for. ` +
        `They owe RWF ${clawbackTotal.toLocaleString()} back.`
    )
  }

  for (const [sellerId, note] of sellerNotes) {
    const share = note.lines.reduce((sum, line) => sum + line.sellerShare, 0)
    await notifyFarmer(
      sellerId,
      "Refund paid to the buyer",
      `Order ${refund.reference}: ${note.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")} ` +
        `refunded to the buyer. ` +
        (note.clawback > 0
          ? `You had already been paid RWF ${note.clawback.toLocaleString()} for them - Vettrack will contact you to settle it.`
          : `Your share of RWF ${share.toLocaleString()} is no longer due.`),
      "/pharmacy-portal/sales"
    )
  }

  if (refund.buyer.email) {
    await sendRefundEmail(refund.buyer.email, refund.buyer.name, {
      reference: refund.reference,
      amount: refund.amount,
      lines: refund.lines,
      methodLabel: REFUND_METHOD_EMAIL_LABELS[refund.method ?? "other"],
      refundReference: refund.refundReference,
    })
  }

  return { ...refund, clawbackAmount: clawbackTotal }
}

/**
 * Book a completed refund in the income ledger, in the month it was paid.
 *
 * The sale's own entry is left exactly as it was - a closed month's figures never move.
 * The refund is a separate negative entry per sale entry it touches: Vettrack's own
 * stock gives back the whole amount as revenue; a seller's line gives back its gross,
 * but only Vettrack's commission share of revenue (the rest was never Vettrack's).
 *
 * Keyed `refund:<refund id>:<seller id or "vettrack">`, so the ledger's unique index
 * stops a refund being booked twice.
 */
async function bookRefund(refund: Refund): Promise<void> {
  const entries = new Map<string, { category: OrderCategory; sellerId: string | null; gross: number; revenue: number }>()
  for (const line of refund.lines) {
    const key = `${line.sellerId ?? "vettrack"}|${line.category}`
    const entry = entries.get(key) ?? { category: line.category, sellerId: line.sellerId, gross: 0, revenue: 0 }
    entry.gross += line.amount
    entry.revenue += line.sellerId ? line.commissionShare : line.amount
    entries.set(key, entry)
  }

  const refundId = refund._id.toString()
  for (const entry of entries.values()) {
    await recordIncome({
      sourceType: CATEGORY_TO_SOURCE[entry.category],
      sourceId: `refund:${refundId}:${entry.sellerId ?? "vettrack"}`,
      grossAmount: -entry.gross,
      platformRevenue: -entry.revenue,
      buyerName: refund.buyer.name,
      buyerPhone: refund.buyer.phone,
      sellerId: entry.sellerId,
      reference: `${refund.reference} refund`,
      occurredAt: refund.decidedAt ?? new Date(),
      refundOf: entry.sellerId ? sellerLedgerId(refund.orderId, entry.sellerId) : refund.orderId,
    })
  }
}

/** Plain English for the buyer's email, which has no language context. */
const REFUND_METHOD_EMAIL_LABELS: Record<RefundMethod, string> = {
  mobile_money: "mobile money",
  bank_transfer: "bank transfer",
  cash: "cash",
  other: "the method agreed with you",
}

export async function declineRefund(id: string, decider: Actor, note: string): Promise<Refund> {
  if (!ObjectId.isValid(id)) throw new RefundError("Refund not found")
  const collection = await getCollection()
  const refund = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), status: "requested" },
    {
      $set: {
        status: "declined",
        decidedBy: { id: decider._id, name: decider.name },
        decidedAt: new Date(),
        decisionNote: note.trim(),
      },
    },
    { returnDocument: "after" }
  )
  if (!refund) throw new RefundError("This refund has already been decided")

  if (refund.requestedBy.role === "pharmacy") {
    await notifyFarmer(
      refund.requestedBy.id,
      "Refund request declined",
      `Your refund request on order ${refund.reference} was declined. ${note.trim()}`,
      "/pharmacy-portal/sales"
    )
  }
  return refund
}

export async function getRefund(id: string): Promise<Refund | null> {
  if (!ObjectId.isValid(id)) return null
  const collection = await getCollection()
  return collection.findOne({ _id: new ObjectId(id) })
}

export async function listRefunds(filter: { status?: RefundStatus; sellerId?: string; orderIds?: string[] } = {}): Promise<Refund[]> {
  const collection = await getCollection()
  const query: Record<string, unknown> = {}
  if (filter.status) query.status = filter.status
  if (filter.sellerId) query["lines.sellerId"] = filter.sellerId
  if (filter.orderIds) query.orderId = { $in: filter.orderIds }
  return collection.find(query).sort({ requestedAt: -1 }).limit(200).toArray()
}

/**
 * Wire shape. For a seller, only their own lines are shown and the amount is theirs -
 * a refund finance opened across several sellers' items shows each seller their part.
 */
export function serializeRefund(refund: Refund, options: { sellerId?: string } = {}) {
  const lines = options.sellerId ? refund.lines.filter((line) => line.sellerId === options.sellerId) : refund.lines
  return {
    id: refund._id.toString(),
    orderId: refund.orderId,
    reference: refund.reference,
    status: refund.status,
    lines,
    amount: lines.reduce((sum, line) => sum + line.amount, 0),
    reason: refund.reason,
    note: refund.note,
    buyer: refund.buyer,
    paymentMethod: refund.paymentMethod,
    requestedBy: { name: refund.requestedBy.name, role: refund.requestedBy.role },
    requestedAt: refund.requestedAt,
    decidedBy: refund.decidedBy ? { name: refund.decidedBy.name } : null,
    decidedAt: refund.decidedAt,
    decisionNote: refund.decisionNote,
    method: refund.method,
    refundReference: refund.refundReference,
    restocked: refund.restocked,
    clawbackAmount: options.sellerId ? undefined : refund.clawbackAmount,
  }
}

/**
 * Find a paid order by the reference buyers and sellers see (ORD-1A2B3C4D) or its
 * full id, so finance can start a refund from whichever they were given.
 */
export async function findOrderByReference(input: string): Promise<Order | null> {
  const value = input.trim()
  if (ObjectId.isValid(value) && value.length === 24) return getOrderById(value)
  const match = value.toUpperCase().replace(/^ORD-/, "")
  if (!/^[0-9A-F]{8}$/.test(match)) return null
  const client = await clientPromise
  const [order] = await client
    .db(DB_NAME)
    .collection<Order>("orders")
    .aggregate<Order>([
      { $match: { status: "paid" } },
      { $match: { $expr: { $eq: [{ $toUpper: { $substrCP: [{ $toString: "$_id" }, 16, 8] } }, match] } } },
      { $sort: { paidAt: -1 } },
      { $limit: 1 },
    ])
    .toArray()
  return order ?? null
}
