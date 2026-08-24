/**
 * Period selection shared by all three finance pages.
 *
 * Pure, so the pages and any future server-side report can resolve a period the same
 * way. Dates are handled as yyyy-mm-dd strings because that is what the income API
 * takes and what a date input produces.
 */

export const PERIOD_PRESETS = ["this_month", "last_month", "this_year", "custom"] as const
export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

export const PERIOD_LABEL_KEYS: Record<PeriodPreset, string> = {
  this_month: "finance.thisMonth",
  last_month: "finance.lastMonth",
  this_year: "finance.thisYear",
  custom: "finance.customRange",
}

export interface DateRange {
  from: string
  to: string
}

function iso(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function resolvePreset(preset: PeriodPreset, custom?: DateRange): DateRange {
  const now = new Date()

  switch (preset) {
    case "this_month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) }
    case "last_month":
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        // Day 0 of this month is the last day of the previous one.
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    case "this_year":
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) }
    case "custom":
      return custom && custom.from && custom.to
        ? custom
        : { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) }
  }
}

/**
 * Rwanda is UTC+2 year round, with no daylight saving.
 *
 * Period boundaries are pinned to it explicitly because the browser picking a date
 * and the server reading it are in different timezones - Vercel runs in UTC. Parsing
 * "2026-08-01" as UTC midnight would put it at 02:00 Kigali, so a sale made at
 * 00:30 on the first of the month would fall outside a report for that month.
 */
export const RWANDA_UTC_OFFSET = "+02:00"

/** Inclusive start of a yyyy-mm-dd day in Rwanda time. */
export function dayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000${RWANDA_UTC_OFFSET}`)
}

/** Inclusive end of a yyyy-mm-dd day in Rwanda time. */
export function dayEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999${RWANDA_UTC_OFFSET}`)
}

/** RWF has no minor unit in practice, so amounts are whole numbers throughout. */
export function formatRwf(amount: number): string {
  return `RWF ${Math.round(amount).toLocaleString()}`
}
