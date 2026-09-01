import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getActiveRule } from "@/lib/db-commission-rules"
import { computeFee } from "@/lib/commission"
import { recordIncome, reverseIncome } from "@/lib/db-income"
import type { IncomeSource } from "@/lib/income-sources"

const DB_NAME = "ntdm_animal_hospital"

export type OrderCategory = "sales" | "drugs" | "feeds"
export type OrderStatus = "pending_payment" | "paid" | "failed" | "cancelled" | "expired"
export type OrderPaymentStatus = "pending" | "completed" | "failed" | "invalid" | "reversed"
export type OrderPaymentMethod = "pesapal" | "intouchpay"

export interface OrderItem {
  serviceId: string
  categoryId: string
  category: OrderCategory
  name: string
  image: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderBuyer {
  name: string
  phone: string
  email?: string
  district?: string
  sector?: string
  village?: string
  notes?: string
}

export interface OrderPayment {
  pesapalOrderTrackingId?: string
  pesapalMerchantReference?: string
  pesapalRedirectUrl?: string
  intouchRequestTransactionId?: string
  intouchTransactionId?: string
  intouchReferenceNo?: string
}

/**
 * "direct" is Vettrack selling its own stock - feed and medicine - where the buyer
 * pays the full price and the whole amount is revenue.
 *
 * "brokerage" is an animal. The buyer pays a connection fee, which is what `total`
 * holds; the animal's own price is settled directly between buyer and seller, off
 * the platform, and Vettrack never touches it. Orders written before this field
 * existed are read as "direct".
 */
export type OrderType = "direct" | "brokerage"

export interface OrderBrokerage {
  listingId: string
  sellerId: string | null
  /** What the seller is asking for the animal. Recorded for reporting only - never charged. */
  animalPrice: number
  feeMode: "percent" | "flat"
  feeValue: number
  /** Frozen at the moment of sale so a later rate change can't move historic figures. */
  feeAmount: number
}

export interface Order {
  _id: ObjectId
  status: OrderStatus
  orderType?: OrderType
  brokerage?: OrderBrokerage
  items: OrderItem[]
  subtotal: number
  total: number
  currency: "RWF"
  buyer: OrderBuyer
  paymentMethod?: OrderPaymentMethod
  paymentStatus: OrderPaymentStatus
  payment: OrderPayment
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
}

/** How long an unpaid connection holds an animal before it returns to the marketplace. */
export const RESERVATION_HOLD_MINUTES = 30
/** How long a paid connection holds it while buyer and seller agree terms. */
export const RESERVATION_PAID_HOURS = 72

async function getOrdersCollection() {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  return db.collection<Order>("orders")
}

export class OrderValidationError extends Error {}

/**
 * Recomputes every line item's price server-side from the `services`
 * collection — the client-supplied cart price is never trusted.
 */
export async function createOrder(
  items: { serviceId: string; quantity: number }[],
  buyer: OrderBuyer
): Promise<Order> {
  if (items.length === 0) {
    throw new OrderValidationError("Cart is empty")
  }

  const client = await clientPromise
  const db = client.db(DB_NAME)

  const orderItems: OrderItem[] = []
  for (const { serviceId, quantity } of items) {
    if (!ObjectId.isValid(serviceId)) {
      throw new OrderValidationError(`Invalid product id: ${serviceId}`)
    }
    const service = await db.collection("services").findOne({ _id: new ObjectId(serviceId) })
    if (!service) {
      throw new OrderValidationError(`Product not found: ${serviceId}`)
    }
    const category = service.category as OrderCategory

    // Animals are brokered, not sold - they go through createBrokerageOrder and a
    // connection fee. Rejected here as well as in the UI because a stale cart in
    // someone's localStorage can still carry an animal from before that changed.
    if (category === "sales") {
      throw new OrderValidationError(
        "Animals can't be bought through the cart. Open the listing and contact the seller instead."
      )
    }

    const boundedQuantity = Math.max(1, Math.floor(quantity))
    const unitPrice = Number(service.price) || 0

    orderItems.push({
      serviceId,
      categoryId: service.categoryId,
      category,
      name: service.name,
      image: service.image,
      unitPrice,
      quantity: boundedQuantity,
      lineTotal: unitPrice * boundedQuantity,
    })
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const order: Omit<Order, "_id"> = {
    status: "pending_payment",
    items: orderItems,
    subtotal,
    total: subtotal,
    currency: "RWF",
    buyer,
    paymentStatus: "pending",
    payment: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const collection = await getOrdersCollection()
  const result = await collection.insertOne(order as Order)
  return { ...order, _id: result.insertedId }
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!ObjectId.isValid(id)) return null
  const collection = await getOrdersCollection()
  return collection.findOne({ _id: new ObjectId(id) })
}

/**
 * IntouchPay's requestPayment doesn't accept our own order id as a
 * reference — it generates its own `requesttransactionid`. We store that id
 * on the order right after initiating payment, then use this to correlate
 * the async callback back to the right order.
 */
export async function getOrderByIntouchRequestId(requestTransactionId: string): Promise<Order | null> {
  const collection = await getOrdersCollection()
  return collection.findOne({ "payment.intouchRequestTransactionId": requestTransactionId })
}

export async function updateOrderPaymentInit(
  id: string,
  paymentMethod: OrderPaymentMethod,
  payment: Partial<OrderPayment>
): Promise<void> {
  const collection = await getOrdersCollection()
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { paymentMethod, payment, updatedAt: new Date() } }
  )
}

