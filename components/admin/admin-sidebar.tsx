"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Users, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Calendar,
  Home,
  X
} from "lucide-react"
import Image from "next/image"
import { useLanguage } from "@/contexts/LanguageContext"
import { useState, useEffect } from "react"

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [activeUsersCount, setActiveUsersCount] = useState(0)
  const [supportTickets, setSupportTickets] = useState(0)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin-dashboard')
        if (response.ok) {
          const data = await response.json()
          setActiveUsersCount(data.stats.activeUsers)
          setSupportTickets(data.stats.supportTickets)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    fetchStats()
  }, [])

  const navItems = [
    { name: t('admin.dashboard'), href: "/admin", icon: Home },
    { name: t('admin.users'), href: "/admin/users", icon: Users },
    { name: t('admin.content'), href: "/admin/content", icon: FileText },
    { name: t('admin.reports'), href: "/admin/reports", icon: BarChart3 },
    { name: t('admin.support'), href: "/admin/support", icon: MessageSquare },
    { name: t('admin.appointments'), href: "/admin/appointments", icon: Calendar },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 overflow-hidden">
              <Image
                src="/Group 2.svg?height=32&width=32&text=NTDM"
                alt="NTDM Logo"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{t('admin.panel')}</h2>
              <p className="text-xs text-gray-500">{t('admin.regionalManagement')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  "flex items-center px-3 py-3 mb-1 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-6 left-3 right-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">{t('admin.quickStats')}</p>
            <div className="flex justify-between text-xs">
              <span>{t('admin.activeUsersCount')} <strong>{activeUsersCount}</strong></span>
              <span>{t('admin.ticketsCount')} <strong>{supportTickets}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}