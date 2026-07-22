"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface ServicesBannerProps {
  title?: string
  subtitle?: string
  image?: string
  backHref?: string
  backLabel?: string
}

export default function ServicesBanner({ title, subtitle, image, backHref, backLabel }: ServicesBannerProps) {
  const { t } = useLanguage()
  return (
    <section className="relative pt-32 pb-20">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={image || "/variety-farm-animals-front-white-background_191971-14972.avif?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"}
          alt={title || "Veterinary services"}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-2xl text-white">
          {backHref && (
            <Link href={backHref} className="inline-flex items-center text-white/80 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel || `${t('common.backTo')} ${t('nav.services')}`}
            </Link>
          )}
          <h1 className="heading-xl mb-4 text-blue-600">{title || t('services.title')}</h1>
          <p className="text-lg md:text-xl text-white/90">
            {subtitle || t('services.subtitle')}
          </p>
        </div>
      </div>
    </section>
  )
}
