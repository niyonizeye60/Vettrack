"use client"

import { Bell, Home, Receipt, Wheat } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import StaffLayoutClient from "@/components/staff/staff-layout-client"
import StaffSidebar from "@/components/staff/staff-sidebar"
import StaffHeader from "@/components/staff/staff-header"
import NotificationBell from "@/components/staff/notification-bell"

/**
 * The feed supplier portal shell - the pharmacy portal's, for feed. A supplier asks for
 * its feed to go on the public feeds page, keeps its stock up to date and sees what
 * sold, plus the notifications that tell it how each review went and when something
 * sells.
 */
export default function FeedSupplierLayoutClient({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()

  const navItems = [
    { href: "/feed-supplier", label: t("pharmacy.dashboard"), icon: <Home className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/feed-supplier/listings", label: t("feedSupplier.myListings"), icon: <Wheat className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/feed-supplier/sales", label: t("pharmacy.sales"), icon: <Receipt className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/feed-supplier/notifications", label: t("notifications.title"), icon: <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <StaffLayoutClient
      sidebar={
        <StaffSidebar
          portalLabel={t("feedSupplier.portal")}
          homeHref="/feed-supplier"
          items={navItems}
          brandIcon={<Wheat className="h-5 w-5 sm:h-6 sm:w-6" />}
        />
      }
      header={
        <StaffHeader
          portalLabel={t("feedSupplier.portal")}
          tagline={t("feedSupplier.tagline")}
          homeHref="/feed-supplier"
          brandIcon={<Wheat className="h-6 w-6 sm:h-7 sm:w-7" />}
          notifications={<NotificationBell role="feed_supplier" viewAllHref="/feed-supplier/notifications" />}
        />
      }
    >
      {children}
    </StaffLayoutClient>
  )
}
