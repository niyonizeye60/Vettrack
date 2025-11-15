import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminLayoutClient from "@/components/admin/admin-layout-client"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== "admin") {
    redirect("/login")
  }

  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  )
}