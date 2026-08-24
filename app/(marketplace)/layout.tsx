import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/roles"
import MarketplaceLayoutClient from "@/components/marketplace/marketplace-layout-client"

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Two capabilities reach this portal, because listing management moved here from
  // the admin content screen and admins already had it. Reviewing posting requests
  // is the narrower one - the sidebar hides that page from anyone without it.
  const canReview = can(user?.role, "marketplace.requests.review")
  const canManage = can(user?.role, "marketplace.listings.manage")

  if (!user || (!canReview && !canManage)) {
    redirect("/login")
  }

  return <MarketplaceLayoutClient canReview={canReview}>{children}</MarketplaceLayoutClient>
}
