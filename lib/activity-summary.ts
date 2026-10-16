import { dayStart, dayEnd } from "./finance-period"

export interface ActivityLogEntry {
  action: string
  details?: string
  createdAt: Date | string
}

export interface ActivitySummaryItem {
  label: string
  details: string
  time: string
}

export interface ActivitySummaryGroup {
  /** Stable id for the UI to translate the heading by; `category` is the English label the email uses. */
  key: string
  category: string
  count: number
  items: ActivitySummaryItem[]
}

// Session/account bookkeeping (login, logout, password changes, avatar
// uploads, vet-access grants...) isn't a farm activity - only these domains
// represent something done on the farm.
const TRACKED_DOMAINS = ["livestock", "consultation", "employee", "marketplace", "support"]

const CATEGORY_LABELS: Record<string, string> = {
  milk: "Milk Production",
  health: "Animal Health",
  breeding: "Breeding & Calves",
  animals: "Animals",
  finance: "Sales & Expenses",
  livestock: "Other Farm Records",
  consultation: "Consultations",
  employee: "Employees",
  marketplace: "Marketplace",
  support: "Support",
}

// "livestock.*" covers most of the farm, so it is split by record type. First
// prefix match wins - "milking_expense" has to come before "milk", and
// "animal_expense" before "animal".
const LIVESTOCK_CATEGORIES: [prefix: string, key: string][] = [
  ["milking_expense", "milk"],
  ["milk", "milk"],
  ["disease", "health"],
  ["vaccination", "health"],
  ["treatment", "health"],
  ["insemination", "breeding"],
  ["calf", "breeding"],
  ["animal_expense", "finance"],
  ["animal", "animals"],
  ["transaction", "finance"],
  ["waste", "finance"],
]

export function isTrackedActivity(action: string): boolean {
  return TRACKED_DOMAINS.includes(action.split(".")[0])
}

function categoryKey(action: string): string {
  const [domain, subject = ""] = action.split(".")
  if (domain !== "livestock") return domain
  return LIVESTOCK_CATEGORIES.find(([prefix]) => subject.startsWith(prefix))?.[1] ?? "livestock"
}

// logActivity() actions follow a "domain.subject_verb" convention (e.g.
// "livestock.milk_logged") - turn the verb part into a readable label.
function actionLabel(action: string): string {
  const verbPart = action.split(".").pop() || action
  const words = verbPart.replace(/_/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Rwanda-local yyyy-mm-dd for "today" - Vercel runs in UTC, farmers are in Kigali (UTC+2, no DST). */
export function todayRwandaDateString(): string {
  const rwandaNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  return `${rwandaNow.getUTCFullYear()}-${String(rwandaNow.getUTCMonth() + 1).padStart(2, "0")}-${String(rwandaNow.getUTCDate()).padStart(2, "0")}`
}

export function todayRwandaRange(): { start: Date; end: Date } {
  const today = todayRwandaDateString()
  return { start: dayStart(today), end: dayEnd(today) }
}

/** Current hour in Kigali time (0-23), for time-of-day gates that don't need minute precision. */
export function currentRwandaHour(): number {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).getUTCHours()
}

/** yyyy-mm-dd shifted by whole days - for "yesterday" comparisons against record dates. */
export function shiftDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split("T")[0]
}

export function buildActivitySummaryGroups(logs: ActivityLogEntry[]): ActivitySummaryGroup[] {
  const byCategory = new Map<string, ActivitySummaryItem[]>()
  for (const log of logs) {
    if (!isTrackedActivity(log.action)) continue
    const key = categoryKey(log.action)
    if (!byCategory.has(key)) byCategory.set(key, [])
    byCategory.get(key)!.push({
      label: actionLabel(log.action),
      details: log.details || "",
      time: new Date(log.createdAt).toISOString(),
    })
  }
  return Array.from(byCategory.entries())
    .map(([key, items]) => ({ key, category: CATEGORY_LABELS[key] || "Other", count: items.length, items }))
    .sort((a, b) => b.count - a.count)
}
