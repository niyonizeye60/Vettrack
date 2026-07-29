import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "completed"

export interface WithdrawalRequest {
  _id: ObjectId
  sellerId: string
  sellerName: string
  sellerPhone: string
  amount: number
  status: WithdrawalStatus
  note?: string
  adminNote?: string
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
  processedBy?: string
}

async function getWithdrawalsCollection() {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  return db.collection<WithdrawalRequest>("withdrawals")
}

export async function createWithdrawalRequest(data: {
  sellerId: string
  sellerName: string
  sellerPhone: string
  amount: number
  note?: string
}): Promise<string> {
  const collection = await getWithdrawalsCollection()
  const doc: Omit<WithdrawalRequest, "_id"> = {
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    sellerPhone: data.sellerPhone,
    amount: data.amount,
    status: "pending",
    note: data.note || "",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const result = await collection.insertOne(doc as WithdrawalRequest)
  return result.insertedId.toString()
}

export async function getWithdrawalsBySeller(sellerId: string): Promise<WithdrawalRequest[]> {
  const collection = await getWithdrawalsCollection()
  return collection
    .find({ sellerId })
    .sort({ createdAt: -1 })
    .toArray()
}

export async function getAllWithdrawals(limit = 50): Promise<WithdrawalRequest[]> {
  const collection = await getWithdrawalsCollection()
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

export async function getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
  const collection = await getWithdrawalsCollection()
  return collection
    .find({ status: "pending" })
    .sort({ createdAt: -1 })
    .toArray()
}

export async function updateWithdrawalStatus(
  withdrawalId: string,
  status: WithdrawalStatus,
  adminNote?: string,
  processedBy?: string
): Promise<void> {
  const collection = await getWithdrawalsCollection()
  const update: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  }
  if (adminNote) update.adminNote = adminNote
  if (processedBy) update.processedBy = processedBy
  if (status === "approved" || status === "completed") {
    update.processedAt = new Date()
  }
  await collection.updateOne(
    { _id: new ObjectId(withdrawalId) },
    { $set: update }
  )
}

export async function getWithdrawalStats(sellerId?: string) {
  const collection = await getWithdrawalsCollection()
  const match = sellerId ? { sellerId } : {}
  const stats = await collection.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]).toArray()

  const result = { pending: 0, approved: 0, rejected: 0, completed: 0, pendingAmount: 0, approvedAmount: 0, completedAmount: 0 }
  for (const stat of stats) {
    if (stat._id === "pending") { result.pending = stat.count; result.pendingAmount = stat.total }
    else if (stat._id === "approved") { result.approved = stat.count; result.approvedAmount = stat.total }
    else if (stat._id === "completed") { result.completed = stat.count; result.completedAmount = stat.total }
    else if (stat._id === "rejected") { result.rejected = stat.count }
  }
  return result
}
