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
