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
  category: string
  count: number
  items: ActivitySummaryItem[]
}

const CATEGORY_LABELS: Record<string, string> = {
  livestock: "Livestock & Farm Records",
  consultation: "Consultations",
  employee: "Employees",
  marketplace: "Marketplace",
  support: "Support",
}

// Session/account bookkeeping (login, logout, password changes, avatar
// uploads, vet-access grants...) isn't a farm activity - only the domains
// listed in CATEGORY_LABELS above represent something done on the farm.
export function isTrackedActivity(action: string): boolean {
  const domain = action.split(".")[0]
  return domain in CATEGORY_LABELS
}

function categoryLabel(action: string): string {
  const domain = action.split(".")[0]
  return CATEGORY_LABELS[domain] || "Other"
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

export function buildActivitySummaryGroups(logs: ActivityLogEntry[]): ActivitySummaryGroup[] {
  const byCategory = new Map<string, ActivitySummaryItem[]>()
  for (const log of logs) {
    if (!isTrackedActivity(log.action)) continue
    const category = categoryLabel(log.action)
    if (!byCategory.has(category)) byCategory.set(category, [])
    byCategory.get(category)!.push({
      label: actionLabel(log.action),
      details: log.details || "",
      time: new Date(log.createdAt).toISOString(),
    })
  }
  return Array.from(byCategory.entries())
    .map(([category, items]) => ({ category, count: items.length, items }))
    .sort((a, b) => b.count - a.count)
}
