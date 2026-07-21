"use client"

import { Smartphone, CreditCard, ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { OrderPaymentMethod } from "@/lib/db-orders"

interface PaymentMethodSelectorProps {
  value: OrderPaymentMethod | null
  onChange: (method: OrderPaymentMethod) => void
}

export default function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  const { t } = useLanguage()

  const options: { id: OrderPaymentMethod; icon: typeof Smartphone; title: string; desc: string }[] = [
    { id: "intouchpay", icon: Smartphone, title: t('checkout.payWithIntouchPay'), desc: t('checkout.payWithIntouchPayDesc') },
    { id: "pesapal", icon: CreditCard, title: t('checkout.payWithPesapal'), desc: t('checkout.payWithPesapalDesc') },
  ]

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const Icon = option.icon
        const selected = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
              selected ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${selected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{option.title}</p>
              <p className="text-xs text-gray-500">{option.desc}</p>
            </div>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 ${selected ? "text-primary" : "text-gray-300"}`} />
          </button>
        )
      })}
    </div>
  )
}
