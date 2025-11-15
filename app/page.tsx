import type { Metadata } from "next"
import HeroSection from "@/components/home/hero-section"
import ServicesOverview from "@/components/home/services-overview"
import WhyChooseUsSection from "@/components/home/why-choose-us-section"
import TestimonialsSection from "@/components/home/testimonials-section"
import PortalSection from "@/components/home/portal-section"
import CTASection from "@/components/home/cta-section"

export const metadata: Metadata = {
  title: "NTDM Animal Hospital - Track, Consult, and Care",
  description:
    "Leading animal hospital in Rwanda offering tracking devices, veterinary consultations, disease monitoring, and animal sales.",
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <ServicesOverview />
      <WhyChooseUsSection />
      <TestimonialsSection />
      <PortalSection />
      <CTASection />
    </>
  )
}
