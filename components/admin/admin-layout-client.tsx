"use client"

import AdminSidebar from "@/components/admin/admin-sidebar"
import AdminHeader from "@/components/admin/admin-header"
import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { MobileSidebarProvider } from "@/components/admin/mobile-sidebar-context"

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        {statusModal}
        {sessionModal}
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 print:block">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:overflow-visible">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}