"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, type LucideIcon } from "lucide-react"

interface ProductDetail {
  icon: LucideIcon
  text: string
}

interface AdminProductCardProps {
  image?: string
  name: string
  categoryName?: string
  price: number
  unit?: string
  description?: string
  details?: ProductDetail[]
  onEdit: () => void
  onDelete: () => void
}

export default function AdminProductCard({
  image,
  name,
  categoryName,
  price,
  unit,
  description,
  details,
  onEdit,
  onDelete,
}: AdminProductCardProps) {
  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      <div className="relative h-40 bg-gray-100 flex-shrink-0">
        <Image
          src={image || "/placeholder.jpg"}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {categoryName && (
          <Badge className="absolute top-2 left-2 bg-white/90 text-gray-700 hover:bg-white/90 shadow-sm">
            {categoryName}
          </Badge>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</h3>
          <span className="text-green-600 font-bold text-sm whitespace-nowrap">
            RWF {(price || 0).toLocaleString()}
          </span>
        </div>

        {unit && <p className="text-xs text-gray-400 mb-2">{unit}</p>}

        {description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{description}</p>
        )}

        {details && details.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {details.map((detail, i) => (
              <div key={i} className="flex items-center text-xs text-gray-600">
                <detail.icon className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{detail.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
