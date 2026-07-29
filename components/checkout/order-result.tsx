"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentStatus } from "@/lib/db-orders"
import PaymentReceipt from "./payment-receipt"

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
  sellerName?: string | null
  sellerPhone?: string | null
  sellerId?: string | null
  commissionPercentage?: number | null
  commissionAmount?: number | null
  sellerAmount?: number | null
}

interface OrderData {
  id: string
  status: string
  paymentStatus: string
  paymentMethod?: string
  subtotal: number
  total: number
  commissionPercentage: number
  commissionTotal: number
  sellerTotal: number
  currency: string
  items: ReceiptItem[]
  buyer: {
    name: string
    phone: string
    email?: string
    district?: string
    sector?: string
    village?: string
  }
  createdAt: string
  paidAt?: string
}

interface OrderResultProps {
  status: OrderPaymentStatus
  total?: number
  orderId?: string
  onCheckAgain?: () => void
  checking?: boolean
}

export default function OrderResult({ status, total, orderId, onCheckAgain, checking }: OrderResultProps) {
  const { t } = useLanguage()
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)

  // Fetch full order data when payment is completed and orderId is provided
  useEffect(() => {
    if (status === "completed" && orderId) {
      setLoadingOrder(true)
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setOrderData(data)
          }
        })
        .catch(err => console.error("Failed to fetch order details:", err))
        .finally(() => setLoadingOrder(false))
    }
  }, [status, orderId])

  if (status === "completed") {
    return (
      <div className="py-6">
        <div className="text-center mb-6">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.orderSuccess') || 'Payment Successful!'}</h2>
          <p className="text-sm text-gray-500">{t('checkout.orderSuccessDesc') || 'Your payment has been processed successfully.'}</p>
        </div>

        {loadingOrder ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading receipt...</span>
          </div>
        ) : orderData ? (
          <PaymentReceipt
            orderId={orderData.id}
            items={orderData.items}
            subtotal={orderData.subtotal}
            total={orderData.total}
            commissionPercentage={orderData.commissionPercentage}
            commissionTotal={orderData.commissionTotal}
            sellerTotal={orderData.sellerTotal}
            buyer={orderData.buyer}
            paymentMethod={orderData.paymentMethod}
            paidAt={orderData.paidAt}
            createdAt={orderData.createdAt}
          />
        ) : (
          // Fallback if order data couldn't be fetched
          <div className="text-center py-6">
            {typeof total === "number" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700">Amount Paid</p>
                <p className="text-2xl font-bold text-green-800">RWF {total.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <Button asChild>
            <Link href="/services">{t('checkout.continueShopping') || 'Continue Shopping'}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="text-center py-10">
        <Clock className="h-14 w-14 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.orderPending') || 'Payment Pending'}</h2>
        <p className="text-sm text-gray-500">Waiting for payment confirmation...</p>
        {onCheckAgain && (
          <Button variant="outline" className="mt-6" onClick={onCheckAgain} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t('checkout.checkAgain') || 'Check Again'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="text-center py-10">
      <XCircle className="h-14 w-14 text-red-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.orderFailed') || 'Payment Failed'}</h2>
      <p className="text-sm text-gray-500 mb-1">{t('checkout.orderFailedDesc') || 'Your payment could not be processed.'}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/checkout">{t('checkout.title') || 'Try Again'}</Link>
      </Button>
    </div>
  )
}
