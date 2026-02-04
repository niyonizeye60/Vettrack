import Link from "next/link"
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, Clock, Youtube, Linkedin } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="bg-gray-900 text-white pt-20 pb-10">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* About NTDM Animal Hospital */}
          <div>
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">NTDM</span>
              </div>
              <span className="text-2xl font-bold gradient-text">NTDM Animal Hospital</span>
            </div>
            <p className="text-gray-400 mb-6">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/ntdm_animal_hosipital?igsh=bjBuZW40YXpnN3Zm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://www.facebook.com/niyonizeye.philicoless.35"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href="https://x.com/ntdm205028807?t=a4pYrh8HFfbCSN3NMoap0Q&s=09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="Twitter (X)"
              >
                <Twitter className="h-6 w-6" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-6 w-6" />
              </a>
              <a
                href="https://www.linkedin.com/in/theophile-niyonizeye-44b291337?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <span className="w-8 h-0.5 bg-primary mr-3"></span>
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/services" className="text-gray-400 hover:text-primary transition-colors">
                  {t('nav.services')}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-primary transition-colors">
                  {t('Customer Portal')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-primary transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-primary transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link href="/booking" className="text-gray-400 hover:text-primary transition-colors">
                  {t('Book Consultation')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <span className="w-8 h-0.5 bg-primary mr-3"></span>
              {t('footer.contact')}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
                <span className="text-gray-400">Nyagatare, Rwanda</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-6 w-6 text-primary mr-3" />
                <span className="text-gray-400">+250 78 072 1800</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-6 w-6 text-primary mr-3" />
                <span className="text-gray-400">info@vettrack.rw</span>
              </li>
            </ul>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <span className="w-8 h-0.5 bg-primary mr-3"></span>
              {t('contact.hours')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Clock className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
                <div>
                  <p className="text-gray-400">{t('footer.weekdays')}:</p>
                  <p className="font-semibold text-white">8:00 AM - 6:00 PM</p>
                </div>
              </li>
              <li className="flex items-start">
                <Clock className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
                <div>
                  <p className="text-gray-400">{t('footer.saturday')}:</p>
                  <p className="font-semibold text-white">9:00 AM - 4:00 PM</p>
                </div>
              </li>
              <li className="flex items-start">
                <Clock className="h-6 w-6 text-primary shrink-0 mt-0.5 mr-3" />
                <div>
                  <p className="text-gray-400">{t('contact.emergency')}:</p>
                  <p className="font-semibold text-white">24/7</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Subscription */}
        <div className="border-t border-gray-800 pt-10 pb-8 mb-8">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-semibold mb-4">{t('footer.newsletter')}</h3>
            <p className="text-gray-400 mb-6">
              {t('footer.newsletterDesc')}
            </p>
            <form className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="flex-grow px-4 py-3 rounded-full bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="btn-primary">
                {t('footer.subscribe')}
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {t('footer.company')}. {t('footer.rights')}.</p>
          <p className="mt-2">
            <span className="inline-block">{t('footer.serving')}</span>
            <span className="mx-2">|</span>
            <span className="inline-block">{t('footer.tagline')}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
