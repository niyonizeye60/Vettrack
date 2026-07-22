"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"

const reviewImages = [
  "/reviews/rev1.jpg",
  "/reviews/rev2.png",
  // "/reviews/review3.jpg",
  // "/reviews/review4.jpg",
  // Add more as needed
]

export default function HeroSection() {
  const { t } = useLanguage()
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/cows-green-field-blue-sky.jpg?w=1920&h=1080&fit=crop&crop=focalpoint&auto=format&q=80"
          alt="Veterinarian with animals"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent"></div>
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-2xl text-white">
          <h1 className="text-5xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight">
            {t('home.hero.titleStart')}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              {t('home.hero.titleEnd')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200 leading-relaxed">
            {t('home.hero.subtitle')}
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="text-lg px-8 py-4">
              <Link href="/booking">{t('home.hero.bookConsultation')}</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-4 text-black border-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/services">{t('common.learnMore')}</Link>
            </Button>
          </div>

          <div className="mt-12 flex items-center space-x-4">
            <div className="flex -space-x-2">
              {reviewImages.map((src, i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                  <Image
                    src={src}
                    alt={`Happy customer ${i + 1}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="text-yellow-400 flex text-2xl">{"★★★★★"}</div>
              <p className="text-sm text-gray-300">{t('home.hero.trusted')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  )
}
