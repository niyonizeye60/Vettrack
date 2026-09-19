import { z } from "zod"

/**
 * What a farmer submits when they ask Vettrack to sell an animal for them.
 *
 * Only animals go through this flow. Feed and medicine are Vettrack's own stock and
 * are still created directly by staff - a farmer never requests those.
 */

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
    note: z.string().trim().min(3, "Tell the farmer why").max(500),
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
    note: z.string().trim().min(3, "Tell the farmer why").max(300),
  }),
])
