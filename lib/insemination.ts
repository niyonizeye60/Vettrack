// How an insemination record was done: with semen (artificial insemination) or with a
// bull (natural mating). Records saved before the choice existed have no method and
// were all semen. public/offline.html repeats these rules by hand - keep it in step.

export type InseminationMethod = "semen" | "bull"

export function inseminationMethod(r: { method?: string | null }): InseminationMethod {
  return r.method === "bull" ? "bull" : "semen"
}

type CostFields = { semenPrice?: number | null; bullPrice?: number | null; vetPrice?: number | null }

// What the farmer paid for one record: the semen or the bull, plus the vet. Takes a
// raw Mongo document too, as the reports read them.
export function inseminationCost(record: CostFields | Record<string, any>): number {
  const r = record as CostFields
  return (r.semenPrice || 0) + (r.bullPrice || 0) + (r.vetPrice || 0)
}

// The fields that depend on the method, as they're stored: a bull record has no semen
// and a semen record has no bull, whatever the form sent.
export function methodFields(body: {
  method?: unknown
  semenTypes?: unknown
  semenPrice?: unknown
  bullName?: unknown
  bullPrice?: unknown
}) {
  const method = inseminationMethod({ method: typeof body.method === "string" ? body.method : null })
  const price = (v: unknown) => (v ? Number(v) : null)
  if (method === "bull") {
    const name = typeof body.bullName === "string" ? body.bullName.trim().slice(0, 100) : ""
    return { method, semenTypes: [] as string[], semenPrice: null, bullName: name || null, bullPrice: price(body.bullPrice) }
  }
  return {
    method,
    semenTypes: Array.isArray(body.semenTypes) ? body.semenTypes.filter((s): s is string => typeof s === "string") : [],
    semenPrice: price(body.semenPrice),
    bullName: null,
    bullPrice: null,
  }
}
