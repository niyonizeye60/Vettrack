"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2, Lock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 30 * 60 * 1000

interface PesapalFrameProps {
  orderId: string
  redirectUrl: string
}

/**
 * Pesapal's payment page shown inside Vettrack, instead of sending the buyer off the
 * site. Pesapal API 3.0 supports loading its redirect_url in an iframe.
 *
 * When the payment finishes, Pesapal sends the whole tab to /checkout/callback. Some
 * browsers block a cross-site frame from moving the tab without a fresh click, so
 * this also watches the order (the IPN updates it) and goes to the callback itself
 * once the payment has completed.
 */
export default function PesapalFrame({ orderId, redirectUrl }: PesapalFrameProps) {
  const { t } = useLanguage()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval)
        return
      }
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (!res.ok) return
        const data = await res.json()
        // Only on success: after a failed attempt Pesapal lets the buyer try again
        // inside the frame, so a failure here isn't final.
        if (data.paymentStatus === "completed") {
          clearInterval(interval)
          window.location.assign(`/checkout/callback?OrderMerchantReference=${encodeURIComponent(orderId)}`)
        }
      } catch {
        // Network blip - try again on the next tick.
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [orderId])

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">{t('checkout.pesapalTitle')}</h2>
      <p className="text-sm text-gray-500 mt-1 mb-4">{t('checkout.pesapalDesc')}</p>

      <div className="relative h-[75vh] min-h-[560px] max-h-[760px] overflow-hidden rounded-lg border border-gray-200 bg-white">
        <iframe
          src={redirectUrl}
          title={t('checkout.pesapalTitle')}
          allow="payment"
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Lock className="h-3.5 w-3.5" />
          {t('checkout.pesapalSecured')}
        </span>
        <a
          href={redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          {t('checkout.pesapalOpenNewTab')}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