/**
 * Move an order's payment state forward.
 *
 * "paid" is terminal. Both gateways can deliver duplicate or out-of-order
 * notifications - Pesapal fires an IPN *and* the browser-redirect verify route,
 * IntouchPay fires a callback *and* gets polled by the order GET handler - so all
 * four call sites can land on the same order. The `status: { $ne: "paid" }` filter
 * is what makes the transition happen exactly once, rather than each caller
 * remembering to check for itself. It also stops a stale "pending" notification
 * arriving late from knocking an already-paid order back to pending_payment.
 *
 * Returns whether *this* call performed the transition into paid. Phase 4 hangs
 * recordIncome() off that boolean, so one sale books one income entry however many
 * times a gateway retries.
 */
export async function updateOrderPaymentStatus(
  id: string,
  paymentStatus: OrderPaymentStatus,
  payment?: Partial<OrderPayment>
): Promise<{ transitionedToPaid: boolean }> {
  if (!ObjectId.isValid(id)) return { transitionedToPaid: false }

  const collection = await getOrdersCollection()
  const _id = new ObjectId(id)
  const status: OrderStatus = paymentStatus === "completed" ? "paid" : paymentStatus === "pending" ? "pending_payment" : "failed"

  // Gateway reference ids are reconciliation breadcrumbs rather than state, so
  // they stay safe to merge even onto an order that is already paid.
  const refs: Record<string, unknown> = {}
  if (payment) {
    for (const [key, value] of Object.entries(payment)) {
      if (value !== undefined) refs[`payment.${key}`] = value
    }
  }

  const update: Record<string, unknown> = {
    ...refs,
    paymentStatus,
    status,
    updatedAt: new Date(),
  }
  if (paymentStatus === "completed") {
    update.paidAt = new Date()
  }

  // A reversal is a legitimate move *out* of paid, so it is the one status allowed
  // to overwrite it.
  const filter: any = { _id }
  if (paymentStatus !== "reversed") filter.status = { $ne: "paid" }

  const result = await collection.updateOne(filter, { $set: update })

  if (result.matchedCount === 0) {
    // Either already paid, or no such order. Keep the breadcrumbs, leave state alone.
    if (Object.keys(refs).length > 0) {
      await collection.updateOne({ _id }, { $set: { ...refs, updatedAt: new Date() } })
    }
    return { transitionedToPaid: false }
  }

  const transitionedToPaid = paymentStatus === "completed"

  if (transitionedToPaid) {
    await onOrderPaid(_id)
  } else if (paymentStatus === "reversed") {
    await onOrderReversed(_id)
  } else if (status === "failed") {
    // A failed payment shouldn't keep an animal off the marketplace for the rest of
    // the hold window.
    await onOrderFailed(_id)
  }

  return { transitionedToPaid }
}

// ---------------------------------------------------------------------------
// Brokerage: connecting a buyer to the seller of an animal
// ---------------------------------------------------------------------------

async function getServicesCollection() {
  const client = await clientPromise
  return client.db(DB_NAME).collection("services")
}

/**
 * A listing is available if it is active, or if it was never given a status (every
 * listing published before this feature existed), or if an earlier hold has since
 * lapsed. Expiry is evaluated here rather than by a background job, so there is
 * nothing to schedule and nothing to go stale.
 */
function availableListingFilter(now: Date) {
  return {
    category: "sales",
    $or: [
      { listingStatus: "active" },
      { listingStatus: { $exists: false } },
      { listingStatus: null },
      { listingStatus: "reserved", reservedUntil: { $lt: now } },
    ],
  }
}

/**
 * Claim an animal for one buyer.
 *
 * The filter is what makes this exclusive: two buyers opening the same listing
 * cannot both get a hold, so only one of them can reach the payment screen. Without
 * it, both could pay a connection fee for an animal only one of them can have.
 */
