import { z } from "zod"
import { isDateString } from "@/lib/product-rules"
import { MAX_STOCK } from "@/lib/validations/listing-request"

/**
 * The stock, expiry and regulation fields staff set on Vettrack's own drugs and feed
 * (and may correct on a pharmacy's drug) in the marketplace listings screen.
 *
 * Each field is optional because the screen only sends what it shows: stock only
 * when staff changed it, so saving an unrelated edit can't put back a count that
 * sales have since lowered.
 *
 * An empty string clears a field. Blank stock is refused for drugs and feed by the
 * services route - every product sold through the cart counts its units.
 */
const optionalCount = z.union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(MAX_STOCK)]).optional()

export const productFieldsSchema = z.object({
  stock: optionalCount,
  lowStockAt: optionalCount,
  expiresOn: z
    .union([z.literal(""), z.null(), z.string().trim().refine(isDateString, "Enter the expiry date as YYYY-MM-DD")])
    .optional(),
  batchNumber: z.string().trim().max(60).optional(),
  registrationNumber: z.string().trim().max(60).optional(),
  prescriptionRequired: z.boolean().optional(),
})

export type ProductFields = z.infer<typeof productFieldsSchema>

/** Fields only the server writes; stripped from anything staff send. */
export const SERVER_ONLY_PRODUCT_FIELDS = [
  "stockHolds",
  "available",
  "stockUpdatedAt",
  "lowStockNotifiedAt",
  "expiryWarnedAt",
  "expiryHiddenNotifiedAt",
] as const

/**
 * Split validated product fields into what to $set and what to $unset on a service
 * document. `expiresOn` or `stock` sent as blank are removed, so the listing stops
 * being checked for expiry or counting units.
 */
export function productFieldUpdates(fields: ProductFields): { set: Record<string, unknown>; unset: Record<string, ""> } {
  const set: Record<string, unknown> = {}
  const unset: Record<string, ""> = {}
  const apply = (key: string, value: unknown) => {
    if (value === undefined) return
    if (value === "" || value === null) unset[key] = ""
    else set[key] = value
  }
  apply("stock", fields.stock)
  apply("lowStockAt", fields.lowStockAt)
  apply("expiresOn", fields.expiresOn)
  if (fields.batchNumber !== undefined) set.batchNumber = fields.batchNumber
  if (fields.registrationNumber !== undefined) set.registrationNumber = fields.registrationNumber
  if (fields.prescriptionRequired !== undefined) set.prescriptionRequired = fields.prescriptionRequired
  // A new count or a new expiry date is a fresh start for the matching warnings.
  // Checkout holds are left alone: those buyers keep their units.
  if ("stock" in set || "lowStockAt" in set) unset.lowStockNotifiedAt = ""
  if (fields.expiresOn !== undefined) {
    unset.expiryWarnedAt = ""
    unset.expiryHiddenNotifiedAt = ""
  }
  return { set, unset }
}
