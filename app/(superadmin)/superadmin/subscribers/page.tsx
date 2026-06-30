export const dynamic = "force-dynamic";
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import clientPromise from "@/lib/db"
import SubscribersPageClient from "./SubscribersPageClient"

export default async function SubscribersPage() {
  const user = await getCurrentUser()
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    redirect("/login")
  }

  const client = await clientPromise
  const db = client.db("ntdm_animal_hospital")
  const subscribers = await db
    .collection("newsletter_subscribers")
    .find({})
    .sort({ subscribedAt: -1 })
    .toArray()

  return (
    <SubscribersPageClient
      subscribers={subscribers.map((s) => ({
        _id: s._id.toString(),
        email: s.email as string,
        status: s.status as string,
        subscribedAt: (s.subscribedAt as Date).toISOString(),
        resubscribedAt: s.resubscribedAt ? (s.resubscribedAt as Date).toISOString() : undefined,
      }))}
    />
  )
}
