// Where a vaccine or medicine went into the animal. Shared by the vaccination and
// treatment-dose forms so both suggest the same places.
//
// Like vaccine routes, a site picked from the list is stored in English and shown in
// the reader's language (keys "injectionSite.<site>" in LanguageContext). Anything
// else the user types is kept exactly as typed.

export const INJECTION_SITES = ["Neck", "Shoulder", "Rump / Hip", "Thigh", "Ear base", "Brisket", "Tail fold"]

type Translate = (key: string) => string

/** A stored site, in the reader's language. */
export function injectionSiteLabel(t: Translate, value?: string | null) {
  if (!value) return ""
  const key = `injectionSite.${value}`
  const label = t(key)
  return label === key ? value : label
}

/** What the user typed, turned back into the stored English name when it's one of ours. */
export function injectionSiteValue(t: Translate, input: string) {
  const typed = input.trim()
  const lower = typed.toLowerCase()
  const known = INJECTION_SITES.find(s => s.toLowerCase() === lower || injectionSiteLabel(t, s).toLowerCase() === lower)
  return known || typed
}
