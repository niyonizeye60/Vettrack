import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

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

export interface Order {
  _id: ObjectId
  status: OrderStatus
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
    const boundedQuantity = category === "sales" ? 1 : Math.max(1, Math.floor(quantity))
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

  return { transitionedToPaid: paymentStatus === "completed" }
}
