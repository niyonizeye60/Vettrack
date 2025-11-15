"use client"

import { useState } from "react"
import AdminSidebar from "@/components/admin/admin-sidebar"
import AdminHeader from "@/components/admin/admin-header"
import { useUserStatus } from "@/hooks/useUserStatus"
import { useSessionTimeout } from "@/hooks/useSessionTimeout"
import { LanguageProvider } from "@/contexts/LanguageContext"

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const statusModal = useUserStatus()
  const sessionModal = useSessionTimeout()

  return (
    <LanguageProvider>
      <div className="flex h-screen bg-gray-50">
        {statusModal}
        {sessionModal}
        <AdminSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  )
}