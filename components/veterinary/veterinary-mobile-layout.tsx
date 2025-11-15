"use client"

import { useState, useEffect } from "react"
import { VeterinaryHeader } from "@/app/(veterinary)/veterinary/components/veterinary-header"
import { VeterinarySidebar } from "@/app/(veterinary)/veterinary/components/veterinary-sidebar"

export default function VeterinaryMobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-screen bg-background">
      <VeterinarySidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        <VeterinaryHeader onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}