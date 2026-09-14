import clientPromise from "@/lib/db"
import { ObjectId } from "mongodb"

const DB_NAME = "ntdm_animal_hospital"
const COLLECTION = "payment_audit_logs"

// ── Event Types ──────────────────────────────────────────────────────

export type PaymentAuditEventType =
  | "intouchpay_initiated"          // Payment request sent to IntouchPay
  | "intouchpay_callback_received"  // Async webhook callback received
  | "intouchpay_status_checked"     // Stale-pending re-verification
  | "pesapal_initiated"             // Payment created with Pesapal
  | "pesapal_ipn_received"          // Instant Payment Notification from Pesapal
  | "pesapal_verified"              // Browser redirect verification
  | "order_payment_status_checked"  // Poll endpoint status check

export type PaymentAuditMethod = "intouchpay" | "pesapal"

// ── Audit Log Entry ──────────────────────────────────────────────────

export interface PaymentAuditLog {
  _id: ObjectId
  /** Which event triggered this log entry */
  eventType: PaymentAuditEventType
  /** Our internal order ID */
  orderId: string
  /** The payment gateway used */
  paymentMethod: PaymentAuditMethod

  // ── Snapshot fields (captured at event time) ──
  amount?: number
  currency?: string
  buyerName?: string
  buyerPhone?: string

  // ── Gateway-specific identifiers ──
  intouchRequestTransactionId?: string
  intouchTransactionId?: string
  intouchReferenceNo?: string
  pesapalOrderTrackingId?: string
  pesapalMerchantReference?: string

  // ── Status transition ──
  previousStatus?: string
  newStatus?: string
  responseCode?: string

  // ── Free-form payload ──
  payload: Record<string, unknown>

  // ── Timestamp ──
  createdAt: Date
}

// ── Collection accessor ──────────────────────────────────────────────

async function getCollection() {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  return db.collection<PaymentAuditLog>(COLLECTION)
}

// ── Logging Helpers ──────────────────────────────────────────────────

interface BaseAuditData {
  orderId: string
  paymentMethod: PaymentAuditMethod
  amount?: number
  currency?: string
  buyerName?: string
  buyerPhone?: string
  previousStatus?: string
  newStatus?: string
  responseCode?: string
  intouchRequestTransactionId?: string
  intouchTransactionId?: string
  intouchReferenceNo?: string
  pesapalOrderTrackingId?: string
  pesapalMerchantReference?: string
  payload?: Record<string, unknown>
}

/**
 * Core function: writes a single audit log entry to the
 * `payment_audit_logs` collection.  Designed to never throw so
 * that a logging failure cannot break the payment flow itself.
 */
export async function logPaymentEvent(
  eventType: PaymentAuditEventType,
  data: BaseAuditData,
): Promise<void> {
  try {
    const collection = await getCollection()
    const entry: Omit<PaymentAuditLog, "_id"> = {
      eventType,
      orderId: data.orderId,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      currency: data.currency,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      responseCode: data.responseCode,
      intouchRequestTransactionId: data.intouchRequestTransactionId,
      intouchTransactionId: data.intouchTransactionId,
      intouchReferenceNo: data.intouchReferenceNo,
      pesapalOrderTrackingId: data.pesapalOrderTrackingId,
      pesapalMerchantReference: data.pesapalMerchantReference,
      payload: data.payload ?? {},
      createdAt: new Date(),
    }
    await collection.insertOne(entry as PaymentAuditLog)
  } catch (error) {
    // Logging must never break the caller — swallow and report.
    console.error("Failed to write payment audit log:", error)
  }
}

// ── Querying ─────────────────────────────────────────────────────────

export interface AuditLogQuery {
  orderId?: string
  eventType?: PaymentAuditEventType | PaymentAuditEventType[]
  paymentMethod?: PaymentAuditMethod
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  skip?: number
}

export async function queryPaymentAuditLogs(
  query: AuditLogQuery = {},
): Promise<PaymentAuditLog[]> {
  const mongoFilter: Record<string, unknown> = {}

  if (query.orderId) {
    mongoFilter.orderId = query.orderId
  }
  if (query.eventType) {
    mongoFilter.eventType = Array.isArray(query.eventType)
      ? { $in: query.eventType }
      : query.eventType
  }
  if (query.paymentMethod) {
    mongoFilter.paymentMethod = query.paymentMethod
  }
  if (query.dateFrom || query.dateTo) {
    const createdAtFilter: Record<string, Date> = {}
    if (query.dateFrom) createdAtFilter.$gte = query.dateFrom
    if (query.dateTo) createdAtFilter.$lte = query.dateTo
    mongoFilter.createdAt = createdAtFilter
  }

  const collection = await getCollection()
  return collection
    .find(mongoFilter)
    .sort({ createdAt: -1 })
    .skip(query.skip ?? 0)
    .limit(query.limit ?? 50)
    .toArray()
}
