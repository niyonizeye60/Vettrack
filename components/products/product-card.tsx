"use client"

import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, Info } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import AddToCartControls from "@/components/products/add-to-cart-controls"
import ProductDetailRows, { type ProductDetail } from "@/components/products/product-detail-rows"
import type { CartCategory } from "@/contexts/CartContext"

interface ProductCardProps {
  id: string
  categoryId: string
  category: CartCategory
  name: string
  description?: string
  image: string
  price: number
  unit?: string
  detailHref: string
  badges?: { label: string; className?: string }[]
  details?: ProductDetail[]
  wishlisted?: boolean
  onToggleWishlist?: () => void
}

export default function ProductCard({
  id,
  categoryId,
  category,
  name,
  description,
  image,
  price,
  unit,
  detailHref,
  badges = [],
  details = [],
  wishlisted,
  onToggleWishlist,
}: ProductCardProps) {
  const { t } = useLanguage()

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <Link href={detailHref}>
          <Image
            src={image || "/placeholder.jpg"}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
          />
        </Link>

        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {badges.map((badge, i) => (
            <Badge key={i} className={badge.className ?? "bg-green-600 text-white"}>
              {badge.label}
            </Badge>
          ))}
        </div>

        {onToggleWishlist && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-white/90 hover:bg-white rounded-full shadow"
            onClick={onToggleWishlist}
            aria-label={t('common.addToWishlist')}
          >
            <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
          </Button>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{name}</h3>
          <span className="text-primary font-bold text-sm whitespace-nowrap">RWF {(price || 0).toLocaleString()}</span>
        </div>

        {unit && <p className="text-xs text-gray-400 mb-2">{unit}</p>}

        {description && <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">{description}</p>}

        <ProductDetailRows details={details} className="mb-3" />

        <div className="mt-auto space-y-2 pt-2">
          <Link href={detailHref}>
            <Button variant="outline" size="sm" className="w-full">
              <Info className="h-3.5 w-3.5 mr-1.5" />
              {t('common.learnMore')}
            </Button>
          </Link>
          <AddToCartControls
            size="sm"
            item={{ id, categoryId, category, name, image, price }}
          />
        </div>
      </div>
    </div>
  )
}
