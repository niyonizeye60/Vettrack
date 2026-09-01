/**
 * The connection-fee maths, kept free of any database import so the browser can use
 * the same implementation the server charges with.
 *
 * This matters: the finance screen shows a worked example of what a buyer will pay
 * before the rate is saved. If that preview were its own copy of the formula it
 * could drift from the real one, and finance would be configuring a fee they cannot
 * actually see. Storage lives in lib/db-commission-rules.ts.
 */

export type CommissionMode = "percent" | "flat"

export interface ResolvedRule {
  mode: CommissionMode
  value: number
  minFee: number | null
  maxFee: number | null
  /** False when no rule has been configured and the built-in default is standing in. */
  configured: boolean
}

/**
 * Used until finance configures a real rule. Deliberately conservative: a small
 * percentage with a floor, so an unconfigured system never charges nothing and
 * never charges a shocking amount on an expensive animal.
 */
export const DEFAULT_COMMISSION_RULE: ResolvedRule = {
  mode: "percent",
  value: 3,
  minFee: 2000,
  maxFee: 50000,
  configured: false,
}

/**
 * The fee for connecting a buyer to the seller of an animal at `animalPrice`.
 *
 * Always at least 1 RWF - a zero-value payment can't be initiated with either
 * gateway, and a free connection would defeat the point.
 */
export function computeFee(
  rule: Pick<ResolvedRule, "mode" | "value" | "minFee" | "maxFee">,
  animalPrice: number
): number {
  const raw = rule.mode === "percent" ? (animalPrice * rule.value) / 100 : rule.value

  let fee = Math.round(raw)
  // Min/max only bound a percentage - a flat fee is already the exact amount, so a
  // leftover minFee/maxFee from a rule that was previously in percent mode must not
  // silently clamp it.
  if (rule.mode === "percent") {
    if (rule.minFee != null) fee = Math.max(fee, rule.minFee)
    if (rule.maxFee != null) fee = Math.min(fee, rule.maxFee)
  }

  return Math.max(1, fee)
}
