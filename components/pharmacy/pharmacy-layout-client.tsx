"use client"

import { Bell, Home, Pill } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import StaffLayoutClient from "@/components/staff/staff-layout-client"
import StaffSidebar from "@/components/staff/staff-sidebar"
import StaffHeader from "@/components/staff/staff-header"
import NotificationBell from "@/components/staff/notification-bell"

/**
 * The pharmacy portal shell. A pharmacy's job here is narrow - ask for drugs to go on
 * the public pharmacy page and follow each request - so the nav is just that, plus
 * the notifications that tell it how each review went.
 */
export default function PharmacyLayoutClient({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()

  const navItems = [
    { href: "/pharmacy-portal", label: t("pharmacy.dashboard"), icon: <Home className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/pharmacy-portal/listings", label: t("pharmacy.myListings"), icon: <Pill className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/pharmacy-portal/notifications", label: t("notifications.title"), icon: <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <StaffLayoutClient
      sidebar={
        <StaffSidebar
          portalLabel={t("pharmacy.portal")}
          homeHref="/pharmacy-portal"
          items={navItems}
          brandIcon={<Pill className="h-5 w-5 sm:h-6 sm:w-6" />}
        />
      }
      header={
        <StaffHeader
          portalLabel={t("pharmacy.portal")}
          tagline={t("pharmacy.tagline")}
          homeHref="/pharmacy-portal"
          brandIcon={<Pill className="h-6 w-6 sm:h-7 sm:w-7" />}
          notifications={<NotificationBell role="pharmacy" viewAllHref="/pharmacy-portal/notifications" />}
        />
      }
    >
      {children}
    </StaffLayoutClient>
  )
}
