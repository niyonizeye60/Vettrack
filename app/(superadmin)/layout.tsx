import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import SuperAdminSidebar from "@/components/superadmin/super-admin-sidebar"
import SuperAdminHeader from "@/components/superadmin/super-admin-header"
import SuperAdminLayoutClient from "@/components/superadmin/superadmin-layout-client"
import { MobileSidebarProvider } from "@/components/superadmin/mobile-sidebar-context"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== "superadmin") {
    redirect("/login")
  }

  return (
    <SuperAdminLayoutClient>
      <MobileSidebarProvider>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <SuperAdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <SuperAdminHeader user={user} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </MobileSidebarProvider>
    </SuperAdminLayoutClient>
  )
}