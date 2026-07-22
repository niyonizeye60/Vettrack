"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import OrderResult from "@/components/checkout/order-result"
import type { OrderPaymentStatus } from "@/lib/db-orders"

export default function CheckoutCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<OrderPaymentStatus | "loading">("loading")
  const [total, setTotal] = useState<number | undefined>(undefined)

  useEffect(() => {
    const orderId = searchParams.get("OrderMerchantReference")
    if (!orderId) {
      setStatus("failed")
      return
    }

    const verify = async () => {
      try {
        const verifyRes = await fetch("/api/payments/pesapal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })
        const verifyData = await verifyRes.json()

        const orderRes = await fetch(`/api/orders/${orderId}`)
        const orderData = await orderRes.json()
        if (orderRes.ok) {
          setTotal(orderData.total)
        }

        setStatus(verifyRes.ok ? verifyData.paymentStatus : "failed")
      } catch (error) {
        console.error("Failed to verify payment:", error)
        setStatus("failed")
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-16">
      <div className="container-custom max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {status === "loading" ? (
            <div className="text-center py-10">
              <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
            </div>
          ) : (
            <OrderResult status={status} total={total} />
          )}
        </div>
      </div>
    </div>
  )
}
