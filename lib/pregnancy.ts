/**
 * Which insemination records are live pregnancies. The insemination page, the
 * farmer dashboard and the animals page all count from here, so they always agree.
 * public/offline.html can't import this and repeats the rule - keep the two in step.
 * Dependency-free (bar date helpers) so client components can import it.
 */
import { addDays, kigaliToday } from "./product-rules"

/**
 * How long past its expected date a birth is still awaited. A cow a few days late
 * is normal, and inseminating one that is still pregnant can make her lose the
 * calf, so she stays marked pregnant for a while. After that the birth most likely
 * happened and wasn't recorded, and she is freed so a forgotten record can't block
 * her for good.
 */
export const OVERDUE_GRACE_DAYS = 30

export interface PregnancyRecord {
  _id: string
  animalId?: string | null
  date: string
  expectedBirthDate?: string | null
  deliveredBabies?: number | null
  pregnancyFailed?: boolean | null
}

/**
 * A record is a live pregnancy until its outcome is recorded - any number of
 * babies, where 0 means the calf was lost - or the attempt is marked failed
 * (re-inseminating does this, but keeps the old expected birth date), or it is more
 * than OVERDUE_GRACE_DAYS past its expected date. The insemination form hides
 * animals by this rule.
 */
export function isActivePregnancy(r: PregnancyRecord, today: string = kigaliToday()): boolean {
  return (
    !!r.expectedBirthDate &&
    r.deliveredBabies == null &&
    !r.pregnancyFailed &&
    r.expectedBirthDate >= addDays(today, -OVERDUE_GRACE_DAYS)
  )
}

/** Past its expected birth date with no birth recorded yet. */
export function isOverdue(r: PregnancyRecord, today: string = kigaliToday()): boolean {
  return isActivePregnancy(r, today) && (r.expectedBirthDate as string) < today
}

/**
 * The births still awaited, one per animal since an animal carries one pregnancy at
 * a time, soonest first - split into those still to come (due today or later) and
 * those past their date. If an animal has two live records anyway (older data, or
 * two records entered offline), the most recent insemination is the one that
 * counts. Old records with no animal attached count one each.
 */
export function awaitedBirths<T extends PregnancyRecord>(
  records: T[],
  today: string = kigaliToday()
): { upcoming: T[]; overdue: T[] } {
  const byAnimal = new Map<string, T>()
  for (const r of records) {
    if (!isActivePregnancy(r, today)) continue
    const key = r.animalId || `record:${r._id}`
    const kept = byAnimal.get(key)
    if (!kept || r.date > kept.date) byAnimal.set(key, r)
  }
  const all = Array.from(byAnimal.values()).sort((a, b) =>
    (a.expectedBirthDate as string).localeCompare(b.expectedBirthDate as string)
  )
  return {
    upcoming: all.filter(r => (r.expectedBirthDate as string) >= today),
    overdue: all.filter(r => (r.expectedBirthDate as string) < today),
  }
}
