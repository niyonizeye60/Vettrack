import type { Metadata } from "next"
import { Suspense } from "react"
import ServicesSearchSection from "@/components/services/services-search-section"
import ServicesBanner from "@/components/services/services-banner"

export const metadata: Metadata = {
  title: "Our Services - NTDM Vettrack",
  description:
    "Explore our wide range of animal health services including tracking devices, veterinary consultations, disease monitoring, and animal sales.",
}

export default function ServicesPage() {
  return (
    <>
      <ServicesBanner />
      <div className="py-16">
        <div className="container-custom">
          <Suspense fallback={null}>
            <ServicesSearchSection />
          </Suspense>
        </div>
      </div>
    </>
  )
}
