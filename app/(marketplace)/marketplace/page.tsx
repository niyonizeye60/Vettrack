"use client"

import { Store } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import PortalPlaceholder from "@/components/staff/portal-placeholder"

export default function MarketplaceDashboardPage() {
  const { t } = useLanguage()
  return (
    <PortalPlaceholder
      title={t("marketplace.dashboard")}
      description={t("marketplace.dashboardDesc")}
      icon={<Store className="h-4 w-4" />}
    />
  )
}