async function claimListing(listingId: string, orderId: ObjectId, minutes: number): Promise<boolean> {
  const services = await getServicesCollection()
  const now = new Date()
  const result = await services.updateOne(
    { _id: new ObjectId(listingId), ...availableListingFilter(now) } as any,
    {
      $set: {
        listingStatus: "reserved",
        reservedUntil: new Date(now.getTime() + minutes * 60_000),
        reservedByOrderId: orderId.toString(),
        updatedAt: now,
      },
    }
  )
  return result.matchedCount > 0
}

/** Hand an animal back to the marketplace when the hold that took it fell through. */
async function releaseListing(listingId: string, orderId: ObjectId): Promise<void> {
  const services = await getServicesCollection()
  await services.updateOne(
    { _id: new ObjectId(listingId), reservedByOrderId: orderId.toString() } as any,
    { $set: { listingStatus: "active", reservedUntil: null, reservedByOrderId: null, updatedAt: new Date() } }
  )
}

export class ListingUnavailableError extends OrderValidationError {}

/**
 * Start a connection: hold the animal, price the fee, and open an order for it.
 *
 * `total` is the fee, never the animal's price - the buyer pays Vettrack only for
 * the introduction and settles the animal itself with the seller directly.
 */
export async function createBrokerageOrder(
  listingId: string,
  buyer: OrderBuyer
): Promise<Order> {
  if (!ObjectId.isValid(listingId)) {
    throw new OrderValidationError("Invalid listing")
  }

  const services = await getServicesCollection()
  const listing = await services.findOne({ _id: new ObjectId(listingId) })

  if (!listing || listing.category !== "sales") {
    throw new OrderValidationError("Listing not found")
  }
  if (listing.listingStatus === "sold" || listing.listingStatus === "withdrawn") {
    throw new ListingUnavailableError("This animal is no longer available")
  }

  const animalPrice = Number(listing.price) || 0
  const rule = await getActiveRule("sales")
  const feeAmount = computeFee(rule, animalPrice)

  const orderId = new ObjectId()

  const claimed = await claimListing(listingId, orderId, RESERVATION_HOLD_MINUTES)
  if (!claimed) {
    throw new ListingUnavailableError("Someone else is arranging this animal right now. Please try again shortly.")
  }

  const item: OrderItem = {
    serviceId: listingId,
    categoryId: listing.categoryId,
    category: "sales",
    name: listing.name,
    image: listing.image,
    unitPrice: feeAmount,
    quantity: 1,
    lineTotal: feeAmount,
  }

  const order: Omit<Order, "_id"> = {
    status: "pending_payment",
    orderType: "brokerage",
    brokerage: {
      listingId,
      sellerId: listing.sellerId ?? null,
      animalPrice,
      feeMode: rule.mode,
      feeValue: rule.value,
      feeAmount,
    },
    items: [item],
    subtotal: feeAmount,
    total: feeAmount,
    currency: "RWF",
    buyer,
    paymentStatus: "pending",
    payment: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  try {
    const collection = await getOrdersCollection()
    await collection.insertOne({ ...order, _id: orderId } as Order)
  } catch (error) {
    // Never leave an animal held by an order that does not exist.
    await releaseListing(listingId, orderId)
    throw error
  }

  return { ...order, _id: orderId }
}

/**
 * Once the fee is paid the buyer has earned the seller's details, so the hold is
 * extended to give the two of them time to agree terms off-platform.
 *
 * Vettrack never learns whether that deal closes - see the reservation loop in the
 * plan - so the listing returns to the marketplace when this window lapses unless
 * the seller confirms the sale.
 */
async function onBrokeragePaid(order: Order): Promise<void> {
  if (order.orderType !== "brokerage" || !order.brokerage) return
  const services = await getServicesCollection()
  const orderId = order._id.toString()

  // Scoped to reservedByOrderId so a late/duplicate gateway notification for a hold
  // that has since lapsed and been claimed by someone else cannot steal the listing
  // back - see the four-call-site duplicate-notification note on updateOrderPaymentStatus.
  const result = await services.updateOne(
    { _id: new ObjectId(order.brokerage.listingId), reservedByOrderId: orderId } as any,
    {
      $set: {
        listingStatus: "reserved",
        reservedUntil: new Date(Date.now() + RESERVATION_PAID_HOURS * 3600_000),
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )

  if (result.matchedCount === 0) {
    console.error(
      `Brokerage order ${orderId} was paid but listing ${order.brokerage.listingId} is no longer held by it - leaving the current holder's reservation untouched. Needs manual reconciliation (likely a duplicate/late gateway notification after the hold lapsed).`
    )
  }
}

/** Seller contact, released only to a buyer who has paid for this connection. */
export function sellerContactForPaidOrder(
  order: Order,
  listing: { sellerPhone?: string; sellerEmail?: string }
): { phone: string | null; email: string | null } | null {
  if (order.orderType !== "brokerage") return null
  if (order.status !== "paid") return null
  return {
    phone: listing.sellerPhone || null,
    email: listing.sellerEmail || null,
  }
}

export async function getListingForOrder(order: Order) {
  if (order.orderType !== "brokerage" || !order.brokerage) return null
  if (!ObjectId.isValid(order.brokerage.listingId)) return null
  const services = await getServicesCollection()
  return services.findOne({ _id: new ObjectId(order.brokerage.listingId) })
}

/**
 * Side effects that must happen exactly once, when an order first becomes paid.
 *
 * Called from updateOrderPaymentStatus rather than from the four payment routes, so
 * no caller can forget it and no gateway retry can run it twice.
 */
async function onOrderPaid(orderId: ObjectId): Promise<void> {
  try {
    const collection = await getOrdersCollection()
    const order = await collection.findOne({ _id: orderId })
    if (!order) return
    await onBrokeragePaid(order)
    await bookIncomeForOrder(order)
  } catch (error) {
    console.error("Post-payment handling failed:", error)
  }
}

/** Which ledger category an order line belongs to. */
const CATEGORY_TO_SOURCE: Record<OrderCategory, IncomeSource> = {
  sales: "marketplace_animal",
  feeds: "marketplace_feed",
  drugs: "marketplace_medicine",
}

/**
 * Write this order into the income ledger.
 *
 * A brokered animal books the connection fee as revenue against the animal's asking
 * price as gross - never the asking price as income, which would overstate revenue
 * roughly twentyfold.
 *
 * A direct order can mix feed and medicine in one basket, so it books one entry per
 * category rather than one per order; the ledger's unique index is on
 * (sourceType, sourceId), which is exactly what lets a single order id appear once
 * under each.
 */
async function bookIncomeForOrder(order: Order): Promise<void> {
  const orderId = order._id.toString()
  const occurredAt = order.paidAt ?? new Date()
  const shortRef = orderId.slice(-8).toUpperCase()

  if (order.orderType === "brokerage" && order.brokerage) {
    await recordIncome({
      sourceType: "marketplace_animal",
      sourceId: orderId,
      grossAmount: order.brokerage.animalPrice,
      platformRevenue: order.brokerage.feeAmount,
      feeRate: order.brokerage.feeMode === "percent" ? order.brokerage.feeValue : null,
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      sellerId: order.brokerage.sellerId,
      reference: `CONN-${shortRef}`,
      occurredAt,
    })
    return
  }

  // Vettrack's own stock: the whole price is revenue.
  const byCategory = new Map<OrderCategory, number>()
  for (const item of order.items) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.lineTotal)
  }

  for (const [category, amount] of byCategory) {
    await recordIncome({
      sourceType: CATEGORY_TO_SOURCE[category],
      sourceId: orderId,
      grossAmount: amount,
      platformRevenue: amount,
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      reference: `ORD-${shortRef}`,
      occurredAt,
    })
  }
}

/**
 * A reversed payment stops counting towards revenue and hands the animal back.
 *
 * The ledger row stays and is marked reversed rather than deleted - the sale did
 * happen, it just no longer contributes to totals.
 */
async function onOrderReversed(orderId: ObjectId): Promise<void> {
  try {
    const collection = await getOrdersCollection()
    const order = await collection.findOne({ _id: orderId })
    if (!order) return

    const id = orderId.toString()
    if (order.orderType === "brokerage" && order.brokerage) {
      await reverseIncome("marketplace_animal", id)
      await releaseListing(order.brokerage.listingId, orderId)
      return
    }

    const categories = new Set(order.items.map((item) => item.category))
    for (const category of categories) {
      await reverseIncome(CATEGORY_TO_SOURCE[category], id)
    }
  } catch (error) {
    console.error("Reversal handling failed:", error)
  }
}

/** Release the animal a failed connection was holding, rather than waiting out the hold. */
async function onOrderFailed(orderId: ObjectId): Promise<void> {
  try {
    const collection = await getOrdersCollection()
    const order = await collection.findOne({ _id: orderId })
    if (!order || order.orderType !== "brokerage" || !order.brokerage) return
    await releaseListing(order.brokerage.listingId, orderId)
  } catch (error) {
    console.error("Failed-payment handling failed:", error)
  }
}
