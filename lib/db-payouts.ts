import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

export type PayoutStatus = "pending" | "paid" | "cancelled"

/**
 * What Vettrack owes a seller for one line of a paid order: the line total less
 * Vettrack's commission. Superadmin pays these from the Commissions screen (by
 * IntouchPay or by marking them paid).
 *
 * Pharmacy drug sales create one per order line (createSellerPayouts); `serviceId`
 * identifies the line, and a refund shrinks or cancels the payout while it is still
 * pending (applyRefundToPayout).
 */
export interface Payout {
  _id: ObjectId
  orderId: string
  /** The order line this pays for. Absent on payouts from the older marketplace flow. */
  serviceId?: string
  sellerId: string
  sellerName: string
  sellerPhone: string
  itemName: string
  itemTotal: number
  commissionPercentage: number
  commissionAmount: number
  sellerAmount: number
  status: PayoutStatus
  paidAt?: Date
  createdAt: Date
  /** The buyer was refunded this much of itemTotal (the seller's share of it is gone from sellerAmount). */
  refundedAmount?: number
  /** Refunded after this payout had already been paid - the seller owes that share back. */
  clawbackAmount?: number
}

async function getPayoutsCollection() {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  return db.collection<Payout>("payouts")
}

export async function createPayoutsForOrder(order: {
  _id: ObjectId
  items: Array<{
    name: string
    lineTotal: number
    commissionAmount?: number
    sellerAmount?: number
    sellerId?: string
    sellerName?: string
    sellerPhone?: string
  }>
  commissionPercentage: number
}): Promise<number> {
  const collection = await getPayoutsCollection()
  const orderId = order._id.toString()
  let count = 0

  for (const item of order.items) {
    if (!item.sellerId && !item.sellerPhone) continue
    if (!item.sellerAmount) continue

    const payout: Omit<Payout, "_id"> = {
      orderId,
      sellerId: item.sellerId || "unknown",
      sellerName: item.sellerName || "Unknown Seller",
      sellerPhone: item.sellerPhone || "",
      itemName: item.name,
      itemTotal: item.lineTotal,
      commissionPercentage: order.commissionPercentage,
      commissionAmount: item.commissionAmount || 0,
      sellerAmount: item.sellerAmount,
      status: "pending",
      createdAt: new Date(),
    }

    await collection.insertOne(payout as Payout)
    count++
  }

  return count
}

export async function getPayoutsBySeller(sellerId: string): Promise<Payout[]> {
  const collection = await getPayoutsCollection()
  return collection
    .find({ sellerId })
    .sort({ createdAt: -1 })
    .toArray()
}

export async function getPendingPayouts(): Promise<Payout[]> {
  const collection = await getPayoutsCollection()
  return collection
    .find({ status: "pending" })
    .sort({ createdAt: -1 })
    .toArray()
}

export async function getAllPayouts(limit = 100): Promise<Payout[]> {
  const collection = await getPayoutsCollection()
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

export async function markPayoutAsPaid(payoutId: string): Promise<void> {
  const collection = await getPayoutsCollection()
  await collection.updateOne(
    { _id: new ObjectId(payoutId) },
    { $set: { status: "paid", paidAt: new Date() } }
  )
}

export async function getPayoutStats(sellerId?: string) {
  const collection = await getPayoutsCollection()
  const match = sellerId ? { sellerId } : {}

  const stats = await collection.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        total: { $sum: "$sellerAmount" },
        count: { $sum: 1 },
      },
    },
  ]).toArray()

  const result = { pending: 0, paid: 0, cancelled: 0, pendingAmount: 0, paidAmount: 0 }
  for (const stat of stats) {
    if (stat._id === "pending") {
      result.pending = stat.count
      result.pendingAmount = stat.total
    } else if (stat._id === "paid") {
      result.paid = stat.count
      result.paidAmount = stat.total
    } else if (stat._id === "cancelled") {
      result.cancelled = stat.count
    }
  }

  return result
}

export interface SellerBreakdown {
  sellerId: string
  sellerName: string
  sellerPhone: string
  totalItems: number
  totalItemAmount: number
  totalCommission: number
  totalSellerAmount: number
  pendingCount: number
  paidCount: number
  cancelledCount: number
  pendingAmount: number
  paidAmount: number
  lastPayoutDate: Date | null
}

export async function getSellerBreakdown(): Promise<SellerBreakdown[]> {
  const collection = await getPayoutsCollection()
  const results = await collection.aggregate([
    {
      $group: {
        _id: "$sellerId",
        sellerName: { $first: "$sellerName" },
        sellerPhone: { $first: "$sellerPhone" },
        totalItems: { $sum: 1 },
        totalItemAmount: { $sum: "$itemTotal" },
        totalCommission: { $sum: "$commissionAmount" },
        totalSellerAmount: { $sum: "$sellerAmount" },
        pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$sellerAmount", 0] } },
        paidAmount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$sellerAmount", 0] } },
        lastPayoutDate: { $max: "$createdAt" },
      },
    },
    { $sort: { totalSellerAmount: -1 } },
  ]).toArray()

  return results.map((r) => ({
    sellerId: r._id,
    sellerName: r.sellerName,
    sellerPhone: r.sellerPhone,
    totalItems: r.totalItems,
    totalItemAmount: r.totalItemAmount,
    totalCommission: r.totalCommission,
    totalSellerAmount: r.totalSellerAmount,
    pendingCount: r.pendingCount,
    paidCount: r.paidCount,
    cancelledCount: r.cancelledCount,
    pendingAmount: r.pendingAmount,
    paidAmount: r.paidAmount,
    lastPayoutDate: r.lastPayoutDate,
  }))
}

