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

export async function updateOrderPaymentStatus(
  id: string,
  paymentStatus: OrderPaymentStatus,
  payment?: Partial<OrderPayment>
): Promise<void> {
  const collection = await getOrdersCollection()
  const status: OrderStatus = paymentStatus === "completed" ? "paid" : paymentStatus === "pending" ? "pending_payment" : "failed"

  const update: Record<string, unknown> = {
    paymentStatus,
    status,
    updatedAt: new Date(),
  }
  if (payment) {
    for (const [key, value] of Object.entries(payment)) {
      update[`payment.${key}`] = value
    }
  }
  if (paymentStatus === "completed") {
    update.paidAt = new Date()
  }

  await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
}
