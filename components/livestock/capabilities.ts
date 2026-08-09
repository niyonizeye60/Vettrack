import type { ModulePermissions } from "@/lib/permissions"

/**
 * What the signed-in user may do with one farm's records, as the shared record
 * managers (insemination-manager, disease-manager) see it.
 *
 * The same components render in the farmer portal and in a veterinarian's delegated
 * view of a farm. The farmer gets full capabilities on their own farm; a vet gets
 * whatever the farmer granted. Keeping this as data - rather than branching on role
 * inside the components - is what lets one implementation serve both portals.
 */
export interface RecordCapabilities extends ModulePermissions {
  /** Restrict edit/delete to rows this user authored. Mirrors the grant's updateOwnOnly. */
  updateOwnOnly: boolean
  /** The acting user's id, used to evaluate updateOwnOnly against record.createdById. */
  currentUserId: string
  /** Acting user's display name - stamped onto exported PDF/report footers. */
  currentUserName: string
  /**
   * True when a veterinarian is working under a delegated grant rather than the
   * farmer working on their own farm.
   *
   * Drives the "who performed this procedure" field: the farmer picks a vet from a
   * roster, but a delegated vet IS the answer, so the field shows their own name
   * read-only. This is not a permission - it is the field having exactly one correct
   * value - and it matches what the server stores either way (see resolveFarmAccess
   * callers in the insemination/diseases routes, which stamp the grant holder's own
   * name on create and preserve the existing name on update).
   */
  isDelegate: boolean
}

/** Everything allowed - the farmer working on their own farm. */
export function ownerCapabilities(currentUserId: string, currentUserName = ""): RecordCapabilities {
  return {
    view: true, create: true, update: true, delete: true,
    updateOwnOnly: false,
    currentUserId,
    currentUserName,
    isDelegate: false,
  }
}

/**
 * Whether this user may edit/delete a specific row.
 *
 * Mirrors resolveFarmAccess() in lib/farm-access.ts so the UI never renders a button
 * the API would reject. Fails closed on legacy rows with no createdById, exactly as
 * the server does.
 */
export function canModify(
  can: RecordCapabilities,
  action: "update" | "delete",
  record: { createdById?: string | null } | null | undefined
): boolean {
  if (!can[action]) return false
  if (!can.updateOwnOnly) return true
  return !!record?.createdById && record.createdById === can.currentUserId
}
