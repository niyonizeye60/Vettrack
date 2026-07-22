export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { ObjectId } from "mongodb"
import type { OrderPaymentStatus, OrderPaymentMethod } from "@/lib/db-orders"

const DB_NAME = "ntdm_animal_hospital"
const PAGE_SIZE = 20

interface TransactionQuery {
  paymentMethod?: OrderPaymentMethod | { $exists: boolean }
  paymentStatus?: OrderPaymentStatus
  "buyer.name"?: { $regex: string; $options: string }
  "buyer.phone"?: { $regex: string; $options: string }
  "payment.intouchRequestTransactionId"?: { $regex: string; $options: string }
  "payment.pesapalOrderTrackingId"?: { $regex: string; $options: string }
  createdAt?: { $gte?: Date; $lte?: Date }
  $or?: Array<Record<string, { $regex: string; $options: string }>>
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const method = searchParams.get("method") as OrderPaymentMethod | null
    const status = searchParams.get("status") as OrderPaymentStatus | null
    const search = searchParams.get("search") || ""
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1

    const client = await clientPromise
    const db = client.db(DB_NAME)

    const query: TransactionQuery = {
      paymentMethod: { $exists: true },
    }

    if (method) {
      query.paymentMethod = method
    }

    if (status) {
      query.paymentStatus = status
    }

    if (search) {
      query.$or = [
        { "buyer.name": { $regex: search, $options: "i" } },
        { "buyer.phone": { $regex: search, $options: "i" } },
        { "payment.intouchRequestTransactionId": { $regex: search, $options: "i" } },
        { "payment.pesapalOrderTrackingId": { $regex: search, $options: "i" } },
      ]
    }

    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        query.createdAt.$lte = end
      }
    }

    const sortField = sortBy === "amount" ? "total" : sortBy === "status" ? "paymentStatus" : sortBy === "method" ? "paymentMethod" : "createdAt"

    const [total, orders] = await Promise.all([
      db.collection("orders").countDocuments(query),
      db.collection("orders")
        .find(query)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(),
    ])

    const transactions = orders.map((order) => ({
      id: order._id.toString(),
      orderId: order._id.toString(),
      buyer: order.buyer,
      items: order.items,
      subtotal: order.subtotal,
      total: order.total,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      payment: {
        intouchRequestTransactionId: order.payment?.intouchRequestTransactionId,
        intouchTransactionId: order.payment?.intouchTransactionId,
        intouchReferenceNo: order.payment?.intouchReferenceNo,
        pesapalOrderTrackingId: order.payment?.pesapalOrderTrackingId,
        pesapalMerchantReference: order.payment?.pesapalMerchantReference,
      },
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      status: order.status,
    }))

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
