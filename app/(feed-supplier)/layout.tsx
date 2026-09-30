import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/roles"
import FeedSupplierLayoutClient from "@/components/feed-supplier/feed-supplier-layout-client"

export const dynamic = "force-dynamic"

export default async function FeedSupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Capability rather than role name, like the other portals. A suspended supplier
  // keeps no access through a session opened before the suspension.
  if (!user || !can(user.role, "marketplace.feeds.request") || user.status === "suspended") {
    redirect("/login")
  }

  return <FeedSupplierLayoutClient>{children}</FeedSupplierLayoutClient>
}
