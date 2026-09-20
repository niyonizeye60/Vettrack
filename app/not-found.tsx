"use client"

import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import ServicesBanner from "@/components/services/services-banner"

// Next renders this for any URL that matches no route, and for notFound() calls with no
// closer not-found file. It sits inside the root layout, so the public header is on top
// of it - and that header is transparent until the page scrolls, so the page needs the
// hero banner under it or the nav links are white on white.
export default function NotFound() {
  const { t } = useLanguage()

  return (
    <>
      <ServicesBanner title={t('notFound.title')} subtitle={t('notFound.subtitle')} />

      <div className="min-h-[50vh] bg-gray-50 py-12">
        <div className="container-custom">
          <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <SearchX className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{t('notFound.hint')}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/">{t('common.goHome')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/services">{t('notFound.browseServices')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
