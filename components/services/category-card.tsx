"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"

interface CategoryCardProps {
  id: string
  name: string
  description: string
  image: string
  href: string
}

export default function CategoryCard({ name, description, image, href }: CategoryCardProps) {
  const { t } = useLanguage()

  return (
    <div className="salon-card overflow-hidden shadow-salon hover:shadow-salon-hover transition-all group">
      <div className="relative h-48">
        <Image
          src={image || "/placeholder.svg"}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{description}</p>

        <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md">
          <Link href={href}>{t('common.viewProducts')}</Link>
        </Button>
      </div>
    </div>
  )
}
