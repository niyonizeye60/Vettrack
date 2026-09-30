import { z } from "zod"
import { isDateString } from "@/lib/product-rules"

/**
 * What a seller submits when they ask Vettrack to put something on the marketplace.
 *
 * Two kinds go through this flow: a farmer's animal (published to "sales") and a
 * pharmacy's drug (published to "drugs"). Both share one queue, one review screen and
 * one lifecycle; only the form fields differ. Feed is still Vettrack's own stock,
 * created directly by staff, as are drugs Vettrack sells itself.
 */

export const LISTING_KINDS = ["animal", "drug"] as const
export type ListingKind = (typeof LISTING_KINDS)[number]

export function isListingKind(value: unknown): value is ListingKind {
  return typeof value === "string" && (LISTING_KINDS as readonly string[]).includes(value)
}

/** The storefront category each kind publishes into. */
export const LISTING_KIND_CATEGORY = { animal: "sales", drug: "drugs" } as const satisfies Record<ListingKind, string>

export const ANIMAL_TYPES = ["Cow", "Goat", "Sheep", "Pig", "Chicken", "Dog", "Cat"] as const
export const ANIMAL_SEXES = ["Male", "Female"] as const

export const LISTING_REQUEST_STATUSES = ["pending", "approved", "rejected", "withdrawn"] as const
export type ListingRequestStatus = (typeof LISTING_REQUEST_STATUSES)[number]

export const MAX_LISTING_PHOTOS = 6

export const listingRequestSchema = z.object({
  title: z.string().trim().min(3, "Give the listing a short title").max(120),
  animalType: z.enum(ANIMAL_TYPES, { errorMap: () => ({ message: "Choose the type of animal" }) }),
  breed: z.string().trim().max(80).optional().or(z.literal("")),
  age: z.string().trim().max(40).optional().or(z.literal("")),
  sex: z.enum(ANIMAL_SEXES).optional(),
  // The farmer's asking price. Whether the marketplace admin may change it before
  // publishing is still an open decision - today approve copies it through as-is.
  proposedPrice: z.coerce.number().int("Enter a whole number").positive("Enter a price above zero").max(100_000_000),
  description: z.string().trim().min(10, "Describe the animal in a sentence or two").max(2000),
  district: z.string().trim().min(1, "Choose a district"),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
  village: z.string().trim().max(80).optional().or(z.literal("")),
  photos: z.array(z.string().min(1)).min(1, "Add at least one photo").max(MAX_LISTING_PHOTOS),
  /** Optional exact spot from device GPS; district/sector center is used when absent. */
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  /** Optional link back to the farmer's own herd record. */
  animalId: z.string().trim().optional().or(z.literal("")),
})

export type ListingRequestInput = z.infer<typeof listingRequestSchema>

/** The values staff already use for drugs they list themselves (components/marketplace/listings-manager.tsx). */
export const DRUG_TYPES = ["Antibiotic", "Vaccine", "Dewormer", "Pain Relief", "Vitamins"] as const

export const MAX_STOCK = 1_000_000

/**
 * A product's expiry date, YYYY-MM-DD. How far away it must be depends on the sell-by
 * cutoff superadmin sets, which needs the database, so that check is made when the
 * request is saved (assertListableExpiry in lib/db-listing-requests.ts).
 */
export const expiryDateSchema = z
  .string({ required_error: "Enter the expiry date on the pack" })
  .trim()
  .refine(isDateString, "Enter the expiry date on the pack")

/** What a pharmacy submits when it asks for a drug to go on the pharmacy storefront. */
export const drugRequestSchema = z.object({
  title: z.string().trim().min(3, "Give the drug a name").max(120),
  drugType: z.enum(DRUG_TYPES, { errorMap: () => ({ message: "Choose the type of drug" }) }),
  usageDescription: z.string().trim().max(1000).optional().or(z.literal("")),
  proposedPrice: z.coerce.number().int("Enter a whole number").positive("Enter a price above zero").max(100_000_000),
  /**
   * Units the pharmacy has to sell. Copied onto the listing when it is approved; after
   * that the pharmacy keeps it up to date with stockUpdateSchema, and an edit of the
   * published listing leaves it alone.
   */
  stock: z.coerce.number().int("Enter a whole number").min(1, "Enter how many you have in stock").max(MAX_STOCK),
  /** The expiry printed on the pack. The drug stops selling a week before it - see lib/product-rules.ts. */
  expiryDate: expiryDateSchema,
  /** Batch / lot number on the pack, so a recalled batch can be traced. */
  batchNumber: z.string().trim().max(60).optional().or(z.literal("")),
  /** Rwanda FDA registration number of the product. */
  registrationNumber: z.string().trim().max(60).optional().or(z.literal("")),
  /** Only sold to a buyer who uploads a vet's prescription at checkout. */
  prescriptionRequired: z.boolean().default(false),
  description: z.string().trim().min(10, "Describe the drug in a sentence or two").max(2000),
  district: z.string().trim().min(1, "Choose a district"),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
  village: z.string().trim().max(80).optional().or(z.literal("")),
  photos: z.array(z.string().min(1)).min(1, "Add at least one photo").max(MAX_LISTING_PHOTOS),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
})

