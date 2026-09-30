import clientPromise from "@/lib/db"
import { getPayoutsByLine } from "@/lib/db-payouts"
import { listRefunds, orderReference, serializeRefund } from "@/lib/db-refunds"
import type { Order, OrderBuyer } from "@/lib/db-orders"

const DB_NAME = "ntdm_animal_hospital"

/**
 * A seller's record of what sold through the cart - a pharmacy's drugs, a feed
 * supplier's feed - with
 * what it needs to hand each order over: who bought it, how to reach them, where they
 * are, and how they paid.
 *
 * Read straight from paid orders rather than kept as a separate ledger, so it can't
 * drift from what buyers actually paid. Each order line carries the seller who listed
 * it and the commission split fixed at checkout (OrderItem.sellerId /
 * commissionAmount / sellerAmount). A reversed payment stops being "paid" and drops
 * out by itself; refunds are subtracted.
 *
 * Buyers pay Vettrack, so `gross` is money Vettrack collected. The seller's share is
 * what Vettrack owes them after its commission, paid out through lib/db-payouts.ts.
 */

export interface SaleLine {
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

export interface SaleOrder {
  orderId: string
  reference: string
  paidAt: Date | null
  paymentMethod: string | null
  buyer: OrderBuyer
  lines: SaleLine[]
  /** This seller's part of the order only. */
  gross: number
  commission: number
  share: number
  refunded: number
  /** A prescription came with the order - viewable at /api/prescriptions/[id]. */
  prescriptionId: string | null
  refunds: ReturnType<typeof serializeRefund>[]
}

export interface SalesTotals {
  orders: number
  units: number
  /** What buyers paid Vettrack for this seller's items, less refunds. */
  gross: number
  commission: number
  /** What Vettrack owes the seller for them. */
  share: number
  /** Of that share, already paid out. */
  paidOut: number
}

export interface SellerSales {
  orders: SaleOrder[]
  total: SalesTotals
  thisMonth: SalesTotals
  /** More orders exist than `orders` holds; the totals still count all of them. */
  truncated: boolean
}

/** Most recent orders returned; totals are computed over everything. */
const ORDER_LIMIT = 100

/** Start of the current calendar month in Kigali, which is UTC+2 with no daylight saving. */
function startOfKigaliMonth(now: Date = new Date()): Date {
  const offset = 2 * 3600_000
  const kigali = new Date(now.getTime() + offset)
  return new Date(Date.UTC(kigali.getUTCFullYear(), kigali.getUTCMonth(), 1) - offset)
}

const emptyTotals = (): SalesTotals => ({ orders: 0, units: 0, gross: 0, commission: 0, share: 0, paidOut: 0 })

/**
 * One seller line's money after refunds. The split scales with the units kept, the
 * same proportion createRefundRequest uses to take a refund out.
 */
function netLine(item: Order["items"][number]) {
  const kept = Math.max(0, item.quantity - (item.refundedQuantity ?? 0))
  const commission = item.commissionAmount ?? 0
  const refundedCommission = Math.round((commission * (item.quantity - kept)) / item.quantity)
  const gross = item.unitPrice * kept
  return { kept, gross, commission: commission - refundedCommission, share: gross - (commission - refundedCommission) }
}

export async function getSalesForSeller(sellerId: string): Promise<SellerSales> {
  const client = await clientPromise
  const collection = client.db(DB_NAME).collection<Order>("orders")

  // Every paid order with this seller's items. Orders are few enough to total in code,
  // which keeps the refund and commission arithmetic in one place (netLine).
  const orders = await collection
    .find({ status: "paid", "items.sellerId": sellerId })
    .sort({ paidAt: -1, _id: -1 })
    .toArray()

  const monthStart = startOfKigaliMonth()
  const total = emptyTotals()
  const thisMonth = emptyTotals()
  const recent = orders.slice(0, ORDER_LIMIT)
  const orderIds = recent.map((order) => order._id.toString())

  const [payouts, refunds] = await Promise.all([
    getPayoutsByLine(sellerId, orders.map((order) => order._id.toString())),
    listRefunds({ sellerId, orderIds }),
  ])

  for (const order of orders) {
    const id = order._id.toString()
    const inMonth = !!order.paidAt && order.paidAt >= monthStart
    let counted = false
    for (const item of order.items) {
      if (item.sellerId !== sellerId) continue
      const net = netLine(item)
      const payout = payouts.get(`${id}:${item.serviceId}`)
      const paidOut = payout?.status === "paid" ? payout.sellerAmount : 0
      for (const totals of inMonth ? [total, thisMonth] : [total]) {
        totals.units += net.kept
        totals.gross += net.gross
        totals.commission += net.commission
        totals.share += net.share
        totals.paidOut += paidOut
        if (!counted) totals.orders += 1
      }
      counted = true
    }
  }

  const saleOrders: SaleOrder[] = recent.map((order) => {
    const id = order._id.toString()
    const lines: SaleLine[] = order.items
      .filter((item) => item.sellerId === sellerId)
      .map((item) => ({
        serviceId: item.serviceId,
        name: item.name,
        image: item.image ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        commissionPercent: item.commissionPercent ?? 0,
        commissionAmount: item.commissionAmount ?? 0,
        sellerAmount: item.sellerAmount ?? item.lineTotal,
        refundedQuantity: item.refundedQuantity ?? 0,
        prescriptionRequired: item.prescriptionRequired === true,
        payoutStatus: payouts.get(`${id}:${item.serviceId}`)?.status ?? null,
      }))
    const nets = order.items.filter((item) => item.sellerId === sellerId).map(netLine)
    const gross = lines.reduce((sum, line) => sum + line.lineTotal, 0)
    return {
      orderId: id,
      reference: orderReference(id),
      paidAt: order.paidAt ?? null,
      paymentMethod: order.paymentMethod ?? null,
      buyer: order.buyer,
      lines,
      gross,
      commission: nets.reduce((sum, net) => sum + net.commission, 0),
      share: nets.reduce((sum, net) => sum + net.share, 0),
      refunded: gross - nets.reduce((sum, net) => sum + net.gross, 0),
      // Only when this seller sold a prescription-only item on it - otherwise the
      // prescription is none of their business.
      prescriptionId: lines.some((line) => line.prescriptionRequired) ? order.prescriptionId ?? null : null,
      refunds: refunds.filter((refund) => refund.orderId === id).map((refund) => serializeRefund(refund, { sellerId })),
    }
  })

  return { orders: saleOrders, total, thisMonth, truncated: orders.length > ORDER_LIMIT }
}
