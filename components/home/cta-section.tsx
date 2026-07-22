"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function CTASection() {
  const { t } = useLanguage()
  return (
    <section className="py-20 bg-gradient-to-br from-primary/10 to-secondary/10 relative overflow-hidden">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-6">{t('home.locations.title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8 text-lg">
            {t('home.locations.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { name: "Nyagatare Main Hospital", address: "EN 32 Ave street, Nyagatare City", phone: "+250 78 072 1800" },
            { name: "Kigali Branch", address: "45 Veterinary Street, Kigali", phone: "+250 78 051 9960" },
            { name: "Kayonza Branch", address: "78 Livestock Avenue, Kayonza", phone: "+250 78 072 1800" },
          ].map((location, index) => (
            <div key={index} className="salon-card p-6 text-center hover-lift">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{location.name}</h3>
              <p className="text-gray-600 mb-1">{location.address}</p>
              <p className="text-gray-600 mb-4">{location.phone}</p>
              <Link href="/contact" className="text-primary hover:text-primary/80 font-medium">
                {t('home.locations.directions')}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">{t('home.cta.title')}</h3>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            {t('home.cta.subtitle')}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md"
          >
            <Link href="/booking">{t('home.cta.button')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
