"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, Phone, Info } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import BuyerInfoForm from "@/components/checkout/buyer-info-form"
import PaymentMethodSelector from "@/components/checkout/payment-method-selector"
import IntouchPayPoll from "@/components/checkout/intouchpay-poll"
import type { Buyer } from "@/lib/validations/checkout"
import type { OrderPaymentMethod } from "@/lib/db-orders"

type Step = "intro" | "buyer" | "payment" | "intouchpay-poll"

const CONNECT_BG_URL =
  "https://images.unsplash.com/photo-1440428099904-c6d459a7e7b5?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
const CONNECT_BG_STYLE = {
  backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.5)), url(${CONNECT_BG_URL})`,
}

interface Quote {
  name: string
  animalPrice: number
  feeAmount: number
  available: boolean
  status: string
}

/**
 * Paying to be connected to an animal's seller.
 *
 * Deliberately not the cart checkout: the buyer is not buying the animal here. They
 * pay Vettrack a connection fee, receive the seller's details, and settle the
 * animal's price with the seller directly. The page says that at every step, because
 * the fee is not refundable once the details are released.
 */
export default function ConnectPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const params = useParams()
  const listingId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>("intro")
  const [buyer, setBuyer] = useState<Buyer>({ name: "", phone: "", email: "", district: "", sector: "", village: "", notes: "" })
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod | null>(null)
  const [placing, setPlacing] = useState(false)
  const [pollOrderId, setPollOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/listings/${listingId}/connect`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setQuote(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId])

  const startPayment = async () => {
    if (!paymentMethod) return
    setPlacing(true)
    try {
      const orderRes = await fetch(`/api/listings/${listingId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        toast({ title: t("common.error"), description: orderData.error, variant: "destructive" })
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
          toast({ title: t("common.error"), description: initData.error, variant: "destructive" })
          return
        }
        window.location.href = initData.redirectUrl
        return
      }

      const initRes = await fetch("/api/payments/intouchpay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, mobilePhone: buyer.phone }),
      })
      const initData = await initRes.json()
      if (!initRes.ok) {
        toast({ title: t("common.error"), description: initData.error, variant: "destructive" })
        return
      }
      setPollOrderId(orderId)
      setStep("intouchpay-poll")
    } catch (error) {
      console.error("Connection payment failed:", error)
      toast({ title: t("common.error"), variant: "destructive" })
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 bg-cover bg-center bg-fixed pt-32 pb-16" style={CONNECT_BG_STYLE}>
        <div className="container-custom max-w-lg flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 bg-cover bg-center bg-fixed pt-32 pb-16" style={CONNECT_BG_STYLE}>
        <div className="container-custom max-w-lg text-center">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{t("animals.notFound")}</h1>
            <Button asChild className="mt-6"><Link href="/animal-sales">{t("connect.backToAnimals")}</Link></Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 bg-cover bg-center bg-fixed pt-32 pb-16" style={CONNECT_BG_STYLE}>
      <div className="container-custom max-w-2xl">
        <Link
          href={`/animal-sales/${listingId}`}
          className="inline-flex items-center text-sm text-white/80 hover:text-white mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {quote.name}
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {step === "intouchpay-poll" && pollOrderId ? (
            <IntouchPayPoll orderId={pollOrderId} phone={buyer.phone} total={quote.feeAmount} />
          ) : !quote.available ? (
            <div className="text-center py-10">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t("connect.heldTitle")}</h2>
              <p className="text-sm text-gray-500">{t("connect.heldNote")}</p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/animal-sales">{t("connect.backToAnimals")}</Link>
              </Button>
            </div>
          ) : (
            <>
              {step === "intro" && (
                <>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">{t("connect.title")}</h1>
                  <p className="text-sm text-gray-600 mb-5">{t("connect.explainer")}</p>

                  <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm text-gray-600">{t("connect.askingPrice")}</span>
                      <span className="text-sm font-medium text-gray-900">
                        RWF {quote.animalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <span className="text-sm font-medium text-gray-900">{t("connect.youPayNow")}</span>
                      <span className="text-lg font-bold text-gray-900">
                        RWF {quote.feeAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <Info className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">{t("connect.nonRefundable")}</p>
                  </div>

                  <Button className="w-full mt-6" onClick={() => setStep("buyer")}>
                    {t("checkout.continue")}
                  </Button>
                </>
              )}

              {step === "buyer" && (
                <>
                  <button onClick={() => setStep("intro")} className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("checkout.back")}
                  </button>
                  <h2 className="text-base font-semibold text-gray-900 mb-4">{t("connect.yourDetails")}</h2>
                  <p className="text-sm text-gray-500 mb-4">{t("connect.yourDetailsNote")}</p>
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
                    {t("checkout.back")}
                  </button>
                  <h2 className="text-base font-semibold text-gray-900 mb-4">{t("checkout.paymentMethod")}</h2>
                  <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-600">{t("connect.youPayNow")}</span>
                    <span className="text-lg font-bold text-gray-900">
                      RWF {quote.feeAmount.toLocaleString()}
                    </span>
                  </div>

                  <Button className="w-full mt-4" onClick={startPayment} disabled={!paymentMethod || placing}>
                    {placing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                    {placing ? t("checkout.processing") : t("connect.payAndReveal")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
