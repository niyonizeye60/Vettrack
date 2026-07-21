import { type LucideIcon } from "lucide-react"

export interface ProductDetail {
  icon: LucideIcon
  label?: string
  text: string
}

export default function ProductDetailRows({ details, className = "" }: { details: ProductDetail[]; className?: string }) {
  if (details.length === 0) return null

  return (
    <div className={`space-y-1.5 ${className}`}>
      {details.map((detail, i) => (
        <div key={i} className="flex items-center text-sm text-gray-600">
          <detail.icon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{detail.label ? `${detail.label}: ${detail.text}` : detail.text}</span>
        </div>
      ))}
    </div>
  )
}
