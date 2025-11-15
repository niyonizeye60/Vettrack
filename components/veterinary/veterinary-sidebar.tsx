"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  Calendar,
  ClipboardCheck,
  Activity,
  Stethoscope,
  MessageSquare,
  Settings,
  Heart,
  X,
  PawPrint
} from "lucide-react"

interface VeterinarySidebarProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

export function VeterinarySidebar({ isOpen, onClose, isMobile }: VeterinarySidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  const sidebarNavItems = [
    { title: t('vet.dashboard'), href: "/veterinary", icon: Stethoscope, color: "text-blue-600" },
    { title: t('vet.appointments'), href: "/veterinary/appointments", icon: Calendar, color: "text-green-600" },
    { title: t('vet.patients'), href: "/veterinary/patients", icon: Heart, color: "text-red-500" },
    { title: t('vet.tracking'), href: "/veterinary/tracking", icon: Activity, color: "text-purple-600" },
    { title: t('vet.consultations'), href: "/veterinary/consultations", icon: ClipboardCheck, color: "text-orange-600" },
    { title: t('vet.messages'), href: "/veterinary/messages", icon: MessageSquare, color: "text-indigo-600" },
    { title: t('vet.settings'), href: "/veterinary/settings", icon: Settings, color: "text-gray-600" },
  ]

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-blue-100 shadow-xl transition-transform duration-300 ease-in-out",
      isMobile ? (
        isOpen ? "translate-x-0" : "-translate-x-full"
      ) : (
        "translate-x-0"
      )
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <Link href="/veterinary" className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <PawPrint className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-blue-700">{t('vet.portal')}</span>
            <p className="text-xs text-blue-500">Animal Hospital</p>
          </div>
        </Link>
        
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {sidebarNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105"
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-white/20" 
                  : "bg-gray-100 group-hover:bg-white"
              )}>
                <item.icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-white" : item.color
                )} />
              </div>
              <span className={cn(
                "font-medium",
                isActive ? "text-white" : "text-gray-700"
              )}>{item.title}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
              )}
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Heart className="h-3 w-3 text-red-400" />
          <span>Caring for animals with love</span>
        </div>
      </div>
    </aside>
  )
}