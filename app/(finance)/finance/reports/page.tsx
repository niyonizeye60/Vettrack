import { getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/roles"
import FinanceReportsClient from "@/components/finance/finance-reports-client"

export default async function FinanceReportsPage() {
  const user = await getCurrentUser()
  return <FinanceReportsClient canExport={can(user?.role, "finance.export")} />
}
