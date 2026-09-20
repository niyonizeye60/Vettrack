"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"
import { reportClientError } from "@/lib/actions"
import { isPortalPath } from "@/lib/roles"

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()
  const pathname = usePathname()

  useEffect(() => {
    reportClientError(error.message, error.stack).catch(() => {})
  }, [error])

  const icon = (
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
      <AlertTriangle className="h-7 w-7 text-red-600" />
    </div>
  )

  const actions = (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={() => reset()}>{t('common.tryAgain')}</Button>
      <Button variant="outline" onClick={() => { window.location.href = "/" }}>
        {t('common.goHome')}
      </Button>
    </div>
  )

  // Portals draw their own frame and no public header, so there is nothing to clear and
  // the plain centred layout is right for them.
  if (isPortalPath(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center space-y-4">
          {icon}
          <h1 className="text-xl font-bold text-gray-900">{t('error.title')}</h1>
          <p className="text-sm text-gray-500">{t('error.desc')}</p>
          {actions}
        </div>
      </div>
    )
  }

  // On public pages the header is transparent until the page scrolls, so the page needs
  // the hero banner under it or the nav links are white on white.
  return (
    <>
      <ServicesBanner title={t('error.title')} subtitle={t('error.desc')} />

      <div className="min-h-[50vh] bg-gray-50 py-12">
        <div className="container-custom">
          <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            {icon}
            {actions}
          </div>
        </div>
      </div>
    </>
  )
}
