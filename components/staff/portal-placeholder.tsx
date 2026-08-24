"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Standing page for a portal route whose feature lands in a later phase. Keeps the
 * sidebar navigable instead of pointing at 404s, and gives each phase a file to
 * fill in rather than create.
 */
export default function PortalPlaceholder({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon?: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-gray-700">
            {icon}
            {t("staff.notYetAvailable")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{t("staff.notYetAvailableNote")}</p>
        </CardContent>
      </Card>
    </div>
  )
}
