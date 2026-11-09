/**
 * Feeding plan rules the expenses page and the server must agree on. Dependency-free so
 * the browser can import it, the same reason lib/product-rules.ts is split out. The
 * storage and the daily recording live in lib/feeding-plans.ts.
 */

/**
 * Longest plan a farmer can set up in one go. Records are written a day at a time, so a
 * mistyped end year wouldn't write a year of records at once, but it would quietly keep
 * adding them long after the farmer forgot the plan.
 */
export const MAX_FEEDING_PLAN_DAYS = 90

export const RATION_FIELDS = ["foodKg", "foodCost", "waterLiters", "waterCost", "saltKg", "saltCost"] as const
export type RationField = (typeof RATION_FIELDS)[number]

/** One animal's daily feed, water and salt, and what they cost. Blank fields are null. */
export type FeedingRation = Record<RationField, number | null>

/** What a day of this ration costs - the amount each record is saved with. */
export function rationTotal(ration: Partial<Record<RationField, unknown>> | undefined): number {
  return (Number(ration?.foodCost) || 0) + (Number(ration?.waterCost) || 0) + (Number(ration?.saltCost) || 0)
}

/** The key a ration is stored under: the animal's type, lowercased (as the Feed Defaults are). */
export function feedingTypeOf(type: unknown): string {
  return (typeof type === "string" && type ? type : "other").toLowerCase()
}

/**
 * Whether an animal gets its feed recorded on the Animal Expenses tab. A lactating cow's
 * feed is recorded with her milk in Milk Production instead, and a dead animal isn't fed.
 */
export function canGetFeedRecords(animal: { type?: unknown; lactationStatus?: unknown; status?: unknown }): boolean {
  if (animal.status === "Deceased") return false
  return !(animal.type === "cow" && animal.lactationStatus === "lactating")
}

/** Days from `start` to `end`, both included. Dates are YYYY-MM-DD. */
export function planDayCount(start: string, end: string): number {
  const ms = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()
  return Math.round(ms / 86_400_000) + 1
}
