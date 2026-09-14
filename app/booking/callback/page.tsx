"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react"
import Link from "next/link"

export default function BookingCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "completed" | "failed" | "pending">("loading")
  const [amount, setAmount] = useState<number>(100)

  useEffect(() => {
    const bookingId = searchParams.get("OrderMerchantReference")
    if (!bookingId) {
      setStatus("failed")
      return
    }

    const verify = async () => {
      try {
        const verifyRes = await fetch("/api/payments/pesapal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: bookingId, type: "booking" }),
        })
        const verifyData = await verifyRes.json()

        // Also fetch booking to get the price for display
        const bookingRes = await fetch(`/api/bookings?id=${bookingId}`)
        const bookingData = await bookingRes.json()
        if (bookingRes.ok && bookingData.servicePrice) {
          setAmount(bookingData.servicePrice)
        }

        setStatus(verifyRes.ok ? verifyData.paymentStatus : "failed")
      } catch (error) {
        console.error("Failed to verify booking payment:", error)
        setStatus("failed")
      }
    }

    verify()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-16">
      <div className="container-custom max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          {status === "loading" ? (
            <div className="py-10">
              <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
              <p className="mt-4 text-gray-500">Verifying your payment...</p>
            </div>
          ) : status === "completed" ? (
            <div className="py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h2>
              <p className="text-gray-600 mb-4">Your booking has been confirmed.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 inline-block">
                <p className="text-green-800 font-medium">
                  ✅ RWF {amount.toLocaleString()} paid successfully
                </p>
                <p className="text-green-700 text-sm mt-1">
                  You will receive a confirmation message shortly.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                <Mail className="h-4 w-4" />
                <span>Check your email and phone for confirmation details</span>
              </div>
              <Link
                href="/booking"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                Book Another Consultation
              </Link>
            </div>
          ) : status === "pending" ? (
            <div className="py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-6">
                <Loader2 className="h-10 w-10 text-yellow-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h2>
              <p className="text-gray-600 mb-6">
                Your payment is being processed. Please wait a moment.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                Back to Booking
              </Link>
            </div>
          ) : (
            <div className="py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">
                Something went wrong with your payment. Please try again.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                Try Again
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
