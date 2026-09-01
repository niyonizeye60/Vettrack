"use client"

import { Home, Inbox, Store, Tag } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import StaffLayoutClient from "@/components/staff/staff-layout-client"
import StaffSidebar from "@/components/staff/staff-sidebar"
import StaffHeader from "@/components/staff/staff-header"

/**
 * The marketplace portal shell. Nav mirrors the marketplace admin's actual job:
 * review what farmers ask to post, then manage what is live. Browse stays on the
 * public storefront - it is not rebuilt here.
 */
export default function MarketplaceLayoutClient({
  children,
  canReview,
}: {
  children: React.ReactNode
  /** Admins reach this portal for listings but do not review posting requests. */
  canReview: boolean
}) {
  const { t } = useLanguage()

  const navItems = [
    { href: "/marketplace", label: t("marketplace.dashboard"), icon: <Home className="h-4 w-4 sm:h-5 sm:w-5" /> },
    ...(canReview
      ? [{ href: "/marketplace/requests", label: t("marketplace.requests"), icon: <Inbox className="h-4 w-4 sm:h-5 sm:w-5" /> }]
      : []),
    { href: "/marketplace/listings", label: t("marketplace.listings"), icon: <Tag className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <StaffLayoutClient
      sidebar={
        <StaffSidebar
          portalLabel={t("marketplace.portal")}
          homeHref="/marketplace"
          items={navItems}
          brandIcon={<Store className="h-5 w-5 sm:h-6 sm:w-6" />}
        />
      }
      header={
        <StaffHeader
          portalLabel={t("marketplace.portal")}
          tagline={t("marketplace.tagline")}
          homeHref="/marketplace"
          brandIcon={<Store className="h-6 w-6 sm:h-7 sm:w-7" />}
        />
      }
    >
      {children}
    </StaffLayoutClient>
  )
}
