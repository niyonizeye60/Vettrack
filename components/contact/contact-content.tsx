"use client"

import Image from "next/image"
import ContactForm from "@/components/contact/contact-form"
import ContactInfo from "@/components/contact/contact-info"
import LocationMap from "@/components/contact/location-map"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ContactContent() {
  const { t } = useLanguage()

  return (
    <>
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1520333789090-1afc82db536a?w=1920&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
            alt="Get in touch with our team"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50"></div>
        </div>
        <div className="container-custom relative z-10">
          <div className="max-w-2xl text-white">
            <h1 className="heading-xl text-blue-600 mb-4">{t('contact.title')}</h1>
            <p className="text-xl text-white/90">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>
      </section>
      <div className="container-custom mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ContactInfo />
          <ContactForm />
        </div>
        <div className="mt-20">
          <h2 className="heading-md mb-6">{t('contact.findUs')}</h2>
          <LocationMap />
        </div>
      </div>
    </>
  )
}