export async function getCommissionStats() {
  const collection = await getPayoutsCollection()
  const stats = await collection.aggregate([
    {
      $group: {
        _id: null,
        totalCommission: { $sum: "$commissionAmount" },
        totalSellerAmount: { $sum: "$sellerAmount" },
        totalItems: { $sum: 1 },
        paidCommission: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$commissionAmount", 0] },
        },
        pendingCommission: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$commissionAmount", 0] },
        },
      },
    },
  ]).toArray()

  return stats[0] || { totalCommission: 0, totalSellerAmount: 0, totalItems: 0, paidCommission: 0, pendingCommission: 0 }
}

let payoutIndexesEnsured = false
async function ensurePayoutIndexes() {
  if (payoutIndexesEnsured) return
  try {
    const collection = await getPayoutsCollection()
    // One payout per order line, however many times payment confirmation arrives.
    await collection.createIndex(
      { orderId: 1, serviceId: 1 },
      { unique: true, partialFilterExpression: { serviceId: { $type: "string" } } }
    )
    payoutIndexesEnsured = true
  } catch (error) {
    console.error("Failed to ensure payout indexes:", error)
  }
}

/**
 * Open a pending payout for every seller line of a paid order - today, a pharmacy's
 * drugs. The split was fixed when the order was placed (OrderItem.commissionAmount /
 * sellerAmount). Safe to run twice: each line is inserted only if it has no payout yet.
 */
export async function createSellerPayouts(order: {
  _id: ObjectId
  items: Array<{
    serviceId: string
    name: string
    lineTotal: number
    sellerId?: string | null
    commissionPercent?: number
    commissionAmount?: number
    sellerAmount?: number
  }>
}): Promise<void> {
  const lines = order.items.filter((item) => item.sellerId && item.sellerAmount != null)
  if (lines.length === 0) return
  await ensurePayoutIndexes()

  const client = await clientPromise
  const users = client.db(DB_NAME).collection("users")
  const collection = await getPayoutsCollection()
  const orderId = order._id.toString()
  const sellers = new Map<string, { name: string; phone: string }>()

  for (const item of lines) {
    const sellerId = item.sellerId!
    if (!sellers.has(sellerId)) {
      const user = ObjectId.isValid(sellerId)
        ? await users.findOne({ _id: new ObjectId(sellerId) }, { projection: { name: 1, phone: 1 } })
        : null
      sellers.set(sellerId, { name: user?.name ?? "Unknown seller", phone: user?.phone ?? "" })
    }
    const seller = sellers.get(sellerId)!
    try {
      await collection.updateOne(
        { orderId, serviceId: item.serviceId },
        {
          $setOnInsert: {
            orderId,
            serviceId: item.serviceId,
            sellerId,
            sellerName: seller.name,
            sellerPhone: seller.phone,
            itemName: item.name,
            itemTotal: item.lineTotal,
            commissionPercentage: item.commissionPercent ?? 0,
            commissionAmount: item.commissionAmount ?? 0,
            sellerAmount: item.sellerAmount!,
            status: "pending",
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
    } catch (error: any) {
      // Two confirmations racing: the other one inserted it.
      if (error?.code !== 11000) throw error
    }
  }
}

/**
 * Take a refund out of the payout for that order line.
 *
 * Still pending: the seller's share of the refunded amount comes off (and a fully
 * refunded line is cancelled). Already paid: the payout stays as paid and the share
 * is recorded as owed back - returned so the caller can flag it.
 */
export async function applyRefundToPayout(
  orderId: string,
  serviceId: string,
  refundAmount: number,
  sellerShare: number,
  commissionShare: number
): Promise<{ clawback: number }> {
  const collection = await getPayoutsCollection()
  const payout = await collection.findOne({ orderId, serviceId })
  if (!payout || payout.status === "cancelled") return { clawback: 0 }

  if (payout.status === "paid") {
    await collection.updateOne(
      { _id: payout._id },
      { $inc: { refundedAmount: refundAmount, clawbackAmount: sellerShare } }
    )
    return { clawback: sellerShare }
  }

  const sellerAmount = Math.max(0, payout.sellerAmount - sellerShare)
  await collection.updateOne(
    { _id: payout._id, status: "pending" },
    {
      $set: {
        sellerAmount,
        commissionAmount: Math.max(0, payout.commissionAmount - commissionShare),
        ...(sellerAmount === 0 ? { status: "cancelled" as PayoutStatus } : {}),
      },
      $inc: { refundedAmount: refundAmount },
    }
  )
  return { clawback: 0 }
}

/** Payout state per order line for one seller, keyed `${orderId}:${serviceId}`. */
export async function getPayoutsByLine(sellerId: string, orderIds: string[]): Promise<Map<string, Payout>> {
  const collection = await getPayoutsCollection()
  const payouts = await collection.find({ sellerId, orderId: { $in: orderIds }, serviceId: { $type: "string" } }).toArray()
  return new Map(payouts.map((payout) => [`${payout.orderId}:${payout.serviceId}`, payout]))
}
