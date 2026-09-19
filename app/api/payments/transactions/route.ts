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

/** Booking collection stores buyer/name and payment refs at the top level. */
interface BookingQuery {
  paymentMethod?: OrderPaymentMethod | { $exists: boolean }
  paymentStatus?: OrderPaymentStatus
  name?: { $regex: string; $options: string }
  phone?: { $regex: string; $options: string }
  intouchRequestTransactionId?: { $regex: string; $options: string }
  pesapalOrderTrackingId?: { $regex: string; $options: string }
  createdAt?: { $gte?: Date; $lte?: Date }
  $or?: Array<Record<string, { $regex: string; $options: string }>>
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "superadmin") {
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

    // Mirror the filters for bookings, whose buyer name / payment refs live at
    // the top level rather than under buyer.*/payment.*.
    const bookingQuery: BookingQuery = {
      paymentMethod: { $exists: true },
    }
    if (method) bookingQuery.paymentMethod = method
    if (status) bookingQuery.paymentStatus = status
    if (search) {
      bookingQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { intouchRequestTransactionId: { $regex: search, $options: "i" } },
        { pesapalOrderTrackingId: { $regex: search, $options: "i" } },
      ]
    }
    if (query.createdAt) bookingQuery.createdAt = query.createdAt

    const sortField =
      sortBy === "amount" ? "total" : sortBy === "status" ? "paymentStatus" : sortBy === "method" ? "paymentMethod" : "createdAt"
    const bookingSortField =
      sortBy === "amount" ? "servicePrice" : sortBy === "status" ? "paymentStatus" : sortBy === "method" ? "paymentMethod" : "createdAt"

    const [total, orders, bookingTotal, bookings] = await Promise.all([
      db.collection("orders").countDocuments(query),
      db
        .collection("orders")
        .find(query)
        .sort({ [sortField]: sortOrder })
        .toArray(),
      db.collection("bookings").countDocuments(bookingQuery),
      db
        .collection("bookings")
        .find(bookingQuery)
        .sort({ [bookingSortField]: sortOrder })
        .toArray(),
    ])

    // Merge both sources into one timeline, newest first, then paginate.
    interface TxRow {
      id: string
      orderId: string
      kind: "order" | "booking"
      buyer: { name: string; phone: string; email?: string }
      items: Array<{ name: string; quantity: number; lineTotal: number }>
      subtotal?: number
      total: number
      currency: string
      paymentMethod: OrderPaymentMethod
      paymentStatus: OrderPaymentStatus
      payment: {
        intouchRequestTransactionId?: string
        intouchTransactionId?: string
        intouchReferenceNo?: string
        intouchVerifiedVia?: string
        pesapalOrderTrackingId?: string
        pesapalMerchantReference?: string
      }
      createdAt: Date
      paidAt?: Date
      status: string
    }

    const orderRows: TxRow[] = orders.map((order) => ({
      id: order._id.toString(),
      orderId: order._id.toString(),
      kind: "order" as const,
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
        intouchVerifiedVia: order.payment?.intouchVerifiedVia,
        pesapalOrderTrackingId: order.payment?.pesapalOrderTrackingId,
        pesapalMerchantReference: order.payment?.pesapalMerchantReference,
      },
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      status: order.status,
    }))

    const bookingRows: TxRow[] = bookings.map((b) => ({
      id: b._id.toString(),
      orderId: b._id.toString(),
      kind: "booking" as const,
      buyer: { name: b.name ?? "Booking customer", phone: b.phone ?? "", email: b.email ?? undefined },
      items: [
        {
          name: `Consultation: ${b.service ?? "service"}${b.animalType ? ` (${b.animalType})` : ""}`,
          quantity: 1,
          lineTotal: b.servicePrice ?? 100,
        },
      ],
      total: b.servicePrice ?? 100,
      currency: "RWF",
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      payment: {
        intouchRequestTransactionId: b.intouchRequestTransactionId,
        intouchTransactionId: b.intouchTransactionId,
        intouchReferenceNo: b.intouchReferenceNo,
        intouchVerifiedVia: b.intouchVerifiedVia,
        pesapalOrderTrackingId: b.pesapalOrderTrackingId,
        pesapalMerchantReference: b.pesapalMerchantReference,
      },
      createdAt: b.createdAt,
      paidAt: b.paidAt,
      status: b.bookingStatus,
    }))

    const merged = [...orderRows, ...bookingRows]
      .sort((a, b) =>
        sortOrder === 1
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    const paged = merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return NextResponse.json({
      transactions: paged,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: total + bookingTotal,
        totalPages: Math.ceil((total + bookingTotal) / PAGE_SIZE),
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
