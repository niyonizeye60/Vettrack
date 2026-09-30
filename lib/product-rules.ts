/**
 * Rules for products sold through the cart - drugs and feed, whether a pharmacy's or
 * Vettrack's own - that the browser and the server must agree on. Dependency-free so
 * both can import it, the same reason lib/commission.ts is split from its storage.
 */

/** At or below this many units, the public pages say how many are left instead of just "In stock". */
export const SHOW_UNITS_LEFT_AT = 5

/** Warn the seller once stock falls to this many units, unless they chose their own level. */
export const DEFAULT_LOW_STOCK_AT = 5

/**
 * The sell-by cutoff: a product stops selling this many days before it expires, so a
 * buyer never receives something that expires before they can use it. Superadmin
 * sets the real value on the Settings page (lib/db-settings.ts, getSellByDays); this
 * is what applies until they do.
 */
export const DEFAULT_SELL_BY_DAYS = 7
export const MAX_SELL_BY_DAYS = 365

/** A newly listed product must stay on sale at least this long before its cutoff. */
export const MIN_DAYS_ON_SALE = 30

/** How long before a product goes off sale its seller is warned. */
export const EXPIRY_WARNING_DAYS = 30

/** The expiry rules in force, as the server resolves them and /api/product-rules serves them. */
export interface ProductRules {
  sellByDays: number
  minDaysOnSale: number
}

export const DEFAULT_PRODUCT_RULES: ProductRules = {
  sellByDays: DEFAULT_SELL_BY_DAYS,
  minDaysOnSale: MIN_DAYS_ON_SALE,
}

/** Today's date in Kigali (UTC+2, no daylight saving) as YYYY-MM-DD. */
export function kigaliToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 2 * 3600_000).toISOString().slice(0, 10)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar date written YYYY-MM-DD - rejects 2026-02-31. */
export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The last day a product with this expiry date can be ordered. */
export function lastSellableDay(expiresOn: string, sellByDays: number = DEFAULT_SELL_BY_DAYS): string {
  return addDays(expiresOn, -sellByDays)
}

/**
 * The earliest expiry date a product can be listed with: one that keeps it on sale for
 * at least MIN_DAYS_ON_SALE after today.
 */
export function earliestAcceptableExpiry(
  sellByDays: number = DEFAULT_SELL_BY_DAYS,
  today: string = kigaliToday()
): string {
  return addDays(today, sellByDays + MIN_DAYS_ON_SALE)
}

export type ExpiryState = "none" | "ok" | "soon" | "unsellable"

/**
 * - `none`: no expiry date recorded
 * - `soon`: still on sale, but within EXPIRY_WARNING_DAYS of its cutoff
 * - `unsellable`: past the cutoff - off the public pages
 */
export function expiryState(
  expiresOn: string | null | undefined,
  sellByDays: number = DEFAULT_SELL_BY_DAYS,
  today: string = kigaliToday()
): ExpiryState {
  if (!expiresOn || !isDateString(expiresOn)) return "none"
  const last = lastSellableDay(expiresOn, sellByDays)
  if (today > last) return "unsellable"
  if (addDays(today, EXPIRY_WARNING_DAYS) >= last) return "soon"
  return "ok"
}

/** Units at or below the seller's warning level, but not yet sold out. */
export function isLowStock(available: number | null | undefined, lowStockAt: number | null | undefined): boolean {
  if (available == null) return false
  return available > 0 && available <= (lowStockAt ?? DEFAULT_LOW_STOCK_AT)
}

/** Screen text for each payment method an order can carry. */
export const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  intouchpay: "checkout.payWithIntouchPay",
  pesapal: "checkout.payWithPesapal",
}
