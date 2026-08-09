import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

export type PayoutStatus = "pending" | "paid" | "cancelled"

export interface Payout {
  _id: ObjectId
  orderId: string
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
