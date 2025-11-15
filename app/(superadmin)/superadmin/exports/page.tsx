import { Suspense } from "react"
import { getAllUsers } from "@/lib/actions/superadmin"
import DataExportsPageClient from "./DataExportsPageClient"

export default async function DataExportsPage() {
  const users = await getAllUsers()

  return (
    <Suspense fallback={<div>Loading exports...</div>}>
      <DataExportsPageClient users={users} />
    </Suspense>
  )
}