export type DrugRequestInput = z.infer<typeof drugRequestSchema>

/**
 * A pharmacy correcting how many units of a published drug it has - after restocking,
 * or after selling some in its own shop. Zero is allowed: it takes the drug off the
 * pharmacy page until there is stock again. Goes live at once, without review.
 */
export const stockUpdateSchema = z.object({
  stock: z.coerce.number().int("Enter a whole number").min(0, "Stock can't be below zero").max(MAX_STOCK),
  /** Warn the pharmacy when stock falls to this many units. */
  lowStockAt: z.coerce.number().int("Enter a whole number").min(0).max(MAX_STOCK).optional(),
})

/** A validated submission, tagged with its kind so the data layer knows which fields it carries. */
export type SellerSubmission =
  | { kind: "animal"; data: ListingRequestInput }
  | { kind: "drug"; data: DrugRequestInput }

/** Validate a request body against the form for `kind`. */
export function parseSellerSubmission(
  kind: ListingKind,
  body: unknown
): { success: true; submission: SellerSubmission } | { success: false; error: string } {
  const parsed = kind === "drug" ? drugRequestSchema.safeParse(body) : listingRequestSchema.safeParse(body)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid request" }
  }
  return { success: true, submission: { kind, data: parsed.data } as SellerSubmission }
}

/**
 * One field a seller changed on a published listing. Values are display strings so
 * the marketplace can show "from → to" without knowing each field's type; `photos`
 * carries counts and `gps` a "lat, lng" pair.
 */
export interface ListingChange {
  field: ListingChangeField
  from: string
  to: string
}

export interface ListingEditLogEntry {
  at: string
  changes: ListingChange[]
}

export const LISTING_CHANGE_FIELDS = [
  "title", "animalType", "breed", "age", "sex", "drugType", "usageDescription", "price", "description",
  "district", "sector", "village", "photos", "gps",
  "expiryDate", "batchNumber", "registrationNumber", "prescriptionRequired",
] as const
export type ListingChangeField = (typeof LISTING_CHANGE_FIELDS)[number]

/** Translation key for each changeable field, reusing the labels the request form already has. */
export const LISTING_CHANGE_LABEL_KEYS: Record<ListingChangeField, string> = {
  title: "listing.title",
  animalType: "listing.animalType",
  breed: "listing.breed",
  age: "listing.age",
  sex: "listing.sex",
  drugType: "content.drugType",
  usageDescription: "content.usageDescription",
  price: "listing.askingPrice",
  description: "listing.description",
  district: "listing.district",
  sector: "listing.sector",
  village: "listing.village",
  photos: "listing.photos",
  gps: "listing.locationPinned",
  expiryDate: "pharmacy.expiryDate",
  batchNumber: "pharmacy.batchNumber",
  registrationNumber: "pharmacy.registrationNumber",
  prescriptionRequired: "pharmacy.prescriptionRequired",
}

/** Marketplace admin's decision on a pending request. */
export const reviewDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    // Which storefront category the published listing lands in.
    categoryId: z.string().trim().min(1, "Choose a category"),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  z.object({
    decision: z.literal("reject"),
    note: z.string().trim().min(3, "Tell the seller why").max(500),
  }),
])

export type ReviewDecision = z.infer<typeof reviewDecisionSchema>

/**
 * A farmer asking marketplace staff to take their published listing down, e.g.
 * because the animal is sold or no longer for sale. Nothing happens until staff decide.
 */
export const REMOVAL_STATUSES = ["pending", "approved", "declined"] as const
export type RemovalStatus = (typeof REMOVAL_STATUSES)[number]

export const removalRequestSchema = z.object({
  reason: z.string().trim().max(300).optional().or(z.literal("")),
})

export const removalDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    note: z.string().trim().max(300).optional().or(z.literal("")),
  }),
  z.object({
    decision: z.literal("decline"),
    note: z.string().trim().min(3, "Tell the seller why").max(300),
  }),
])
