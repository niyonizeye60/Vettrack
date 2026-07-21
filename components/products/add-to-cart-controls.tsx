"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Minus, Plus, ShoppingCart, Check } from "lucide-react"
import { useCart, type CartItem } from "@/contexts/CartContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface AddToCartControlsProps {
  item: Omit<CartItem, "quantity">
  className?: string
  size?: "sm" | "default"
}

export default function AddToCartControls({ item, className = "", size = "default" }: AddToCartControlsProps) {
  const { addItem } = useCart()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const isSales = item.category === "sales"

  const handleAdd = () => {
    addItem(item, quantity)
    toast({ title: t('cart.itemAdded'), description: item.name })
    setJustAdded(true)
    setQuantity(1)
    setTimeout(() => setJustAdded(false), 1500)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!isSales && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={size === "sm" ? "h-8 w-8" : "h-10 w-10"}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={size === "sm" ? "h-8 w-8" : "h-10 w-10"}
            onClick={() => setQuantity((q) => (item.maxQuantity ? Math.min(item.maxQuantity, q + 1) : q + 1))}
            disabled={!!item.maxQuantity && quantity >= item.maxQuantity}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Button type="button" className="flex-1" size={size} onClick={handleAdd}>
        {justAdded ? <Check className="h-4 w-4 mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
        {t('common.addToCart')}
      </Button>
    </div>
  )
}
