// On-site check for insemination/disease/vaccination CRUD: the acting farmer or vet
// must currently be in the farm's registered sector. This is a business-rule control,
// not a hard security boundary - client-reported GPS can be spoofed - so it exists to
// catch honest mistakes and to give farmers/vets an explainable reason ("this can only
// be done in Gisozi sector"), not to withstand a determined attacker.

import { sectorCoordinates } from "./rwanda-coordinates"
import { calcDistance, gadmSectorName } from "./rwanda-geo"

export interface ActorPosition {
  lat: number
  lng: number
  /** Accuracy radius in meters, as reported by navigator.geolocation. Unused by the
   *  sector check itself (sectors are km-scale), kept for logging/debugging. */
  accuracy?: number | null
}

export interface NearestSector {
  district: string
  sector: string
  distanceKm: number
}

/**
 * Reverse-geocode a live GPS point to the closest of Rwanda's 417 sectors.
 *
 * Only centroids are available (lib/rwanda-coordinates.ts), not real boundary
 * polygons, so this is nearest-neighbour classification rather than point-in-polygon:
 * right at a sector's edge it can occasionally pick the neighbouring sector, since
 * real sector shapes are irregular and unequal in size.
 */
export function findNearestSector(lat: number, lng: number): NearestSector | null {
  let best: NearestSector | null = null
  for (const [district, sectors] of Object.entries(sectorCoordinates)) {
    for (const [sector, point] of Object.entries(sectors)) {
      const distanceKm = calcDistance(lat, lng, point.lat, point.lng)
      if (!best || distanceKm < best.distanceKm) best = { district, sector, distanceKm }
    }
  }
  return best
}

export type SectorMatchStatus = "match" | "mismatch" | "unavailable" | "not_registered"

export interface SectorMatchResult {
  status: SectorMatchStatus
  nearestSector: NearestSector | null
}

/**
 * Check whether an actor's live position falls within the farmer's registered sector.
 *
 * `not_registered` means the farmer's own profile has no district/sector on file -
 * callers decide how to treat that (this module stays policy-free).
 */
export function checkSectorMatch(
  registeredDistrict: string | null | undefined,
  registeredSector: string | null | undefined,
  actor: ActorPosition | null
): SectorMatchResult {
  const district = registeredDistrict?.trim()
  const sector = registeredSector?.trim()
  if (!district || !sector) return { status: "not_registered", nearestSector: null }

  if (!actor || typeof actor.lat !== "number" || typeof actor.lng !== "number") {
    return { status: "unavailable", nearestSector: null }
  }

  const nearestSector = findNearestSector(actor.lat, actor.lng)
  if (!nearestSector) return { status: "unavailable", nearestSector: null }

  const expectedGadmName = gadmSectorName(district, sector) ?? sector
  const isMatch = nearestSector.district === district && nearestSector.sector === expectedGadmName

  return { status: isMatch ? "match" : "mismatch", nearestSector }
}
