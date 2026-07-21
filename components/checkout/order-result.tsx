"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentStatus } from "@/lib/db-orders"

interface OrderResultProps {
  status: OrderPaymentStatus
  total?: number
  onCheckAgain?: () => void
  checking?: boolean
}

export default function OrderResult({ status, total, onCheckAgain, checking }: OrderResultProps) {
  const { t } = useLanguage()

  if (status === "completed") {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.orderSuccess')}</h2>
        <p className="text-sm text-gray-500 mb-1">{t('checkout.orderSuccessDesc')}</p>
        {typeof total === "number" && (
          <p className="text-lg font-semibold text-gray-900 mt-2">RWF {total.toLocaleString()}</p>
        )}
        <Button asChild className="mt-6">
          <Link href="/services">{t('checkout.continueShopping')}</Link>
        </Button>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="text-center py-10">
        <Clock className="h-14 w-14 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.orderPending')}</h2>
        {onCheckAgain && (
          <Button variant="outline" className="mt-6" onClick={onCheckAgain} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t('checkout.checkAgain')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="text-center py-10">
      <XCircle className="h-14 w-14 text-red-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.orderFailed')}</h2>
      <p className="text-sm text-gray-500 mb-1">{t('checkout.orderFailedDesc')}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/checkout">{t('checkout.title')}</Link>
      </Button>
    </div>
  )
}
