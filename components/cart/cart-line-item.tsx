"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Minus, Plus, X } from "lucide-react"
import { useCart, type CartItem } from "@/contexts/CartContext"
import { useLanguage } from "@/contexts/LanguageContext"

export default function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart()
  const { t } = useLanguage()
  const canIncrement = !item.maxQuantity || item.quantity < item.maxQuantity

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        <Image src={item.image || "/placeholder.jpg"} alt={item.name} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">RWF {item.price.toLocaleString()}</p>

        <div className="flex items-center justify-between mt-2">
          {item.category === "sales" ? (
            <span className="text-xs text-gray-400">{t('cart.qtyOne')}</span>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm w-6 text-center">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={!canIncrement}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
          <button
            onClick={() => removeItem(item.id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
