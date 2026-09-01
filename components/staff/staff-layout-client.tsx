"use client"

import { ReactNode } from "react"
import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { MobileSidebarProvider } from "@/components/staff/mobile-sidebar-context"

/**
 * The staff portal frame: suspension and session-timeout modals, sidebar rail,
 * header, scroll area. Portals supply their own sidebar and header and get
 * identical behaviour everywhere else.
 */
export default function StaffLayoutClient({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode
  header: ReactNode
  children: ReactNode
}) {
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
        {statusModal}
        {sessionModal}
        {sidebar}
        <div className="flex-1 flex flex-col min-w-0 print:block">
          {header}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:overflow-visible">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}
