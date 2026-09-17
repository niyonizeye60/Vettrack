"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ServicesSearchInput from "@/components/services/services-search-input"
import ServicesSearchResults from "@/components/services/services-search-results"
import ServicesTabs from "@/components/services/services-tabs"

/**
 * Search section of /services.
 *
 * With no query the page keeps its normal browse experience (the tabs). Once a
 * query (or a district/location filter) is present, the search results - sorted
 * by distance from the detected location - take over, with the tabs coming
 * back when the query is cleared.
 */
export default function ServicesSearchSection() {
  const searchParams = useSearchParams()
  const hasQuery = Boolean(searchParams.get("q") || searchParams.get("district"))

  if (hasQuery) {
    return <ServicesSearchResults searchParams={Object.fromEntries(searchParams.entries())} />
  }

  return (
    <div className="space-y-10">
      <ServicesSearchInput />
      <Suspense fallback={null}>
        <ServicesTabs />
      </Suspense>
    </div>
  )
}
