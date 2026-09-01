"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Phone, Clock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface Quote {
  feeAmount: number
  animalPrice: number
  available: boolean
  status: "active" | "reserved" | "sold" | "withdrawn"
}

/**
 * The buy action for an animal.
 *
 * There is no cart here: the buyer pays Vettrack a connection fee, which unlocks the
 * seller's details and holds the animal, and then agrees the animal's own price with
 * the seller directly. Saying so plainly on the button is the whole point - the fee
 * has to be understood before it is paid, and it is not refundable.
 */
export default function ConnectCta({ listingId }: { listingId: string }) {
  const { t } = useLanguage()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/listings/${listingId}/connect`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setQuote(data)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [listingId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!quote) return null

  if (!quote.available) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {quote.status === "sold" ? t("connect.soldTitle") : t("connect.heldTitle")}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {quote.status === "sold" ? t("connect.soldNote") : t("connect.heldNote")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-green-900">{t("connect.title")}</p>
        <p className="text-sm text-green-800 mt-1">{t("connect.explainer")}</p>
      </div>

      <Link href={`/connect/${listingId}`} className="block">
        <Button className="w-full">
          <Phone className="h-4 w-4 mr-2" />
          {t("connect.cta")} — RWF {quote.feeAmount.toLocaleString()}
        </Button>
      </Link>

      <p className="text-xs text-green-800">{t("connect.feeNote")}</p>
    </div>
  )
}
