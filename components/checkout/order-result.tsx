"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, Loader2, Phone, Mail } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentStatus } from "@/lib/db-orders"

export interface SellerContact {
  phone: string | null
  email: string | null
}

interface OrderResultProps {
  status: OrderPaymentStatus
  total?: number
  onCheckAgain?: () => void
  checking?: boolean
  /**
   * Present only for a paid connection fee. This is the thing the buyer just paid
   * for, so on success it becomes the whole point of the screen rather than a
   * footnote under a receipt.
   */
  sellerContact?: SellerContact | null
}

export default function OrderResult({ status, total, onCheckAgain, checking, sellerContact }: OrderResultProps) {
  const { t } = useLanguage()

  if (status === "completed") {
    if (sellerContact && (sellerContact.phone || sellerContact.email)) {
      return (
        <div className="py-8">
          <div className="text-center">
            <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('connect.paidTitle')}</h2>
            <p className="text-sm text-gray-500">{t('connect.paidDesc')}</p>
          </div>

          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <p className="text-xs font-medium text-green-900 uppercase tracking-wide">
              {t('connect.sellerDetails')}
            </p>
            {sellerContact.phone && (
              <a href={`tel:${sellerContact.phone}`} className="flex items-center text-base font-semibold text-green-900 hover:underline">
                <Phone className="h-4 w-4 mr-2" />
                {sellerContact.phone}
              </a>
            )}
            {sellerContact.email && (
              <a href={`mailto:${sellerContact.email}`} className="flex items-center text-sm text-green-900 hover:underline">
                <Mail className="h-4 w-4 mr-2" />
                {sellerContact.email}
              </a>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">{t('connect.holdNote')}</p>

          <Button asChild variant="outline" className="w-full mt-6">
            <Link href="/animal-sales">{t('connect.backToAnimals')}</Link>
          </Button>
        </div>
      )
    }

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
