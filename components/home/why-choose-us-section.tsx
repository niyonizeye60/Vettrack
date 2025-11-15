"use client"

import Image from "next/image"
import { Award, Zap, Globe } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

// Features will be translated dynamically

export default function WhyChooseUsSection() {
  const { t } = useLanguage()
  
  const features = [
    {
      icon: <Award className="h-8 w-8 text-primary" />,
      title: t('home.features.expert.title'),
      description: t('home.features.expert.desc'),
      image:
        "https://www.shutterstock.com/image-photo/african-american-man-veterinarian-inspecting-600nw-2519389149.jpg",
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: t('home.features.technology.title'),
      description: t('home.features.technology.desc'),
      image:
        "https://supplyingthefuture.weebly.com/uploads/1/1/7/3/117383900/sensor-technology-jpg-2000x900-q70-crop-smart-subsampling-2-upscale_orig.jpg",
    },
    {
      icon: <Globe className="h-8 w-8 text-primary" />,
      title: t('home.features.comprehensive.title'),
      description: t('home.features.comprehensive.desc'),
      image:
        "https://farmersreviewafrica.com/wp-content/uploads/2022/03/DSC_1457.jpg",
    },
  ]
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="heading-lg mb-4">{t('home.features.title')}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('home.features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="salon-card overflow-hidden group hover-lift">
              <div className="relative h-48">
                <Image
                  src={feature.image || "/placeholder.svg"}
                  alt={feature.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-white/90 rounded-full mr-3">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="/about"
            className="inline-flex items-center text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            {t('common.learnMore')} {t('nav.about')}
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
