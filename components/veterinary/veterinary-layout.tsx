"use client"

import { useState, useEffect } from "react"
import { VeterinaryHeader } from "./veterinary-header"
import { VeterinarySidebar } from "./veterinary-sidebar"

export function VeterinaryLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false) // Close sidebar when switching to desktop
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <VeterinarySidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        isMobile={isMobile}
      />

      {/* Main content */}
      <div className={`${isMobile ? '' : 'lg:ml-64'} flex flex-col min-h-screen`}>
        <VeterinaryHeader onMenuClick={toggleSidebar} />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}