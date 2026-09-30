import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { addDays, DEFAULT_LOW_STOCK_AT, expiryState, kigaliToday } from "@/lib/product-rules"

const DB_NAME = "ntdm_animal_hospital"

/**
 * Stock for products that count their units: a pharmacy's drugs, and Vettrack's own
 * drugs and feed once staff give them a count.
 *
 * A tracked listing carries `stock` (units not sold yet) and `stockHolds` (units set
 * aside for checkouts that have not been paid for yet). What a buyer can still order
 * is stock minus the holds that have not lapsed:
 *
 *   - checkout sets units aside (holdStock), so two buyers can't both pay for the last one
 *   - a paid order takes them off `stock` for good (commitStock)
 *   - a failed payment hands them back (releaseStock), and an abandoned one simply
 *     lapses after STOCK_HOLD_MINUTES
 *
 * Lapsing is evaluated whenever the listing is read, like the animal reservation in
 * lib/db-orders.ts, so there is no background job to schedule or to stop running.
 *
 * Listings without a numeric `stock` - staff products nobody has counted yet, and
 * anything published before stock existed - are not tracked and never run out.
 *
 * Holds name orders, and an order id is all a guest buyer needs to read their order,
 * so `stockHolds` must never be sent to a browser.
 */

/** How long an unpaid checkout keeps its units before they return to sale. */
export const STOCK_HOLD_MINUTES = 30

export interface StockHold {
  orderId: string
  quantity: number
  until: Date
}

/** A services document as read from the database. */
type ServiceDoc = Record<string, any>

async function getServices() {
  const client = await clientPromise
  return client.db(DB_NAME).collection("services")
}

/** The holds on the document that have not lapsed yet (aggregation expression). */
function liveHoldsExpr(now: Date) {
  return {
    $filter: {
      input: { $ifNull: ["$stockHolds", []] },
      as: "h",
      cond: { $gte: ["$$h.until", now] },
    },
  }
}

/** Units set aside by live holds (aggregation expression). */
function heldExpr(now: Date) {
  return { $sum: { $map: { input: liveHoldsExpr(now), as: "h", in: "$$h.quantity" } } }
}

/** Units a buyer can still order (aggregation expression); only meaningful on a tracked listing. */
function availableExpr(now: Date) {
  return { $subtract: ["$stock", heldExpr(now)] }
}

/**
 * Query filter for what the public may see and order: not hidden by staff, at least
 * one unit neither sold nor held (untracked listings always pass), and not past the
 * sell-by cutoff before its expiry date (listings without one always pass).
 * `sellByDays` is the superadmin setting - see getSellByDays in lib/db-settings.ts.
 *
 * The conditions share one `$expr`, so the filter can be spread next to other
 * conditions - including an `$or` - without overwriting them. Expiry dates are
 * stored as YYYY-MM-DD strings, which compare correctly as text.
 */
export function publicProductFilter(sellByDays: number, now: Date = new Date()) {
  const minExpiry = addDays(kigaliToday(now), sellByDays)
  return {
    hidden: { $ne: true },
    $expr: {
      $and: [
        { $gt: [{ $subtract: [{ $ifNull: ["$stock", 1] }, heldExpr(now)] }, 0] },
        {
          $or: [
            { $in: [{ $type: "$expiresOn" }, ["missing", "null"]] },
            { $eq: ["$expiresOn", ""] },
            { $gte: ["$expiresOn", minExpiry] },
          ],
        },
      ],
    },
  }
}

export function isStockTracked(doc: ServiceDoc): doc is ServiceDoc & { stock: number } {
  return typeof doc.stock === "number"
}

/** Units held by live checkouts, computed from a document already read. */
export function heldUnits(doc: ServiceDoc, now: Date = new Date()): number {
  const holds: StockHold[] = Array.isArray(doc.stockHolds) ? doc.stockHolds : []
  return holds
    .filter((hold) => new Date(hold.until) >= now)
    .reduce((sum, hold) => sum + hold.quantity, 0)
}

/** Units a buyer can order, or null for an untracked listing. */
export function availableUnits(doc: ServiceDoc, now: Date = new Date()): number | null {
  if (!isStockTracked(doc)) return null
  return Math.max(0, doc.stock - heldUnits(doc, now))
}

/** Whether a listing's expiry date still lets it be sold today, under the given cutoff. */
export function isWithinSellBy(doc: ServiceDoc, sellByDays: number, now: Date = new Date()): boolean {
  return expiryState(doc.expiresOn, sellByDays, kigaliToday(now)) !== "unsellable"
}

/**
 * Set `quantity` units aside for an unpaid order. Returns false when fewer than that
 * are available (or the listing was hidden or is not tracked).
 *
 * The availability check is in the filter, so check and claim are one atomic step.
 * Lapsed holds are pruned in the same write so the array can't grow without bound.
 */
export async function holdStock(serviceId: string, orderId: string, quantity: number): Promise<boolean> {
  if (!ObjectId.isValid(serviceId)) return false
  const services = await getServices()
  const now = new Date()
  const hold: StockHold = { orderId, quantity, until: new Date(now.getTime() + STOCK_HOLD_MINUTES * 60_000) }

  const result = await services.updateOne(
    {
      _id: new ObjectId(serviceId),
      hidden: { $ne: true },
      stock: { $type: "number" },
      $expr: { $gte: [availableExpr(now), quantity] },
    },
    [{ $set: { stockHolds: { $concatArrays: [liveHoldsExpr(now), { $literal: [hold] }] } } }]
  )
  return result.matchedCount > 0
}

