/**
 * Which insemination records are live pregnancies. The insemination page, the
 * farmer dashboard and the animals page all count from here, so they always agree.
 * Dependency-free (bar a date helper) so client components can import it.
 */
import { kigaliToday } from "./product-rules"

export interface PregnancyRecord {
  _id: string
  animalId?: string | null
  date: string
  expectedBirthDate?: string | null
  deliveredBabies?: number | null
  pregnancyFailed?: boolean | null
}

/**
 * A record is a live pregnancy until the birth is recorded, the attempt is marked
 * failed (re-inseminating does this, but keeps the old expected birth date), or its
 * expected birth date has passed. The insemination form hides animals by this rule.
 */
export function isActivePregnancy(r: PregnancyRecord, today: string = kigaliToday()): boolean {
  return !!r.expectedBirthDate && r.expectedBirthDate >= today && !r.deliveredBabies && !r.pregnancyFailed
}

/**
 * The births still to come, soonest first: one per animal, since an animal carries
 * one pregnancy at a time. If an animal has two live records anyway (older data, or
 * two records entered offline), the most recent insemination is the one that counts.
 * Old records with no animal attached count one each.
 */
export function upcomingBirths<T extends PregnancyRecord>(records: T[], today: string = kigaliToday()): T[] {
  const byAnimal = new Map<string, T>()
  for (const r of records) {
    if (!isActivePregnancy(r, today)) continue
    const key = r.animalId || `record:${r._id}`
    const kept = byAnimal.get(key)
    if (!kept || r.date > kept.date) byAnimal.set(key, r)
  }
  return Array.from(byAnimal.values()).sort((a, b) =>
    (a.expectedBirthDate as string).localeCompare(b.expectedBirthDate as string)
  )
}
