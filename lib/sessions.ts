import { ObjectId, type Db } from "mongodb"

/**
 * Signs users out everywhere. Suspending or deactivating an account calls this, so the
 * account loses access straight away rather than when its session would have run out.
 */
export async function endUserSessions(db: Db, userIds: (string | ObjectId)[]) {
  const ids = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
  if (ids.length === 0) return 0

  const { deletedCount } = await db.collection("sessions").deleteMany({ userId: { $in: ids } })
  await db.collection("users").updateMany({ _id: { $in: ids } }, { $set: { isOnline: false, lastLogoutAt: new Date() } })
  // The online badge reads presence, not users (see lib/presence.ts).
  await db.collection("presence").updateMany({ _id: { $in: ids } } as any, { $set: { isOnline: false } })
  return deletedCount
}
