import { sectorCoordinates, districtCoordinates } from "./rwanda-coordinates"

/**
 * Location helpers built on GADM-derived sector coordinates.
 *
 * Everything degrades gracefully: an exact district+sector match wins, then a
 * sector name matched anywhere in Rwanda (sector names repeat across
 * districts), then the district's own point, then Kigali as a last resort.
 */

const KIGALI = { lat: -1.9441, lng: 30.0619 }

/**
 * Spelling variants used by the app's sector pickers that differ from the GADM
 * boundary names. Key is "<district>|<app-sector>", value is the GADM name.
 * Names without a good match resolve to the district center instead.
 */
const SECTOR_ALIASES: Record<string, string> = {
  "Burera|Rugendabari": "Rugengabari",
  "Kamonyi|Rugalika": "Runda", // nearest sector; no GADM match
  "Kirehe|Nyamugali": "Nyamugari",
  "Muhanga|Mukura": "Nyarusange", // nearest sector; no GADM match
  "Muhanga|Musambira": "Mushishiro", // nearest sector; no GADM match
  "Muhanga|Nyarubaka": "Kabacuzi", // nearest sector; no GADM match
  "Nyagatare|Mimuli": "Mimuri",
  "Nyagatare|Musheli": "Musheri",
  "Nyanza|Kibirizi": "Kibilizi",
  "Nyanza|Rwdhuha": "Muyira", // nearest sector; no GADM match
  "Nyarugenge|Mageragere": "Mageregere",
  "Ruhango|Muhanga": "Mwendo", // nearest sector; no GADM match
  "Rwamagana|Gishari": "Gishali",
  "Rwamagana|Nyakariro": "Nyakaliro",
  "Gisagara|Kibayi": "Kibirizi",
  "Rubavu|Nyakiliba": "Nyakiriba",
  "Rusizi|Gisuma": "Giheke", // nearest sector; no GADM match
}

export interface Coordinates {
  lat: number
  lng: number
}

/** Resolve a district/sector pair to coordinates, with layered fallbacks. */
export function resolveLocation(
  district?: string | null,
  sector?: string | null
): Coordinates | null {
  const d = district?.trim()
  const s = sector?.trim()

  if (d && s) {
    const aliasKey = `${d}|${s}`
    const gadmName = SECTOR_ALIASES[aliasKey] ?? s
    const hit = sectorCoordinates[d]?.[gadmName]
    if (hit) return hit
    // Sector names repeat across districts - try it anywhere, but only when
    // the name is unambiguous (appears in exactly one district).
    const candidates = Object.entries(sectorCoordinates)
      .map(([districtName, sectors]) => sectors[s] ? districtName : null)
      .filter((v): v is string => v !== null)
    if (candidates.length === 1) return sectorCoordinates[candidates[0]][s]
  }

  if (d && districtCoordinates[d]) return districtCoordinates[d]

  return KIGALI
}

export function districtCenter(district?: string | null): Coordinates {
  const d = district?.trim()
  return (d && districtCoordinates[d]) || KIGALI
}

export function allDistricts(): string[] {
  return Object.keys(districtCoordinates).sort()
}

/** Haversine distance in km between two lat/lng points. */
export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
