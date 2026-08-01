import { getAllUsers } from "@/lib/actions/superadmin"
import { getCurrentUser } from "@/lib/auth"
import UsersPageClient from "./UsersPageClient"

export const dynamic = 'force-dynamic'
export default async function UsersManagementPage() {
  const [users, currentUser] = await Promise.all([getAllUsers(), getCurrentUser()])

  return <UsersPageClient users={users} currentUserId={currentUser?._id ?? null} />
}
