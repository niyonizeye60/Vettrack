"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Eye, EyeOff, Info, Pencil, Trash2, type LucideIcon } from "lucide-react"

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
  /** When provided, the card shows a hide/show toggle and a "Hidden" marker. */
  hidden?: boolean
  onToggleHidden?: () => void
  /** When provided, the card opens a read-only details view from its image, name and a button. */
  onView?: () => void
  /** The seller changed this listing after it went live. */
  edited?: boolean
  /** Screen text, passed in because this card is shared and has no language context of its own. */
  labels?: { view?: string; edited?: string; hidden?: string }
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
  hidden,
  onToggleHidden,
  onView,
  edited,
  labels,
}: AdminProductCardProps) {
  const picture = (
    <Image
      src={image || "/placeholder.jpg"}
      alt={name}
      fill
      className={`object-cover group-hover:scale-105 transition-transform duration-300 ${hidden ? "opacity-40 grayscale" : ""}`}
    />
  )

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      <div className="relative h-40 bg-gray-100 flex-shrink-0">
        {onView ? (
          <button type="button" onClick={onView} aria-label={labels?.view ?? "Details"} className="absolute inset-0">
            {picture}
          </button>
        ) : (
          picture
        )}
        {categoryName && (
          <Badge className="absolute top-2 left-2 bg-white/90 text-gray-700 hover:bg-white/90 shadow-sm pointer-events-none">
            {categoryName}
          </Badge>
        )}
        {hidden && (
          <Badge className="absolute top-2 right-2 bg-gray-800 text-white hover:bg-gray-800 shadow-sm pointer-events-none">
            <EyeOff className="h-3 w-3 mr-1" />
            {labels?.hidden ?? "Hidden"}
          </Badge>
        )}
        {edited && (
          <Badge className="absolute bottom-2 left-2 bg-amber-100 text-amber-800 hover:bg-amber-100 shadow-sm pointer-events-none">
            <Pencil className="h-3 w-3 mr-1" />
            {labels?.edited ?? "Edited"}
          </Badge>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          {onView ? (
            <button type="button" onClick={onView} className="text-left min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 hover:underline">{name}</h3>
            </button>
          ) : (
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{name}</h3>
          )}
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
          {onView && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
              <Info className="h-3.5 w-3.5 mr-1.5" />
              {labels?.view ?? "Details"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          {onToggleHidden && (
            <Button
              variant="ghost"
              size="sm"
              title={hidden ? "Show on the public pages" : "Hide from the public pages"}
              aria-label={hidden ? "Show on the public pages" : "Hide from the public pages"}
              onClick={onToggleHidden}
            >
              {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            aria-label="Delete"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
