import { Suspense } from "react"
import { getAllUsers } from "@/lib/actions/superadmin"
import DataExportsPageClient from "./DataExportsPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export default async function DataExportsPage() {
  const users = await getAllUsers()

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <DataExportsPageClient users={users} />
    </Suspense>
  )
}