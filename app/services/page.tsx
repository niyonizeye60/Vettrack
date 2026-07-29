import type { Metadata } from "next"
import ServicesTabs from "@/components/services/services-tabs"
import ServicesBanner from "@/components/services/services-banner"
import ServicesSearchResults from "@/components/services/services-search-results"
import SearchBar from "@/components/search/search-bar"

export const metadata: Metadata = {
  title: "Our Services - NTDM Animal Hospital",
  description:
    "Explore our wide range of animal health services including tracking devices, veterinary consultations, disease monitoring, and animal sales.",
}

export default function ServicesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | undefined }
}) {
  const hasLocationParams = searchParams?.lat || searchParams?.lng || searchParams?.district || searchParams?.q

  if (hasLocationParams) {
    return (
      <>
        <ServicesBanner title="Nearby Services" subtitle="Services sorted by distance from your location" />
        <div className="py-16">
          <div className="container-custom">
            <SearchBar />
            <ServicesSearchResults searchParams={searchParams!} />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <ServicesBanner />
      <div className="py-16">
        <div className="container-custom">
          <SearchBar />
          <ServicesTabs />
        </div>
      </div>
    </>
  )
}
