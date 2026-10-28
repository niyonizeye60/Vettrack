import { cookies } from "next/headers"
import type { Db, Document, WithId } from "mongodb"
import { withDbRetry } from "@/lib/db"

export type OfflineFarmer =
  | { status: 401 | 403 }
  | { status: 200; user: WithId<Document>; session: WithId<Document> }

/**
 * The signed-in farmer, for the routes behind the phone's offline copy and the records
 * it keeps to send later (app/api/offline/*).
 *
 * Looked up here rather than with getCurrentUser, which returns null on a database
 * error too. The phone acts on a 401 or 403: it deletes its copy, or holds the records
 * until the farmer signs in again. So these mean only "signed out" or "not allowed",
 * and a database error throws instead (the route answers 500, and the phone tries
 * again later).
 */
export async function getOfflineFarmer(db: Db, fields: string[] = []): Promise<OfflineFarmer> {
  const sessionId = cookies().get("session")?.value
  if (!sessionId) return { status: 401 }

  const session = await withDbRetry(() =>
    db.collection("sessions").findOne({ sessionId, expiresAt: { $gt: new Date() } })
  )
  if (!session) return { status: 401 }
  const projection = Object.fromEntries(["role", "status", ...fields].map((field) => [field, 1]))
  const user = await withDbRetry(() => db.collection("users").findOne({ _id: session.userId }, { projection }))
  if (!user) return { status: 401 }
  // Same accounts that may sign in (lib/actions/auth.ts loginUser).
  if (user.role !== "farmer" || (user.status && user.status !== "active")) return { status: 403 }

  return { status: 200, user, session }
}
