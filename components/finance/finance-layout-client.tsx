"use client"

import { Home, Layers, FileBarChart, Wallet } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import StaffLayoutClient from "@/components/staff/staff-layout-client"
import StaffSidebar from "@/components/staff/staff-sidebar"
import StaffHeader from "@/components/staff/staff-header"

/**
 * The finance portal shell. Three pages, matching the spec: overview, income by
 * source, and reports.
 */
export default function FinanceLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useLanguage()

  const navItems = [
    { href: "/finance", label: t("finance.overview"), icon: <Home className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/finance/sources", label: t("finance.bySource"), icon: <Layers className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { href: "/finance/reports", label: t("finance.reports"), icon: <FileBarChart className="h-4 w-4 sm:h-5 sm:w-5" /> },
  ]

  return (
    <StaffLayoutClient
      sidebar={
        <StaffSidebar
          portalLabel={t("finance.portal")}
          homeHref="/finance"
          items={navItems}
          brandIcon={<Wallet className="h-5 w-5 sm:h-6 sm:w-6" />}
        />
      }
      header={
        <StaffHeader
          portalLabel={t("finance.portal")}
          tagline={t("finance.tagline")}
          homeHref="/finance"
          brandIcon={<Wallet className="h-6 w-6 sm:h-7 sm:w-7" />}
        />
      }
    >
      {children}
    </StaffLayoutClient>
  )
}
