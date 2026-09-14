"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import OrderResult, { type SellerContact } from "@/components/checkout/order-result"
import type { OrderPaymentStatus } from "@/lib/db-orders"

export default function CheckoutCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<OrderPaymentStatus | "loading">("loading")
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [sellerContact, setSellerContact] = useState<SellerContact | null>(null)

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
          if (orderData.sellerContact) setSellerContact(orderData.sellerContact)
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
    <div className="relative min-h-screen pt-32 pb-16 overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image
          src="/variety-farm-animals-front-white-background_191971-14972.avif"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="container-custom max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {status === "loading" ? (
            <div className="text-center py-10">
              <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
            </div>
          ) : (
            <OrderResult status={status} total={total} sellerContact={sellerContact} />
          )}
        </div>
      </div>
    </div>
  )
}
