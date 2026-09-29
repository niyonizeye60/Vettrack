/**
 * Calf age, and when a calf is old enough to move into the animals herd.
 *
 * Shared by the calves page (age column, "Ready to move" badge and banner) and the
 * reminder sweep in lib/calf-graduation-reminders.ts, so the page and the
 * notification can never disagree about which calves are due.
 */

/** Age, in calendar months, at which a calf is prompted to move into the animals herd. */
export const CALF_GRADUATION_AGE_MONTHS = 8

/**
 * Whole calendar months between birthDate (YYYY-MM-DD) and `on`: a calf born on
 * 15 January is 1 month old on 15 February. Counted in UTC, like the rest of the
 * calves page's dates.
 */
export function ageInMonths(birthDate: string, on: Date = new Date()): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  let months = (on.getUTCFullYear() - birth.getUTCFullYear()) * 12 + (on.getUTCMonth() - birth.getUTCMonth())
  if (on.getUTCDate() < birth.getUTCDate()) months--
  return Math.max(0, months)
}

interface CalfLike {
  status?: string | null
  birthDate?: string | null
  graduatedToAnimalId?: string | null
}

/**
 * A calf still on the farm (active or weaned, not already moved) that has reached
 * CALF_GRADUATION_AGE_MONTHS. Sold and deceased calves are never due.
 */
export function isReadyToGraduate(calf: CalfLike, on: Date = new Date()): boolean {
  if (calf.status !== "active" && calf.status !== "weaned") return false
  if (calf.graduatedToAnimalId || !calf.birthDate) return false
  return ageInMonths(calf.birthDate, on) >= CALF_GRADUATION_AGE_MONTHS
}
