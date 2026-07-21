"use client"

import { useEffect, useRef, useState } from "react"
import { Smartphone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentStatus } from "@/lib/db-orders"
import OrderResult from "@/components/checkout/order-result"

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

interface IntouchPayPollProps {
  orderId: string
  phone: string
  total: number
}

export default function IntouchPayPoll({ orderId, phone, total }: IntouchPayPollProps) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<OrderPaymentStatus>("pending")
  const [checking, setChecking] = useState(false)
  const [autoPollActive, setAutoPollActive] = useState(true)
  const startedAt = useRef(Date.now())

  const checkStatus = async () => {
    setChecking(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      const data = await res.json()
      if (res.ok) {
        setStatus(data.paymentStatus)
      }
    } catch (error) {
      console.error("Failed to check order status:", error)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (!autoPollActive) return
    const interval = setInterval(() => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setAutoPollActive(false)
        return
      }
      checkStatus()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPollActive])

  useEffect(() => {
    if (status !== "pending") {
      setAutoPollActive(false)
    }
  }, [status])

  if (status === "pending") {
    return (
      <div className="text-center py-10">
        <div className="relative mx-auto mb-4 h-14 w-14">
          <Smartphone className="h-14 w-14 text-primary" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 animate-ping" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.waitingApproval')}</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          {t('checkout.waitingApprovalDesc').replace('{phone}', phone)}
        </p>
        <Button variant="outline" className="mt-6" onClick={checkStatus} disabled={checking}>
          {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t('checkout.checkAgain')}
        </Button>
      </div>
    )
  }

  return <OrderResult status={status} total={total} />
}
