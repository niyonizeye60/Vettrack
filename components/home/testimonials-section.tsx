"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

// Testimonials will be translated dynamically

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const { t } = useLanguage()
  
  const testimonials = [
    {
      id: 1,
      name: "Jean Mutesi",
      role: t('home.testimonials.farmer'),
      quote: t('home.testimonials.quote1'),
      rating: 5,
    },
    {
      id: 2,
      name: "Emmanuel Hakizimana",
      role: t('home.testimonials.petOwner'),
      quote: t('home.testimonials.quote2'),
      rating: 5,
    },
    {
      id: 3,
      name: "Alice Uwimana",
      role: t('home.testimonials.poultryFarmer'),
      quote: t('home.testimonials.quote3'),
      rating: 4,
    },
    {
      id: 4,
      name: "Patrick Niyonzima",
      role: t('home.testimonials.dairyFarmer'),
      quote: t('home.testimonials.quote4'),
      rating: 5,
    },
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (autoplay) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
      }, 5000)
    }

    return () => clearInterval(interval)
  }, [autoplay])

  const handlePrev = () => {
    setAutoplay(false)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length)
  }

  const handleNext = () => {
    setAutoplay(false)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
  }

  return (
    <section className="salon-section bg-gradient-to-br from-primary/5 to-secondary/5 relative overflow-hidden animate-fadeIn py-20">
      {/* Decorative Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-salon-pattern"></div>
      </div>

      <div className="container-custom relative z-10">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">{t('home.testimonials.title')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('home.testimonials.subtitle')}
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                  <div className="salon-card p-8 shadow-salon">
                    <div className="flex flex-col md:flex-row md:items-center mb-6">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden mb-4 md:mb-0 md:mr-4">
                        <Image
                          src="/placeholder.svg"
                          alt={testimonial.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{testimonial.name}</h3>
                        <p className="text-gray-600 text-sm">{testimonial.role}</p>
                        <div className="flex text-yellow-500 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4" fill={i < testimonial.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -top-2 -left-2 text-5xl text-primary opacity-20">"</div>
                      <blockquote className="text-gray-700 italic relative z-10 pl-4">{testimonial.quote}</blockquote>
                      <div className="absolute -bottom-4 -right-2 text-5xl text-primary opacity-20">"</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handlePrev}
            className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex justify-center mt-6 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setAutoplay(false)
                  setCurrentIndex(index)
                }}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? "bg-primary" : "bg-gray-300"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
