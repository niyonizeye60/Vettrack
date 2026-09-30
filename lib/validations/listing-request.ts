import { z } from "zod"
import { isDateString } from "@/lib/product-rules"

/**
 * What a seller submits when they ask Vettrack to put something on the marketplace.
 *
 * Three kinds go through this flow: a farmer's animal (published to "sales"), a
 * pharmacy's drug (published to "drugs") and a feed supplier's feed (published to
 * "feeds"). All share one queue, one review screen and one lifecycle; only the form
 * fields differ. Drugs and feed Vettrack sells itself are created directly by staff.
 */

export const LISTING_KINDS = ["animal", "drug", "feed"] as const
export type ListingKind = (typeof LISTING_KINDS)[number]

export function isListingKind(value: unknown): value is ListingKind {
  return typeof value === "string" && (LISTING_KINDS as readonly string[]).includes(value)
}

/** The storefront category each kind publishes into. */
export const LISTING_KIND_CATEGORY = { animal: "sales", drug: "drugs", feed: "feeds" } as const satisfies Record<ListingKind, string>

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

/** The values staff already use for feed they list themselves, and the feeds page filters on. */
export const FEED_TYPES = ["Hay", "Concentrates", "Minerals", "Supplements"] as const
export const FEED_QUALITIES = ["High", "Medium", "Low"] as const
export const FEED_TARGET_ANIMALS = ["Cattle", "Goats", "Sheep", "Poultry", "Pigs"] as const

/** What a feed supplier submits when it asks for a feed to go on the feeds storefront. */
export const feedRequestSchema = z.object({
  title: z.string().trim().min(3, "Give the feed a name").max(120),
  feedType: z.enum(FEED_TYPES, { errorMap: () => ({ message: "Choose the type of feed" }) }),
  // "" is "not stated": one enum rather than a union, so a bad value gets a readable message.
  quality: z.enum(["", ...FEED_QUALITIES], { errorMap: () => ({ message: "Choose the quality from the list" }) }).optional(),
  targetAnimal: z
    .enum(["", ...FEED_TARGET_ANIMALS], { errorMap: () => ({ message: "Choose the animal from the list" }) })
    .optional(),
  /** What one unit is - "50 kg bag", "bale". The price is per unit, so it is required. */
  unit: z.string().trim().min(1, "Say what one unit is, e.g. a 50 kg bag").max(40),
  proposedPrice: z.coerce.number().int("Enter a whole number").positive("Enter a price above zero").max(100_000_000),
  /** Units to sell; handled exactly like a drug's stock (see drugRequestSchema). */
  stock: z.coerce.number().int("Enter a whole number").min(1, "Enter how many you have in stock").max(MAX_STOCK),
  /**
   * Optional: hay and minerals often carry no date. When given, the same sell-by rules
   * as a drug apply - see assertListableExpiry in lib/db-listing-requests.ts.
   */
  expiryDate: expiryDateSchema.optional().or(z.literal("")),
  batchNumber: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Describe the feed in a sentence or two").max(2000),
  district: z.string().trim().min(1, "Choose a district"),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
  village: z.string().trim().max(80).optional().or(z.literal("")),
  photos: z.array(z.string().min(1)).min(1, "Add at least one photo").max(MAX_LISTING_PHOTOS),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
})

export type FeedRequestInput = z.infer<typeof feedRequestSchema>

/**
 * A seller correcting how many units of a published product it has - after restocking,
 * or after selling some in its own shop. Zero is allowed: it takes the product off its
 * storefront until there is stock again. Goes live at once, without review.
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
  | { kind: "feed"; data: FeedRequestInput }

const SUBMISSION_SCHEMAS = {
  animal: listingRequestSchema,
  drug: drugRequestSchema,
  feed: feedRequestSchema,
} as const satisfies Record<ListingKind, z.ZodTypeAny>

/** Validate a request body against the form for `kind`. */
export function parseSellerSubmission(
  kind: ListingKind,
  body: unknown
): { success: true; submission: SellerSubmission } | { success: false; error: string } {
  const parsed = SUBMISSION_SCHEMAS[kind].safeParse(body)
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
  "feedType", "quality", "targetAnimal", "unit",
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
  feedType: "content.feedType",
  quality: "content.quality",
  targetAnimal: "content.targetAnimal",
  unit: "feedSupplier.unit",
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
