/**
 * The six income categories the financial dashboard reports on.
 *
 * Dependency-free so the finance pages and the server share one definition - the
 * same reason lib/commission.ts exists separately from lib/db-commission-rules.ts.
 *
 * Three of these have no source data anywhere in the app yet: consultations carry no
 * fee field, subscriptions don't exist, and device orders don't exist. They are
 * declared here from the start so the ledger, the summaries and the exports all have
 * a fixed shape - those categories simply report zero until the modules that produce
 * them are built.
 */

export const INCOME_SOURCES = [
  "marketplace_animal",
  "marketplace_feed",
  "marketplace_medicine",
  "consultation",
  "subscription",
  "device",
] as const

export type IncomeSource = (typeof INCOME_SOURCES)[number]

export function isIncomeSource(value: unknown): value is IncomeSource {
  return typeof value === "string" && (INCOME_SOURCES as readonly string[]).includes(value)
}

/** Translation keys, so the labels stay bilingual like the rest of the app. */
export const INCOME_SOURCE_LABEL_KEYS: Record<IncomeSource, string> = {
  marketplace_animal: "finance.sourceAnimal",
  marketplace_feed: "finance.sourceFeed",
  marketplace_medicine: "finance.sourceMedicine",
  consultation: "finance.sourceConsultation",
  subscription: "finance.sourceSubscription",
  device: "finance.sourceDevice",
}

/**
 * Chart colours, fixed per source so a category keeps the same colour everywhere it
 * appears and a filter that hides sources never repaints the survivors.
 *
 * These are categorical slots 1-6 of a validated palette, assigned in declaration
 * order. An earlier hand-picked set of greens and blues was rejected: three of them
 * sat at normal-vision ΔE 11 against each other - indistinguishable even to full
 * colour vision, before considering colour blindness - and five read as grey.
 *
 * Every value below is text-labelled in the UI as well, which is what makes the
 * lighter slots legible against a white surface.
 */
export const INCOME_SOURCE_COLORS: Record<IncomeSource, string> = {
  marketplace_animal: "#2a78d6",
  marketplace_feed: "#eb6834",
  marketplace_medicine: "#1baf7a",
  consultation: "#eda100",
  subscription: "#e87ba4",
  device: "#008300",
}

/**
 * Sources where Vettrack brokers rather than sells, so gross and revenue differ.
 *
 * An animal sale moves the whole asking price between two people, but Vettrack's
 * income is only the connection fee. Reporting the asking price as income would
 * overstate revenue by roughly twentyfold, which is why every entry carries both
 * numbers and every total sums platformRevenue.
 */
export const BROKERED_SOURCES: readonly IncomeSource[] = ["marketplace_animal"]

export function isBrokered(source: IncomeSource): boolean {
  return BROKERED_SOURCES.includes(source)
}
