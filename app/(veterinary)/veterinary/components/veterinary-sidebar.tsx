"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  ClipboardList,
  Activity,
  Home,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"

export function VeterinarySidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { t, language } = useLanguage()

  const sidebarNavItems = [
    {
      title: t('vet.dashboard'),
      href: "/veterinary",
      icon: Home,
    },
    {
      title: t('vet.appointments'),
      href: "/veterinary/appointments",
      icon: Calendar,
    },
    {
      title: t('vet.patients'),
      href: "/veterinary/patients",
      icon: Users,
    },
    {
      title: t('vet.tracking'),
      href: "/veterinary/tracking",
      icon: Activity,
    },
    {
      title: t('vet.consultations'),
      href: "/veterinary/consultations",
      icon: ClipboardList,
    },
    {
      title: t('vet.messages'),
      href: "/veterinary/messages",
      icon: MessageSquare,
    },
    {
      title: t('vet.settings'),
      href: "/veterinary/settings",
      icon: Settings,
    },
  ]

  // Track screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
      // Auto-collapse on smaller desktop screens
      setCollapsed(window.innerWidth < 1280 && window.innerWidth >= 768)
    }

    // Initial check
    checkScreenSize()

    // Add listener for screen resize
    window.addEventListener('resize', checkScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
  }

  // Auto-collapse on mobile by default
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
    }
  }, [isMobile])

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden" 
          onClick={() => setCollapsed(true)}
        />
      )}
      
      <div className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300",
        isMobile ? (
          collapsed ? "-translate-x-full" : "translate-x-0 w-64"
        ) : (
          collapsed ? "w-16" : "w-64"
        )
      )}>
      <div className="flex min-h-16 h-auto items-start border-b px-2 py-3 justify-between">
        {!collapsed && (
          <Link href="/veterinary" className="flex items-start gap-1 font-semibold flex-1 pr-2">
            <span className={`text-primary leading-relaxed whitespace-normal word-break break-all ${
              language === 'rw' ? 'text-[10px]' : 'text-xs'
            }`}>{language === 'rw' ? 'Umuganga w\'Amatungo' : t('vet.portal')}</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn(
            "h-8 w-8 flex-shrink-0",
            collapsed && "mx-auto"
          )}
        >
          <Settings className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180"
          )} />
          <span className="sr-only">
            {collapsed ? t('vet.expandSidebar') : t('vet.collapseSidebar')}
          </span>
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium gap-1">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
            >
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  collapsed ? "h-10 w-10 p-0 justify-center" : "gap-2",
                  pathname === item.href && "bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && item.title}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </div>
    </>
  )
} 