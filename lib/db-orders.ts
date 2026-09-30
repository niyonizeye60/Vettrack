import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"
import { getActiveRule } from "@/lib/db-commission-rules"
import { computeFee } from "@/lib/commission"
import { recordIncome, reverseIncome, reverseRefundsOf } from "@/lib/db-income"
import type { IncomeSource } from "@/lib/income-sources"
import {
  availableUnits,
  claimLowStockWarning,
  commitStock,
  holdStock,
  isStockTracked,
  isWithinSellBy,
  releaseStock,
} from "@/lib/stock"
import { notifyFarmer, notifyFinance, sellerSalesPath } from "@/lib/marketplace-notifications"
import { alertLowStock, alertOutOfStock } from "@/lib/product-alerts"
import { getCommissionPercentage, getSellByDays } from "@/lib/db-settings"
import { attachPrescription, detachPrescription, getPrescription } from "@/lib/db-prescriptions"
import { createSellerPayouts } from "@/lib/db-payouts"

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
  /**
   * The seller who listed it - a pharmacy for its drugs, a feed supplier for its feed.
   * Null for Vettrack's own stock, and absent on orders from before sellers could list
   * products.
   */
  sellerId?: string | null
  /**
   * A seller's line only: Vettrack's commission rate and the split of lineTotal
   * between Vettrack and the seller, frozen when the order is placed so a later rate
   * change can't move what was agreed. Absent on Vettrack's own stock.
   */
  commissionPercent?: number
  commissionAmount?: number
  sellerAmount?: number
  /** Sold against the prescription uploaded with the order (Order.prescriptionId). */
  prescriptionRequired?: boolean
  /** Units refunded so far - see lib/db-refunds.ts. */
  refundedQuantity?: number
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
  /** How the payment status was confirmed: gateway status API or (during a status-API outage) the authenticated webhook body. */
  intouchVerifiedVia?: "status-api" | "webhook-body"
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
  /** Units this order set aside from stock-counted listings - see lib/stock.ts. */
  heldStock?: { serviceId: string; quantity: number }[]
  /** When the paid order's units came off stock - the guard that makes that happen once. */
  stockCommittedAt?: Date
  /** Paid for more units than were left; needs someone to sort out with the seller. */
  stockShortfall?: boolean
  /** The vet's prescription the buyer uploaded (lib/db-prescriptions.ts), for prescription-only drugs. */
  prescriptionId?: string
  /** Total refunded to the buyer so far. */
  refundedAmount?: number
}

/** Refused because the cart holds a prescription-only drug and no prescription came with it. */
export class PrescriptionRequiredError extends Error {}

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
 *
 * Stock-counted listings have their units set aside here, before the buyer is sent to
 * pay, so two buyers can't both pay for the last one. See lib/stock.ts for how those
 * units are released or sold.
 *
 * A seller's line (a pharmacy's drug) is split here between Vettrack's commission and
 * the seller's share, at the commission rate in force right now.
 */
