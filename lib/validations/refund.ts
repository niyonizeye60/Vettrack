import { z } from "zod"

/**
 * Refunds for paid cart orders.
 *
 * A pharmacy asks for one on its own items (it can't supply them, the prescription
 * doesn't hold up...), or finance starts one directly. Finance then pays the buyer back
 * through whatever channel they use and records it here - the app does not move the
 * money itself.
 */

export const REFUND_REASONS = [
  "out_of_stock",
  "prescription_invalid",
  "damaged_or_expired",
  "buyer_cancelled",
  "not_delivered",
  "other",
] as const
export type RefundReason = (typeof REFUND_REASONS)[number]

export const REFUND_METHODS = ["mobile_money", "bank_transfer", "cash", "other"] as const
export type RefundMethod = (typeof REFUND_METHODS)[number]

export const REFUND_STATUSES = ["requested", "completed", "declined"] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const REFUND_REASON_LABEL_KEYS: Record<RefundReason, string> = {
  out_of_stock: "refund.reasonOutOfStock",
  prescription_invalid: "refund.reasonPrescription",
  damaged_or_expired: "refund.reasonDamaged",
  buyer_cancelled: "refund.reasonBuyerCancelled",
  not_delivered: "refund.reasonNotDelivered",
  other: "refund.reasonOther",
}

export const REFUND_METHOD_LABEL_KEYS: Record<RefundMethod, string> = {
  mobile_money: "refund.methodMobileMoney",
  bank_transfer: "refund.methodBank",
  cash: "refund.methodCash",
  other: "refund.methodOther",
}

export const refundRequestSchema = z.object({
  orderId: z.string().trim().min(1, "Choose an order"),
  lines: z
    .array(
      z.object({
        serviceId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).max(999),
      })
    )
    .min(1, "Choose what to refund"),
  reason: z.enum(REFUND_REASONS, { errorMap: () => ({ message: "Choose a reason" }) }),
  note: z.string().trim().max(500).optional().or(z.literal("")),
})

export type RefundRequestInput = z.infer<typeof refundRequestSchema>

export const refundDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    method: z.enum(REFUND_METHODS, { errorMap: () => ({ message: "Choose how the buyer was paid back" }) }),
    reference: z.string().trim().min(2, "Enter the reference of the refund payment").max(100),
    /** Put the refunded units back on sale - only when they never left the shelf. */
    restock: z.boolean().default(false),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  z.object({
    action: z.literal("decline"),
    note: z.string().trim().min(3, "Say why the refund is declined").max(500),
  }),
])

export type RefundDecision = z.infer<typeof refundDecisionSchema>
