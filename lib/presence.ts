// Shared "is this user online right now" logic, used by every route that shows
// an online badge or decides whether to fire an offline-only notification.
// A user only counts as online if their heartbeat is fresh AND they haven't
// been explicitly marked offline (logout, idle auto-logout, tab close) - the
// explicit flag lets us flip someone to "offline" immediately instead of
// waiting for their last heartbeat to go stale.
export const ONLINE_THRESHOLD_MS = 60 * 1000

export interface PresenceDoc {
  isOnline?: boolean
  lastActiveAt?: Date | string | null
}

export function isPresenceOnline(presence: PresenceDoc | null | undefined): boolean {
  if (!presence?.lastActiveAt) return false
  if (presence.isOnline === false) return false
  return Date.now() - new Date(presence.lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
}