export async function createOrder(
  items: { serviceId: string; quantity: number }[],
  buyer: OrderBuyer,
  options: { prescriptionId?: string } = {}
): Promise<Order> {
  if (items.length === 0) {
    throw new OrderValidationError("Cart is empty")
  }

  const client = await clientPromise
  const db = client.db(DB_NAME)

  const orderItems: OrderItem[] = []
  // Units to set aside per counted listing - one entry each, even if a crafted cart
  // names the same listing twice.
  const toHold = new Map<string, { name: string; quantity: number }>()
  const sellByDays = await getSellByDays()
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

    // Hidden after it went into someone's cart - a stale cart must not be able to buy it.
    if (service.hidden === true) {
      throw new OrderValidationError(`${service.name} is no longer available. Remove it from your cart to continue.`)
    }
    if (!isWithinSellBy(service, sellByDays)) {
      throw new OrderValidationError(
        `${service.name} is too close to its expiry date to be sold. Remove it from your cart to continue.`
      )
    }

    const boundedQuantity = Math.max(1, Math.floor(quantity))
    const unitPrice = Number(service.price)
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new OrderValidationError(`Price is not available for ${service.name}`)
    }

    orderItems.push({
      serviceId,
      categoryId: service.categoryId,
      category,
      name: service.name,
      image: service.image,
      unitPrice,
      quantity: boundedQuantity,
      lineTotal: unitPrice * boundedQuantity,
      sellerId: service.sellerId ?? null,
      ...(service.prescriptionRequired === true ? { prescriptionRequired: true } : {}),
    })

    if (isStockTracked(service)) {
      const wanted = (toHold.get(serviceId)?.quantity ?? 0) + boundedQuantity
      toHold.set(serviceId, { name: service.name, quantity: wanted })
    }
  }

  // A prescription-only drug needs the vet's prescription before anyone is asked to pay.
  const needsPrescription = orderItems.filter((item) => item.prescriptionRequired)
  if (needsPrescription.length > 0) {
    const upload = options.prescriptionId ? await getPrescription(options.prescriptionId) : null
    if (!upload || upload.orderId) {
      throw new PrescriptionRequiredError(
        `${needsPrescription.map((item) => item.name).join(", ")} can only be sold with a vet's prescription. Upload a photo of it to continue.`
      )
    }
  }

  if (orderItems.some((item) => item.sellerId)) {
    const percent = await getCommissionPercentage()
    for (const item of orderItems) {
      if (!item.sellerId) continue
      item.commissionPercent = percent
      item.commissionAmount = Math.round((item.lineTotal * percent) / 100)
      item.sellerAmount = item.lineTotal - item.commissionAmount
    }
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const orderId = new ObjectId()
  const heldStock = await holdOrderStock(orderId, toHold)
  const releaseHeld = () => Promise.all(heldStock.map((hold) => releaseStock(hold.serviceId, orderId.toString())))

  let prescriptionId: string | undefined
  if (needsPrescription.length > 0) {
    // Attached before the order is saved, so two checkouts can't share one upload.
    if (!(await attachPrescription(options.prescriptionId!, orderId.toString()))) {
      await releaseHeld()
      throw new PrescriptionRequiredError("Your prescription upload has expired. Upload it again to continue.")
    }
    prescriptionId = options.prescriptionId
  }

  const order: Omit<Order, "_id"> = {
    status: "pending_payment",
    items: orderItems,
    subtotal,
    total: subtotal,
    currency: "RWF",
    buyer,
    paymentStatus: "pending",
    payment: {},
    ...(heldStock.length > 0 ? { heldStock } : {}),
    ...(prescriptionId ? { prescriptionId } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  try {
    const collection = await getOrdersCollection()
    await collection.insertOne({ ...order, _id: orderId } as Order)
  } catch (error) {
    // Never leave units or an upload tied to an order that does not exist.
    await releaseHeld()
    if (prescriptionId) await detachPrescription(prescriptionId, orderId.toString())
    throw error
  }
  return { ...order, _id: orderId }
}

/**
 * Set aside every counted unit the order needs, or none: if one listing is short, the
 * units already taken for the others are handed back and the buyer is told how many
 * they can have.
 */
async function holdOrderStock(
  orderId: ObjectId,
  wanted: Map<string, { name: string; quantity: number }>
): Promise<{ serviceId: string; quantity: number }[]> {
  const held: { serviceId: string; quantity: number }[] = []
  for (const [serviceId, { name, quantity }] of wanted) {
    if (await holdStock(serviceId, orderId.toString(), quantity)) {
      held.push({ serviceId, quantity })
      continue
    }

    await Promise.all(held.map((hold) => releaseStock(hold.serviceId, orderId.toString())))

    const services = await getServicesCollection()
    const current = await services.findOne(
      { _id: new ObjectId(serviceId) },
      { projection: { stock: 1, stockHolds: 1, hidden: 1 } }
    )
    const left = current && current.hidden !== true ? availableUnits(current) ?? 0 : 0
    throw new OrderValidationError(
      left > 0
        ? `Only ${left} of ${name} left. Lower the quantity in your cart to continue.`
        : `${name} is out of stock. Remove it from your cart to continue.`
    )
  }
  return held
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
    // A failed payment shouldn't keep an animal, or units of stock, off the
    // marketplace for the rest of the hold window.
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
    // A listing hidden after a buyer opened it must not be claimable - this filter,
    // not the earlier read, is what decides.
    hidden: { $ne: true },
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
  if (listing.hidden === true || listing.listingStatus === "sold" || listing.listingStatus === "withdrawn") {
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
  let order: Order | null
  try {
    const collection = await getOrdersCollection()
    order = await collection.findOne({ _id: orderId })
  } catch (error) {
    console.error("Post-payment handling failed:", error)
    return
  }
  if (!order) return

  // Each step runs even if an earlier one fails: a ledger error must not leave sold
  // units on sale, nor a stock error keep the sale off the books.
  const steps: [string, (order: Order) => Promise<void>][] = [
    ["connection", onBrokeragePaid],
    ["income", bookIncomeForOrder],
    ["payouts", createSellerPayouts],
    ["stock", commitStockForOrder],
  ]
  for (const [name, step] of steps) {
    try {
      await step(order)
    } catch (error) {
      console.error(`Post-payment ${name} handling failed:`, error)
    }
  }
}

/**
 * Take a paid order's units off stock, then tell each seller what sold.
 *
 * `stockCommittedAt` is what makes this happen once: a payment that is reversed and
 * later confirmed again passes through onOrderPaid a second time.
 */
async function commitStockForOrder(order: Order): Promise<void> {
  const sellerItems = order.items.filter((item) => item.sellerId)
  if (!order.heldStock?.length && sellerItems.length === 0) return

  const collection = await getOrdersCollection()
  const claim = await collection.updateOne(
    { _id: order._id, stockCommittedAt: { $exists: false } },
    { $set: { stockCommittedAt: new Date() } }
  )
  if (claim.modifiedCount === 0) return

  const orderId = order._id.toString()
  const ref = `ORD-${orderId.slice(-8).toUpperCase()}`
  const itemFor = (serviceId: string) => order.items.find((item) => item.serviceId === serviceId)
  const shortServiceIds = new Set<string>()

  for (const { serviceId, quantity } of order.heldStock ?? []) {
    const { remaining, shortfall, lowStockAt } = await commitStock(serviceId, orderId, quantity)
    const item = itemFor(serviceId)
    if (shortfall) shortServiceIds.add(serviceId)
    if (!item || remaining === null) continue
    // Whoever looks after it hears: the seller, or marketplace staff for Vettrack's own.
    if (remaining === 0) {
      await alertOutOfStock(item)
    } else if (remaining <= lowStockAt && (await claimLowStockWarning(serviceId))) {
      await alertLowStock(item, remaining)
    }
  }

  if (shortServiceIds.size > 0) {
    await collection.updateOne({ _id: order._id }, { $set: { stockShortfall: true } })
    const names = [...shortServiceIds].map((id) => itemFor(id)?.name ?? id).join(", ")
    await notifyFinance(
      "Order paid for more stock than was left",
      `Order ${ref} was paid for, but not enough of ${names} was left in stock. Check with the seller, or refund the buyer from Refunds.`
    )
  }

  // Only a pharmacy's drugs and a feed supplier's feed carry a seller on a cart order -
  // animals are brokered.
  const bySeller = new Map<string, OrderItem[]>()
  for (const item of sellerItems) {
    bySeller.set(item.sellerId!, [...(bySeller.get(item.sellerId!) ?? []), item])
  }
  for (const [sellerId, items] of bySeller) {
    const summary = items.map((item) => `${item.quantity} × ${item.name}`).join(", ")
    const amount = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const share = items.reduce((sum, item) => sum + (item.sellerAmount ?? item.lineTotal), 0)
    const short = items.some((item) => shortServiceIds.has(item.serviceId))
    await notifyFarmer(
      sellerId,
      "New sale",
      `Order ${ref}: ${summary} for ${order.buyer.name}. Vettrack collected RWF ${amount.toLocaleString()}; ` +
        `your share is RWF ${share.toLocaleString()}. Open Sales for the buyer's contact and delivery details.` +
        (short ? " Your stock was short for part of this order - Vettrack will contact you." : ""),
      sellerSalesPath(items[0].category)
    )
  }
}

/** Which ledger category an order line belongs to. */
export const CATEGORY_TO_SOURCE: Record<OrderCategory, IncomeSource> = {
  sales: "marketplace_animal",
  feeds: "marketplace_feed",
  drugs: "marketplace_medicine",
}

/**
 * The ledger entry for one seller's lines on an order. Separate from the order's own
 * entry because the ledger is unique on (sourceType, sourceId), and one basket can
 * hold Vettrack's own drugs and several pharmacies' under the same category.
 */
export function sellerLedgerId(orderId: string, sellerId: string): string {
  return `${orderId}:${sellerId}`
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
 *
 * A seller's lines (a pharmacy's drugs) are the same idea as the animal: the buyer's
 * payment is the gross, but only the commission is Vettrack's revenue - the rest is
 * the seller's money, owed to them as a payout (lib/db-payouts.ts). They book one
 * entry per seller, keyed by sellerLedgerId.
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

  // Sellers' lines: the commission is revenue, the rest is theirs.
  const sellers = new Map<string, { category: OrderCategory; gross: number; commission: number; percent: number | null }>()
  for (const item of order.items) {
    if (!item.sellerId) continue
    const entry = sellers.get(item.sellerId) ?? { category: item.category, gross: 0, commission: 0, percent: item.commissionPercent ?? null }
    entry.gross += item.lineTotal
    entry.commission += item.commissionAmount ?? 0
    sellers.set(item.sellerId, entry)
  }
  for (const [sellerId, entry] of sellers) {
    await recordIncome({
      sourceType: CATEGORY_TO_SOURCE[entry.category],
      sourceId: sellerLedgerId(orderId, sellerId),
      grossAmount: entry.gross,
      platformRevenue: entry.commission,
      feeRate: entry.percent,
      buyerName: order.buyer.name,
      buyerPhone: order.buyer.phone,
      sellerId,
      reference: `ORD-${shortRef}`,
      occurredAt,
    })
  }

  // Vettrack's own stock: the whole price is revenue.
  const byCategory = new Map<OrderCategory, number>()
  for (const item of order.items) {
    if (item.sellerId) continue
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
 *
 * Units of stock are not put back: the drugs have most likely been handed over by
 * then, and the seller corrects their count if they got them back.
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

    const categories = new Set(order.items.filter((item) => !item.sellerId).map((item) => item.category))
    for (const category of categories) {
      await reverseIncome(CATEGORY_TO_SOURCE[category], id)
    }
    const sellerEntries = new Set<string>()
    for (const item of order.items) {
      if (!item.sellerId) continue
      sellerEntries.add(sellerLedgerId(id, item.sellerId))
      await reverseIncome(CATEGORY_TO_SOURCE[item.category], sellerLedgerId(id, item.sellerId))
    }
    // Refunds already booked against this sale go too, or they'd subtract money the
    // reversal has already taken out.
    await reverseRefundsOf([id, ...sellerEntries])
  } catch (error) {
    console.error("Reversal handling failed:", error)
  }
}

/**
 * Release what a failed payment was holding - the animal, or the units of stock -
 * rather than waiting out the hold.
 */
async function onOrderFailed(orderId: ObjectId): Promise<void> {
  try {
    const collection = await getOrdersCollection()
    const order = await collection.findOne({ _id: orderId })
    if (!order) return
    // Only ever removes this order's hold; it never adds units back to stock, so it is
    // harmless on an order whose units were already sold.
    for (const { serviceId } of order.heldStock ?? []) {
      await releaseStock(serviceId, orderId.toString())
    }
    if (order.orderType !== "brokerage" || !order.brokerage) return
    await releaseListing(order.brokerage.listingId, orderId)
  } catch (error) {
    console.error("Failed-payment handling failed:", error)
  }
}
