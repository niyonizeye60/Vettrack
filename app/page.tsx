import type { Metadata } from "next"
import HeroSection from "@/components/home/hero-section"
import ServicesOverview from "@/components/home/services-overview"
import WhyChooseUsSection from "@/components/home/why-choose-us-section"
import TestimonialsSection from "@/components/home/testimonials-section"
import PortalSection from "@/components/home/portal-section"
import CTASection from "@/components/home/cta-section"

export const metadata: Metadata = {
  title: "NTDM Vettrack - Track with IoT, Consult, and Care all powered by AI",
  description:
    "Leading Vettrack in Rwanda offering tracking devices (IoT), veterinary consultations, Disease monitoring, farm management all powered by AI and animal, medicine, feeds market place.",
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
