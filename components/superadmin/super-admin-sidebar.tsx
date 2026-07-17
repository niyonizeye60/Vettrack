"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useMobileSidebar } from "./mobile-sidebar-context"
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  PawPrint,
  BarChart3,
  Edit3,
  Bell,
  Download,
  ShieldAlert,
  Mail,
  Menu,
} from "lucide-react"

export default function SuperAdminSidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { mobileOpen, setMobileOpen } = useMobileSidebar()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => {
      setIsMobile(window.innerWidth < 768)
      setCollapsed(window.innerWidth < 1024)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const navItems = [
    { href: "/superadmin", label: t('superadmin.dashboard'), icon: <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/analytics", label: t('superadmin.analytics') || 'Analytics', icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/content", label: t('superadmin.contentManagement') || 'Content', icon: <Edit3 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/notifications", label: t('superadmin.notifications') || 'Notifications', icon: <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/exports", label: t('superadmin.dataExports') || 'Data Exports', icon: <Download className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/users", label: t('superadmin.manageUsers'), icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/consultations", label: t('superadmin.reviewConsultations'), icon: <FileText className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/moderation", label: t('superadmin.chatModeration') || 'Chat Moderation', icon: <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/subscribers", label: t('superadmin.newsletterSubscribers') || 'Subscribers', icon: <Mail className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/superadmin/settings", label: t('superadmin.settings'), icon: <Settings className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  const showSidebar = (isMobile && mobileOpen) || !isMobile

  if (!mounted) return null

  return (
    <>
      {showSidebar && (
        <div className={`${isMobile ? "fixed inset-0 z-[60]" : "sticky top-0 h-screen z-30"} flex`}>
          {isMobile && (
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          )}

          <nav className={`
            ${collapsed ? "w-16" : "w-64"}
            ${isMobile ? "w-64 ml-0" : ""}
            bg-white shadow-lg z-10 transition-all duration-300
            flex flex-col h-full border-r border-gray-200 relative
          `}>
            {/* Brand header */}
            <div className="h-16 px-3 sm:px-4 border-b border-gray-100 flex items-center justify-between gap-2">
              {(!collapsed || isMobile) && (
                <div className="flex items-center gap-2 min-w-0">
                  <PawPrint className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                  <span className="font-bold text-gray-900 text-base sm:text-lg leading-tight tracking-tight min-w-0">
                    {t('superadmin.superAdmin') || 'Super Admin'}
                  </span>
                </div>
              )}
              {!isMobile && (
                <button
                  onClick={() => setCollapsed(c => !c)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Toggle sidebar"
                >
                  <Menu className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transform transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {/* Nav items */}
            <ul className="space-y-2 pt-3 flex-1 overflow-y-auto px-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/superadmin"
                    ? pathname === "/superadmin"
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      className={`
                        flex items-center py-2.5 px-3 rounded-lg text-sm font-medium
                        ${collapsed && !isMobile ? "justify-center" : "gap-3"}
                        ${isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }
                        transition-colors duration-150
                      `}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 text-xs text-gray-500">
              {(!collapsed || isMobile) && (
                <p className="text-center sm:text-left">© {new Date().getFullYear()} {t('superadmin.superAdmin') || 'Super Admin'}</p>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
