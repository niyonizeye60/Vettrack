"use client"

import ContactForm from "@/components/contact/contact-form"
import ContactInfo from "@/components/contact/contact-info"
import LocationMap from "@/components/contact/location-map"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ContactContent() {
  const { t } = useLanguage()
  
  return (
    <>
      <div className="bg-gradient-to-r from-primary to-primary-light py-20 mb-12">
        <div className="container-custom">
          <h1 className="heading-xl text-white text-center mb-4">{t('contact.title')}</h1>
          <p className="text-xl text-white/90 text-center max-w-2xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>
      </div>
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