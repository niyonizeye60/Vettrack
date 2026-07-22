"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Laptop, MessageSquare, Bell, FileText } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

// Portal features will be translated dynamically

export default function PortalSection() {
  const { t } = useLanguage()
  
  const portalFeatures = [
    {
      icon: <Laptop className="h-6 w-6 text-primary" />,
      title: t('home.portal.management.title'),
      description: t('home.portal.management.desc'),
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      title: t('home.portal.consultations.title'),
      description: t('home.portal.consultations.desc'),
    },
    {
      icon: <Bell className="h-6 w-6 text-primary" />,
      title: t('home.portal.alerts.title'),
      description: t('home.portal.alerts.desc'),
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: t('home.portal.records.title'),
      description: t('home.portal.records.desc'),
    },
  ]
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="heading-lg mb-6">{t('home.portal.title')}</h2>
            <p className="text-xl text-gray-600 mb-8">
              {t('home.portal.subtitle')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {portalFeatures.map((feature, index) => (
                <div key={index} className="flex">
                  <div className="mr-4 mt-1">
                    <div className="p-2 bg-primary/10 rounded-full">{feature.icon}</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/login">{t('home.portal.login')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">{t('home.portal.createAccount')}</Link>
              </Button>
            </div>
          </div>

          <div className="relative h-[500px] rounded-lg overflow-hidden shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop&crop=focalpoint&auto=format&q=80"
              alt="Farmer using tablet to track animals"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('home.portal.trackTitle')}</h3>
                <p className="text-gray-700">
                  {t('home.portal.trackDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
