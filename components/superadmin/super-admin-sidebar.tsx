"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings,
  Shield,
  BarChart3,
  Edit3,
  Bell,
  Download
} from "lucide-react"



interface SuperAdminSidebarProps {
  onNavigate?: () => void // For mobile menu close functionality
}

export default function SuperAdminSidebar({ onNavigate }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const navigation = [
    {
      name: t('superadmin.dashboard'),
      href: "/superadmin",
      icon: LayoutDashboard,
    },
    {
      name: t('superadmin.analytics') || 'Analytics',
      href: "/superadmin/analytics",
      icon: BarChart3,
    },
    {
      name: t('superadmin.contentManagement') || 'Content',
      href: "/superadmin/content",
      icon: Edit3,
    },
    {
      name: t('superadmin.notifications') || 'Notifications',
      href: "/superadmin/notifications",
      icon: Bell,
    },
    {
      name: t('superadmin.dataExports') || 'Data Exports',
      href: "/superadmin/exports",
      icon: Download,
    },
    {
      name: t('superadmin.manageUsers'),
      href: "/superadmin/users",
      icon: Users,
    },
    {
      name: t('superadmin.reviewConsultations'),
      href: "/superadmin/consultations",
      icon: FileText,
    },
    {
      name: t('superadmin.settings'),
      href: "/superadmin/settings",
      icon: Settings,
    },
  ]

  const handleNavClick = () => {
    // Close mobile menu when navigating (if callback provided)
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out",
                "hover:scale-[1.02] active:scale-[0.98]",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-600"
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.name}</span>
              {/* Active indicator */}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer section - Only visible on larger screens */}
      <div className="hidden lg:block p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Shield className="h-4 w-4" />
          <span>{t('superadmin.systemControlPanel')}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Version 1.0</p>
      </div>
    </div>
  )
}