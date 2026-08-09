import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"

export type WalletTransactionType = "deposit" | "withdraw" | "direct_send"
export type WalletTransactionStatus = "completed" | "pending" | "failed"

export interface WalletTransaction {
  _id: ObjectId
  type: WalletTransactionType
  amount: number
  description: string
  recipientPhone?: string
  recipientName?: string
  initiatedBy: string
  initiatedByName: string
  reference?: string
  status: WalletTransactionStatus
  intouchResponse?: any
  createdAt: Date
}

async function getWalletCollection() {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  return db.collection<WalletTransaction>("wallet_transactions")
}

export async function recordWalletTransaction(data: {
  type: WalletTransactionType
  amount: number
  description: string
  recipientPhone?: string
  recipientName?: string
  initiatedBy: string
  initiatedByName: string
  reference?: string
  status?: WalletTransactionStatus
  intouchResponse?: any
}): Promise<string> {
  const collection = await getWalletCollection()
  const doc: Omit<WalletTransaction, "_id"> = {
    type: data.type,
    amount: data.amount,
    description: data.description,
    recipientPhone: data.recipientPhone,
    recipientName: data.recipientName,
    initiatedBy: data.initiatedBy,
    initiatedByName: data.initiatedByName,
    reference: data.reference,
    status: data.status || "completed",
    intouchResponse: data.intouchResponse,
    createdAt: new Date(),
  }
  const result = await collection.insertOne(doc as WalletTransaction)
  return result.insertedId.toString()
}

export async function getWalletTransactions(limit = 50): Promise<WalletTransaction[]> {
  const collection = await getWalletCollection()
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
}

export async function getWalletStats() {
  const collection = await getWalletCollection()
  const stats = await collection.aggregate([
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]).toArray()

  const result: Record<string, { total: number; count: number }> = {}
  for (const stat of stats) {
    result[stat._id] = { total: stat.totalAmount, count: stat.count }
  }

  // Calculate net: deposits - withdrawals - direct sends
  const totalDeposits = result.deposit?.total || 0
  const totalWithdrawals = result.withdraw?.total || 0
  const totalDirectSends = result.direct_send?.total || 0

  return {
    deposits: result.deposit || { total: 0, count: 0 },
    withdrawals: result.withdraw || { total: 0, count: 0 },
    directSends: result.direct_send || { total: 0, count: 0 },
    netBalance: totalDeposits - totalWithdrawals - totalDirectSends,
    totalDeposits,
    totalWithdrawals,
    totalDirectSends,
  }
}
