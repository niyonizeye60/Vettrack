"use client"

import { useState, useEffect } from "react"
import { Smartphone, CreditCard, Check, Shield, Lock, Zap, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentMethod } from "@/lib/db-orders"

interface PaymentMethodSelectorProps {
  value: OrderPaymentMethod | null
  onChange: (method: OrderPaymentMethod) => void
  mobilePhone?: string
  onMobilePhoneChange?: (phone: string) => void
}

/** Format card number with spaces every 4 digits */
function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
}

/** Format expiry as MM/YY */
function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + " / " + digits.slice(2)
}

/** Simple card network detection */
function detectCardNetwork(num: string): "visa" | "mastercard" | null {
  const clean = num.replace(/\s/g, "")
  if (clean.startsWith("4")) return "visa"
  if (clean.startsWith("5")) return "mastercard"
  return null
}

export default function PaymentMethodSelector({
  value,
  onChange,
  mobilePhone,
  onMobilePhoneChange,
}: PaymentMethodSelectorProps) {
  const { t } = useLanguage()
  const [phoneInput, setPhoneInput] = useState(mobilePhone || "")

  // Card form state
  const [cardName, setCardName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [showCvv, setShowCvv] = useState(false)

  useEffect(() => {
    setPhoneInput(mobilePhone || "")
  }, [mobilePhone])

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10)
    setPhoneInput(cleaned)
    onMobilePhoneChange?.(cleaned)
  }

  const detectNetwork = (phone: string): "mtn" | "airtel" | null => {
    if (phone.length < 3) return null
    const prefix = phone.slice(0, 3)
    if (prefix.startsWith("078") || prefix.startsWith("079")) return "mtn"
    if (prefix.startsWith("073") || prefix.startsWith("072")) return "airtel"
    return null
  }

  const network = detectNetwork(phoneInput)
  const phoneValid = phoneInput.length === 10
  const isIntouchSelected = value === "intouchpay"
  const isPesapalSelected = value === "pesapal"

  return (
    <div className="space-y-5">
      {/* Mobile Money Option */}
      <div
        className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
          isIntouchSelected
            ? "border-green-500 bg-green-50/50 shadow-md shadow-green-100"
            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
        }`}
        onClick={() => onChange("intouchpay")}
      >
        {isIntouchSelected && (
          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center ${
                isIntouchSelected ? "bg-green-500 text-white" : "bg-gradient-to-br from-green-400 to-green-600 text-white"
              }`}
            >
              <Smartphone className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">Mobile Money</p>
              <p className="text-sm text-gray-500">Pay with MTN Mobile Money or Airtel Money</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                network === "mtn" || !network
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              📱 MTN
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                network === "airtel" || !network
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              📱 Airtel
            </span>
          </div>

          {isIntouchSelected && (
            <div className="mt-4 pt-4 border-t border-green-100" onClick={(e) => e.stopPropagation()}>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Enter your MTN / Airtel number
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                  <span className="text-sm font-medium text-gray-500">+250</span>
                  <span className="mx-1 text-gray-300">|</span>
                </div>
                <Input
                  type="tel"
                  placeholder="7XXXXXXXX"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="pl-16 h-12 text-base font-medium border-2 focus:border-green-500"
                />
              </div>
              {phoneValid && (
                <div className="mt-2 flex items-center gap-2">
                  {network === "mtn" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                      <Zap className="h-3 w-3" /> MTN Mobile Money
                    </span>
                  ) : network === "airtel" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full">
                      <Zap className="h-3 w-3" /> Airtel Money
                    </span>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Lock className="h-3 w-3" /> We'll send a payment request to your phone
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Payment Option with Full Card Form */}
      <div
        className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
          isPesapalSelected
            ? "border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-100"
            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
        }`}
        onClick={() => onChange("pesapal")}
      >
        {isPesapalSelected && (
          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center ${
                isPesapalSelected
                  ? "bg-indigo-500 text-white"
                  : "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white"
              }`}
            >
              <CreditCard className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">Debit / Credit Card</p>
              <p className="text-sm text-gray-500">Pay with Visa, Mastercard via Pesapal</p>
            </div>
          </div>

          {/* Full Card Input Form */}
          {isPesapalSelected && (
            <div className="mt-5 pt-4 border-t border-indigo-100 space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Card Preview */}
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-700 rounded-xl p-5 text-white relative overflow-hidden shadow-lg">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/10" />
                
                <div className="relative z-10">
                  {/* Card brand */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-medium opacity-80">
                      {detectCardNetwork(cardNumber) === "visa" ? "VISA" : detectCardNetwork(cardNumber) === "mastercard" ? "MASTERCARD" : "CREDIT CARD"}
                    </span>
                    <Shield className="h-5 w-5 opacity-80" />
                  </div>

                  {/* Card number */}
                  <p className="text-xl tracking-widest font-mono mb-4">
                    {cardNumber || "••••  ••••  ••••  ••••"}
                  </p>

                  {/* Card details row */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] opacity-70 mb-0.5">CARD HOLDER</p>
                      <p className="text-sm font-medium tracking-wide truncate max-w-[180px]">
                        {cardName.toUpperCase() || "YOUR NAME"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70 mb-0.5">EXPIRES</p>
                      <p className="text-sm font-mono font-medium">
                        {cardExpiry || "MM / YY"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cardholder Name */}
              <div>
                <Label htmlFor="cardName" className="text-sm font-medium text-gray-700">
                  Cardholder Name
                </Label>
                <Input
                  id="cardName"
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="h-11 text-base border-2 focus:border-indigo-500"
                />
              </div>

              {/* Card Number */}
              <div>
                <Label htmlFor="cardNumber" className="text-sm font-medium text-gray-700">
                  Card Number
                </Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    type="tel"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="h-11 text-base font-mono tracking-wider border-2 focus:border-indigo-500 pr-12"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {detectCardNetwork(cardNumber) === "visa" && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">VISA</span>
                    )}
                    {detectCardNetwork(cardNumber) === "mastercard" && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">MC</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expiry + CVV row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cardExpiry" className="text-sm font-medium text-gray-700">
                    Expiry Date
                  </Label>
                  <Input
                    id="cardExpiry"
                    type="tel"
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    className="h-11 text-base font-mono border-2 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <Label htmlFor="cardCvv" className="text-sm font-medium text-gray-700">
                    CVV
                  </Label>
                  <div className="relative">
                    <Input
                      id="cardCvv"
                      type={showCvv ? "tel" : "password"}
                      placeholder="***"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-11 text-base font-mono border-2 focus:border-indigo-500 pr-10"
                      maxLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security notice */}
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
                <Lock className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <p className="text-xs text-indigo-700">
                  Your card details are encrypted and processed securely by <strong>Pesapal</strong>.
                  We never store your full card number.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
