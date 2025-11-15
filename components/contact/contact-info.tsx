"use client"

import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter, Youtube, Linkedin } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function ContactInfo() {
  const { t } = useLanguage()
  return (
    <div className="salon-card p-8 shadow-salon">
      <h2 className="heading-md mb-6 flex items-center">
        <span className="w-8 h-0.5 bg-primary mr-2"></span>
        {t('contact.getInTouch')}
      </h2>

      <div className="space-y-6">
        <div className="flex items-start">
          <MapPin className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold mb-1">{t('contact.address')}</h3>
            <p className="text-gray-600">Nyagatare, Rwanda</p>
          </div>
        </div>

        <div className="flex items-start">
          <Phone className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold mb-1">{t('common.phone')}</h3>
            <p className="text-gray-600">+250 780 721 800</p>
          </div>
        </div>

        <div className="flex items-start">
          <Mail className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold mb-1">{t('common.email')}</h3>
            <p className="text-gray-600">ntdm2050@gmail.com</p>
          </div>
        </div>

        <div className="flex items-start">
          <Clock className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
          <div>
            <h3 className="font-semibold mb-1">{t('contact.hours')}</h3>
            <div className="text-gray-600">
              <p>{t('footer.weekdays')}: 8:00 AM - 6:00 PM</p>
              <p>{t('footer.saturday')}: 9:00 AM - 4:00 PM</p>
              <p>{t('contact.emergency')}: 24/7</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="font-semibold mb-3">{t('footer.followUs')}</h3>
        <div className="flex space-x-4">
          <a
            href="https://www.instagram.com/ntdm_animal_hosipital?igsh=bjBuZW40YXpnN3Zm"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 p-2 rounded-full hover:bg-primary hover:text-white transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="https://www.facebook.com/niyonizeye.philicoless.35"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 p-2 rounded-full hover:bg-primary hover:text-white transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="h-5 w-5" />
          </a>
          <a
            href="https://x.com/ntdm205028807?t=a4pYrh8HFfbCSN3NMoap0Q&s=09"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 p-2 rounded-full hover:bg-primary hover:text-white transition-colors"
            aria-label="Twitter"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 p-2 rounded-full hover:bg-primary hover:text-white transition-colors"
            aria-label="YouTube"
          >
            <Youtube className="h-5 w-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/theophile-niyonizeye-44b291337?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 p-2 rounded-full hover:bg-primary hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  )
}
