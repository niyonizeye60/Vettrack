"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AboutContent() {
  const { t } = useLanguage()
  
  return (
    <>
      <div className="bg-gradient-to-r from-primary to-primary/80 py-20 mb-12">
        <div className="container-custom">
          <h1 className="heading-xl text-white text-center mb-4">{t('about.title')}</h1>
          <p className="text-xl text-white/90 text-center max-w-2xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>
      </div>
      <div className="container-custom mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="heading-lg mb-6">{t('about.history')}</h2>
            <p className="text-gray-600 mb-4">
              Founded in 2020, NTDM Animal Hospital has been at the forefront of veterinary innovation in Rwanda. Our
              journey began with a simple vision: to revolutionize animal health management through technology and
              expert care.
            </p>
            <p className="text-gray-600 mb-4">
              Over the years, we've grown from a small local clinic to a comprehensive animal health service provider,
              thanks to our commitment to excellence and our passionate team of skilled veterinarians and technologists.
            </p>
            <Button asChild className="mt-4">
              <Link href="/booking">{t('home.hero.bookConsultation')}</Link>
            </Button>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop&crop=focalpoint&auto=format&q=80"
              alt="NTDM Animal Hospital Team"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-primary/5 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">{t('about.mission')}</h2>
              <p className="text-gray-700">
                To revolutionize animal health and management through technology-driven innovation.
                At NTDM ANIMAL HOSPITAL, we provide smart tracking devices, AI-powered disease prediction, and an integrated digital platform. where farmers can buy feeds, medicines, and sell animals while connecting directly with veterinarians.
                Our mission is to empower farmers, improve livestock productivity, and support the government's efforts to monitor the national animal population efficiently and accurately.
              </p>
            </div>
            <div className="bg-secondary/5 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">{t('about.vision')}</h2>
              <p className="text-gray-700">
                To become Africa's leading smart animal health and management service, combining IoT and Artificial Intelligence to build a healthier, more sustainable livestock sector.
                We envision a future where every farmer in Rwanda and beyond benefits from digital veterinary access, real-time disease report and prediction, and a connected agricultural marketplace that drives productivity and strengthens public health.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="heading-lg text-center mb-12">{t('about.team')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                image: "/WhatsApp Image 2025-03-28 at 12.07.22_620388c5.jpg",
                name: "Dr. Theophile Niyonizeye",
                role: "Chief Veterinarian",
                specialty: "Large Animal Medicine & Certified in IoT",
              },
              {
                image: "/NEW PHOTO.jpg",
                name: "Dr. Charline Rutagengwa",
                role: "Senior Veterinarian",
                specialty: "Small Animal Medicine",
              },
              {
                image: "/sano2.jpg",
                name: "Dr. Gerard Sano",
                role: "Technology Director",
                specialty: "Animal Tracking Systems",
              },
              {
                image: "/WhatsApp Image 2025-05-15 at 15.48.58_74fbf054.jpg",
                name: "Dr. Benitte Ikuzwe",
                role: "Managing Director",
                specialty: "Veterinanry Technician & Certified in Finance",
              },
            ].map((member, index) => (
              <div key={index} className="salon-card text-center p-6">
                <div className="relative w-40 h-40 rounded-full overflow-hidden mx-auto mb-4">
                  <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
                </div>
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-primary font-medium mb-2">{member.role}</p>
                <p className="text-gray-600 mb-4">Specialist in {member.specialty}</p>
                <Link href="/booking" className="text-primary hover:text-primary/80 transition-colors">
                  {t('home.hero.bookConsultation')}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="heading-lg text-center mb-12">{t('about.mentor')}</h2>
          {[
            {
              image: "/Supervisor.jpg",
              name: "Dr. Richard GASHURURU",
              role: "Mentor",
              specialty: "PHD holder",
            },
          ].map((member, index) => (
            <div key={index} className="salon-card text-center p-6">
              <div className="relative w-40 h-40 rounded-full overflow-hidden mx-auto mb-4">
                <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
              </div>
              <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
              <p className="text-primary font-medium mb-2">{member.role}</p>
              <p className="text-gray-600 mb-4"> {member.specialty}</p>
              <Link href="/booking" className="text-primary hover:text-primary/80 transition-colors">
                {t('home.hero.bookConsultation')}
              </Link>
            </div>
          ))}
        </div>
        <br />

        <div className="text-center">
          <h2 className="heading-lg mb-6">{t('about.experience')}</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('about.experienceParagraph')}
          </p>
          <Button asChild size="lg">
            <Link href="/booking">{t('booking.title')} {t('common.today')}</Link>
          </Button>
        </div>
      </div>
    </>
  )
}