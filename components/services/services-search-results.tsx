"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navigation, MapPin, Loader2, Search } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { districtCenter, calcDistance } from "@/lib/rwanda-geo"
import ServicesSearchInput from "@/components/services/services-search-input"

interface ServiceResult {
  type: string
  id: string
  name: string
  description: string
  price?: number
  category?: string
  image?: string
  distance?: number
  latitude?: number
  longitude?: number
  duration?: string
  href: string
}

interface Props {
  searchParams: { [key: string]: string | undefined }
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

export default function ServicesSearchResults({ searchParams }: Props) {
  const { t } = useLanguage()
  const [results, setResults] = useState<ServiceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sortBy, setSortBy] = useState<"distance" | "price" | "name">("distance")
  const searchSeqRef = useRef(0)

  // Determine user location from params or detect
  useEffect(() => {
    const latParam = searchParams.lat
    const lngParam = searchParams.lng
    const districtParam = searchParams.district

    if (latParam && lngParam) {
      setUserLocation({ lat: parseFloat(latParam), lng: parseFloat(lngParam) })
    } else if (districtParam) {
      setUserLocation(districtCenter(districtParam))
    } else {
      // Auto-detect
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => setUserLocation({ lat: -1.9441, lng: 30.0619 }), // Default to Kigali
          { timeout: 5000 }
        )
      } else {
        setUserLocation({ lat: -1.9441, lng: 30.0619 })
      }
    }
  }, [searchParams.lat, searchParams.lng, searchParams.district])

  // Fetch and sort services
  const fetchServices = useCallback(async () => {
    if (!userLocation) return

    setLoading(true)
    setError("")
    const seq = ++searchSeqRef.current

    try {
      const params = new URLSearchParams()
      if (searchParams.q) params.set("q", searchParams.q)
      if (userLocation) {
        params.set("lat", userLocation.lat.toString())
        params.set("lng", userLocation.lng.toString())
        params.set("maxDistance", "500")
      }
      if (searchParams.district) params.set("district", searchParams.district)

      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()

      // Ignore stale responses from superseded searches (fast typing,
      // location/district changes) so an older request can't overwrite.
      if (seq !== searchSeqRef.current) return

      if (res.ok) {
        let items = (data.results || []) as ServiceResult[]

        // Calculate distance for items that have lat/lng but no distance yet
        items = items.map((item) => {
          if (item.distance === undefined && item.latitude && item.longitude && userLocation) {
            return {
              ...item,
              distance: calcDistance(userLocation.lat, userLocation.lng, item.latitude, item.longitude),
            }
          }
          return item
        })

        // Sort by distance
        items.sort((a, b) => {
          const distA = a.distance ?? Infinity
          const distB = b.distance ?? Infinity
          return distA - distB
        })

        setResults(items)
      } else {
        setError(data.error || "Failed to fetch services")
      }
    } catch {
      if (seq === searchSeqRef.current) setError("Failed to fetch services")
    } finally {
      if (seq === searchSeqRef.current) setLoading(false)
    }
  }, [userLocation, searchParams.q, searchParams.district])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return (a.price ?? 0) - (b.price ?? 0)
      case "name":
        return a.name.localeCompare(b.name)
      case "distance":
      default:
        return (a.distance ?? Infinity) - (b.distance ?? Infinity)
    }
  })

  const hasLocation = userLocation !== null

  const searchHeader = (
    <div className="flex flex-col items-center gap-2">
      <ServicesSearchInput defaultValue={searchParams.q ?? ""} />
      <Link
        href="/services"
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
      >
        <Search className="h-3.5 w-3.5 rotate-90" />
        Clear search & browse all services
      </Link>
    </div>
  )

  if (loading && results.length === 0) {
    return (
      <div className="space-y-6">
        {searchHeader}
        <div className="flex flex-col items-center justify-center py-16" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Finding nearby services...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {searchHeader}
        <div className="text-center py-16">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Could not load services</h3>
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" onClick={fetchServices} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {searchHeader}

      {/* Location Info Bar */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <Navigation className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {searchParams.district
                ? `Showing services near ${searchParams.district}`
                : hasLocation
                  ? "Showing services near your location"
                  : "Showing all services"}
            </p>
            <p className="text-xs text-gray-500">
              {sortedResults.length} service{sortedResults.length !== 1 ? "s" : ""} found
              {searchParams.q && <> · searching &ldquo;{searchParams.q}&rdquo;</>}
              {loading && <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin text-primary align-[-2px]" aria-label="Updating results" />}
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by:</span>
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {(["distance", "price", "name"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortBy === option
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option === "distance" ? "Nearest" : option === "price" ? "Price" : "Name"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {sortedResults.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No services found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {searchParams.q
              ? `No services matching "${searchParams.q}" were found near your location. Try a different search or browse all services.`
              : "No services available near your location yet. Try selecting a different district or browse all services."}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/services">Browse All Services</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedResults.map((service) => (
            <div
              key={`${service.type}-${service.id}`}
              className="salon-card overflow-hidden shadow-salon hover:shadow-salon-hover transition-all group"
            >
              <div className="relative h-48">
                <Image
                  src={service.image || "/placeholder.svg"}
                  alt={service.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Distance badge */}
                {service.distance !== undefined && (
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${
                        service.distance <= 5
                          ? "bg-green-500/90 text-white"
                          : service.distance <= 20
                            ? "bg-blue-500/90 text-white"
                            : "bg-gray-700/80 text-white"
                      }`}
                    >
                      <Navigation className="h-3 w-3" />
                      {formatDistance(service.distance)}
                    </span>
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 shadow">
                    {service.type}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">{service.description}</p>

                <div className="flex justify-between items-center mb-4">
                  <div className="text-primary font-semibold">
                    {service.price ? `RWF ${service.price.toLocaleString()}` : "Contact for price"}
                  </div>
                </div>

                <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shadow-md">
                  <Link href={service.href}>
                    <MapPin className="h-4 w-4 mr-2" />
                    {service.distance !== undefined
                      ? `${formatDistance(service.distance)} away — View`
                      : "View Details"}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
