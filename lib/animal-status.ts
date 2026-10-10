/** An animal's health status is stored in English; this labels it in the reader's language. */
const ANIMAL_STATUS_KEYS: Record<string, string> = {
  Healthy: "farmer.healthy",
  Sick: "farmer.sick",
  "Under Treatment": "farmer.underTreatment",
  Deceased: "farmer.deceased",
}

export function animalStatusLabel(status: string | null | undefined, t: (key: string) => string): string {
  if (!status) return ""
  const key = ANIMAL_STATUS_KEYS[status]
  return key ? t(key) : status
}
