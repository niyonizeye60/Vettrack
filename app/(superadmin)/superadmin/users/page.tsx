import { getAllUsers } from "@/lib/actions/superadmin"
import UsersPageClient from "./UsersPageClient"

export const dynamic = 'force-dynamic'
export default async function UsersManagementPage() {
  const users = await getAllUsers()

  return <UsersPageClient users={users} />
}
