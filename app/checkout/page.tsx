"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, ChevronLeft, Smartphone, Shield, Lock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useCart } from "@/contexts/CartContext"
import { useToast } from "@/hooks/use-toast"
import CartLineItem from "@/components/cart/cart-line-item"
import BuyerInfoForm from "@/components/checkout/buyer-info-form"
import PaymentMethodSelector from "@/components/checkout/payment-method-selector"
import IntouchPayPoll from "@/components/checkout/intouchpay-poll"
import type { Buyer } from "@/lib/validations/checkout"
import type { OrderPaymentMethod } from "@/lib/db-orders"
type Step = "review" | "buyer" | "payment" | "intouchpay-poll"

export default function CheckoutPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { items, subtotal, clear } = useCart()

  const [step, setStep] = useState<Step>("review")
  const [buyer, setBuyer] = useState<Buyer>({ name: "", phone: "", email: "", district: "", sector: "", village: "", notes: "" })
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod | null>(null)
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("")
  const [placingOrder, setPlacingOrder] = useState(false)
  const [pollOrderId, setPollOrderId] = useState<string | null>(null)

  const placeOrder = async () => {
    if (!paymentMethod) return
    setPlacingOrder(true)
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ serviceId: i.id, quantity: i.quantity })),
          buyer,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        toast({ title: t('common.error'), description: orderData.error, variant: "destructive" })
        return
      }
      const orderId = orderData.orderId as string

      if (paymentMethod === "pesapal") {
        const initRes = await fetch("/api/payments/pesapal/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })
        const initData = await initRes.json()
        if (!initRes.ok) {
          toast({ title: t('common.error'), description: initData.error, variant: "destructive" })
          return
        }
        clear()
        window.location.href = initData.redirectUrl
        return
      }

      // IntouchPay — use the mobile money phone from the payment selector
      const rawPhone = (mobileMoneyPhone || buyer.phone).replace(/\s+/g, "")
      let formattedPhone = rawPhone
      if (rawPhone.startsWith("0")) {
        formattedPhone = "250" + rawPhone.slice(1)
      } else if (rawPhone.startsWith("+250")) {
        formattedPhone = rawPhone.slice(1)  // +250... → 250...
      } else if (rawPhone.startsWith("250")) {
        formattedPhone = rawPhone  // already starts with 250
      } else {
        formattedPhone = "250" + rawPhone
      }
      const initRes = await fetch("/api/payments/intouchpay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, mobilePhone: formattedPhone }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        toast({ title: t('common.error'), description: initData.error, variant: "destructive" })
        return
      }
      clear()
      setPollOrderId(orderId)
      setStep("intouchpay-poll")
    } catch (error) {
      console.error("Checkout failed:", error)
      toast({ title: t('common.error'), variant: "destructive" })
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <div className="relative min-h-screen pt-32 pb-16 overflow-hidden">
      {/* Background image */}
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

      {step === "intouchpay-poll" && pollOrderId ? (
        <div className="container-custom max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <IntouchPayPoll orderId={pollOrderId} phone={buyer.phone} total={subtotal} />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="container-custom max-w-lg text-center py-16">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">{t('checkout.emptyCartTitle')}</h1>
            <p className="text-sm text-gray-500 mb-6">{t('checkout.emptyCartDesc')}</p>
            <Button asChild>
              <Link href="/services">{t('checkout.browseProducts')}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="container-custom max-w-2xl">
          <h1 className="text-2xl font-bold text-white mb-6">{t('checkout.title')}</h1>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {step === "review" && (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t('checkout.reviewOrder')}</h2>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => <CartLineItem key={item.id} item={item} />)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm font-medium">
                  <span className="text-gray-600">{t('checkout.total')}</span>
                  <span className="text-lg font-bold text-gray-900">RWF {subtotal.toLocaleString()}</span>
                </div>
                <Button className="w-full mt-4" onClick={() => setStep("buyer")}>{t('checkout.continue')}</Button>
              </>
            )}

            {step === "buyer" && (
              <>
                <button onClick={() => setStep("review")} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('checkout.back')}
                </button>
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t('checkout.buyerInfo')}</h2>
                <BuyerInfoForm
                  initialValue={buyer}
                  onSubmit={(values) => {
                    setBuyer(values)
                    setStep("payment")
                  }}
                />
              </>
            )}

            {step === "payment" && (
              <>
                <button onClick={() => setStep("buyer")} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('checkout.back')}
                </button>
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t('checkout.paymentMethod')}</h2>
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  mobilePhone={mobileMoneyPhone}
                  onMobilePhoneChange={setMobileMoneyPhone}
                />

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('checkout.total')}</span>
                    <span className="text-lg font-bold text-gray-900">RWF {subtotal.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-4 h-12 text-base"
                  onClick={placeOrder}
                  disabled={!paymentMethod || (paymentMethod === "intouchpay" && !mobileMoneyPhone) || placingOrder}
                >
                  {placingOrder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {placingOrder ? t('checkout.processing') : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Pay RWF {subtotal.toLocaleString()}
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Secured payment — your information is protected
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