/** Hand an order's units back, e.g. when its payment failed. Safe to call twice. */
export async function releaseStock(serviceId: string, orderId: string): Promise<void> {
  if (!ObjectId.isValid(serviceId)) return
  const services = await getServices()
  await services.updateOne({ _id: new ObjectId(serviceId) }, { $pull: { stockHolds: { orderId } } } as any)
}

export interface StockCommit {
  /** Units left after this sale, or null when the listing is untracked or gone. */
  remaining: number | null
  /** The order was paid for more units than were left - someone has to sort it out. */
  shortfall: boolean
  /** The seller's low-stock warning level for this listing. */
  lowStockAt: number
}

/**
 * Take a paid order's units off stock for good. The caller guarantees this runs once
 * per order (see commitStockForOrder in lib/db-orders.ts).
 *
 * Three cases, tried in order:
 *   1. the order's hold is still live - its units were set aside for it
 *   2. the hold lapsed before the payment landed, but enough units are still free
 *   3. they have since gone to someone else - the buyer has paid, so the sale stands
 *      and comes off stock anyway, and the shortfall is reported
 *
 * Stock never goes below zero.
 */
export async function commitStock(serviceId: string, orderId: string, quantity: number): Promise<StockCommit> {
  const untracked = { remaining: null, shortfall: false, lowStockAt: DEFAULT_LOW_STOCK_AT }
  if (!ObjectId.isValid(serviceId)) return untracked
  const services = await getServices()
  const _id = new ObjectId(serviceId)
  const now = new Date()

  const decrement = [
    {
      $set: {
        stock: { $max: [0, { $subtract: ["$stock", quantity] }] },
        stockHolds: {
          $filter: { input: liveHoldsExpr(now), as: "h", cond: { $ne: ["$$h.orderId", orderId] } },
        },
      },
    },
  ]

  const attempts: { filter: Record<string, unknown>; shortfall: boolean }[] = [
    { filter: { _id, stockHolds: { $elemMatch: { orderId, until: { $gte: now } } } }, shortfall: false },
    { filter: { _id, stock: { $type: "number" }, $expr: { $gte: [availableExpr(now), quantity] } }, shortfall: false },
    { filter: { _id, stock: { $type: "number" } }, shortfall: true },
  ]

  for (const attempt of attempts) {
    const before = await services.findOneAndUpdate(attempt.filter, decrement, { returnDocument: "before" })
    if (!before) continue
    const stock = typeof before.stock === "number" ? before.stock : 0
    return {
      remaining: Math.max(0, stock - quantity),
      // A seller can lower their count below what live checkouts hold, so even a live
      // hold can turn out to be short.
      shortfall: attempt.shortfall || stock < quantity,
      lowStockAt: typeof before.lowStockAt === "number" ? before.lowStockAt : DEFAULT_LOW_STOCK_AT,
    }
  }

  return untracked
}

/**
 * Whether this call is the one to warn about low stock. The warning goes out once
 * per dip: `lowStockNotifiedAt` stays set until a restock lifts the count back above
 * the warning level (see rearmExpr).
 */
export async function claimLowStockWarning(serviceId: string): Promise<boolean> {
  if (!ObjectId.isValid(serviceId)) return false
  const services = await getServices()
  const result = await services.updateOne(
    { _id: new ObjectId(serviceId), lowStockNotifiedAt: { $exists: false } },
    { $set: { lowStockNotifiedAt: new Date() } }
  )
  return result.modifiedCount > 0
}

/** Clear the low-stock warning once the count is back above the warning level. */
function rearmExpr() {
  return {
    $cond: [
      { $gt: ["$stock", { $ifNull: ["$lowStockAt", DEFAULT_LOW_STOCK_AT] }] },
      "$$REMOVE",
      "$lowStockNotifiedAt",
    ],
  }
}

/**
 * Set how many units there are (and optionally the low-stock warning level). Returns
 * false if the listing is gone - or, with `sellerId`, isn't that seller's.
 *
 * Holds are left alone: a buyer already in checkout keeps their units, and they come
 * out of the new count when that order is paid.
 */
export async function setStock(
  serviceId: string,
  stock: number,
  options: { sellerId?: string; lowStockAt?: number } = {}
): Promise<boolean> {
  if (!ObjectId.isValid(serviceId)) return false
  const services = await getServices()
  const now = new Date()
  const filter: Record<string, unknown> = { _id: new ObjectId(serviceId) }
  if (options.sellerId) filter.sellerId = options.sellerId

  const result = await services.updateOne(filter, [
    {
      $set: {
        stock,
        ...(options.lowStockAt != null ? { lowStockAt: options.lowStockAt } : {}),
        stockUpdatedAt: now,
        updatedAt: now,
      },
    },
    { $set: { lowStockNotifiedAt: rearmExpr() } },
  ])
  return result.matchedCount > 0
}

/** Put refunded units back on sale. Does nothing to a listing that doesn't count stock. */
export async function returnStock(serviceId: string, quantity: number): Promise<void> {
  if (!ObjectId.isValid(serviceId) || quantity <= 0) return
  const services = await getServices()
  await services.updateOne({ _id: new ObjectId(serviceId), stock: { $type: "number" } }, [
    { $set: { stock: { $add: ["$stock", quantity] }, updatedAt: new Date() } },
    { $set: { lowStockNotifiedAt: rearmExpr() } },
  ])
}
