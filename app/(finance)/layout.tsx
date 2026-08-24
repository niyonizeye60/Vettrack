import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/roles"
import FinanceLayoutClient from "@/components/finance/finance-layout-client"

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Financial data is restricted to authorised roles (NFR: Security). Capability
  // rather than a role list - superadmin qualifies without being named here.
  if (!user || !can(user.role, "finance.view")) {
    redirect("/login")
  }

  return <FinanceLayoutClient>{children}</FinanceLayoutClient>
}
