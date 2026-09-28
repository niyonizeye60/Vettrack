import clientPromise, { withDbRetry } from "./db"

// System-wide on/off switch for the on-farm sector check (lib/geofence.ts, enforced by
// verifyOnFarmLocation in lib/farm-access.ts). Stored on the same system_settings
// "global" document as the rest of the superadmin Settings page, but written only by
// setFarmLocationRestriction in lib/actions/superadmin.ts so every change is audited -
// updateSystemSettings drops these fields from its input.

const DB = "ntdm_animal_hospital"

export const FARM_LOCATION_RESTRICTION_FIELDS = [
  "farmLocationRestrictionEnabled",
  "farmLocationRestrictionUpdatedAt",
  "farmLocationRestrictionUpdatedBy",
] as const

// system_settings uses a plain string _id ("global"), not an ObjectId.
export interface FarmLocationRestrictionDoc {
  _id: string
  farmLocationRestrictionEnabled?: boolean
  farmLocationRestrictionUpdatedAt?: Date
  farmLocationRestrictionUpdatedBy?: { id: string; name: string }
}

export interface FarmLocationRestrictionStatus {
  enabled: boolean
  updatedAt: string | null
  updatedByName: string | null
}

export async function getFarmLocationRestrictionStatus(): Promise<FarmLocationRestrictionStatus> {
  const client = await clientPromise
  const doc = await withDbRetry(() =>
    client.db(DB).collection<FarmLocationRestrictionDoc>("system_settings").findOne(
      { _id: "global" },
      { projection: { farmLocationRestrictionEnabled: 1, farmLocationRestrictionUpdatedAt: 1, farmLocationRestrictionUpdatedBy: 1 } }
    )
  )
  return {
    // A missing field means ON: the restriction predates this setting, so a database
    // that has never been toggled keeps enforcing it.
    enabled: doc?.farmLocationRestrictionEnabled !== false,
    updatedAt: doc?.farmLocationRestrictionUpdatedAt ? new Date(doc.farmLocationRestrictionUpdatedAt).toISOString() : null,
    updatedByName: doc?.farmLocationRestrictionUpdatedBy?.name ?? null,
  }
}

/**
 * Whether farm-record writes must pass the on-farm sector check.
 *
 * Fails CLOSED: if the setting can't be read the restriction stays on, so a database
 * hiccup can never silently switch the check off.
 */
export async function isFarmLocationRestrictionEnabled(): Promise<boolean> {
  try {
    return (await getFarmLocationRestrictionStatus()).enabled
  } catch (error) {
    console.error("Error reading farm location restriction setting:", error)
    return true
  }
}
