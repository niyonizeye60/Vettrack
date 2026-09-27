import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/roles"
import PharmacyLayoutClient from "@/components/pharmacy/pharmacy-layout-client"

export const dynamic = "force-dynamic"

export default async function PharmacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Capability rather than role name, like the other portals. A suspended pharmacy
  // keeps no access through a session opened before the suspension.
  if (!user || !can(user.role, "marketplace.drugs.request") || user.status === "suspended") {
    redirect("/login")
  }

  return <PharmacyLayoutClient>{children}</PharmacyLayoutClient>
}
