import type { Metadata } from "next"
import ServicesTabs from "@/components/services/services-tabs"
import ServicesBanner from "@/components/services/services-banner"

export const metadata: Metadata = {
  title: "Our Services - NTDM Animal Hospital",
  description:
    "Explore our wide range of animal health services including tracking devices, veterinary consultations, disease monitoring, and animal sales.",
}

export default function ServicesPage() {
  return (
    <>
      <ServicesBanner />
      <div className="py-16">
        <div className="container-custom">
          <ServicesTabs />
        </div>
      </div>
    </>
  )
}
