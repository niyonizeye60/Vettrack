"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, MapPin, X, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { rwandaData } from "@/lib/rwanda-data"
import { districtCenter } from "@/lib/rwanda-geo"

const ALL_DISTRICTS = "all"

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

interface SearchSuggestion {
  id: string
  name: string
  description: string
  type: string
  href: string
  image?: string
  price?: number
  distance?: number
}

const builtInServices: SearchSuggestion[] = [
  { id: "tracking-device", name: "Animal Health Tracking Device", description: "Real-time livestock location tracking with mobile app access.", type: "Tracking", href: "/booking?service=Animal%20Health%20Tracking%20Device" },
  { id: "health-monitoring", name: "Advanced Health Monitoring", description: "Track vital signs, activity levels, and health indicators.", type: "Monitoring", href: "/booking?service=Advanced%20Health%20Monitoring" },
  { id: "farm-management", name: "Farm Management System", description: "Farm management with analytics and livestock records.", type: "Tracking", href: "/booking?service=Farm%20Management%20System" },
  { id: "general-consultation", name: "General Veterinary Consultation", description: "A complete health check-up and consultation for any animal.", type: "Consultation", href: "/booking?service=General%20Veterinary%20Consultation" },
  { id: "virtual-consultation", name: "Virtual Consultation", description: "Connect with a veterinarian remotely by video call.", type: "Consultation", href: "/booking?service=Virtual%20Consultation" },
  { id: "emergency-consultation", name: "Emergency Consultation", description: "Immediate attention for urgent animal health issues.", type: "Consultation", href: "/booking?service=Emergency%20Consultation" },
  { id: "farm-visit", name: "Farm Visit", description: "Veterinary consultation and treatment at your farm.", type: "Consultation", href: "/booking?service=Farm%20Visit" },
  { id: "disease-screening", name: "Disease Screening", description: "Testing for common livestock and pet diseases.", type: "Monitoring", href: "/booking?service=Disease%20Screening" },
  { id: "vaccination-program", name: "Vaccination Program", description: "Scheduled vaccinations with reminders and health tracking.", type: "Monitoring", href: "/booking?service=Vaccination%20Program" },
  { id: "parasite-control", name: "Parasite Control", description: "Monitoring and treatment for internal and external parasites.", type: "Monitoring", href: "/booking?service=Parasite%20Control" },
  { id: "veterinary-kit", name: "Basic Veterinary Kit", description: "Essential medications for common animal health issues.", type: "Pharmacy", href: "/booking?service=Basic%20Veterinary%20Kit" },
  { id: "antibiotics-package", name: "Antibiotics Package", description: "Antibiotics for bacterial infections in livestock.", type: "Pharmacy", href: "/booking?service=Antibiotics%20Package" },
  { id: "vaccines-package", name: "Vaccines Package", description: "Preventative vaccines for common livestock diseases.", type: "Pharmacy", href: "/booking?service=Vaccines%20Package" },
  { id: "cattle-feed", name: "Premium Cattle Feed", description: "High-nutrition feed for dairy and beef cattle.", type: "Feed", href: "/booking?service=Premium%20Cattle%20Feed" },
  { id: "poultry-feed", name: "Poultry Feed", description: "Balanced feed for layers and broilers.", type: "Feed", href: "/booking?service=Poultry%20Feed" },
  { id: "goat-sheep-feed", name: "Goat & Sheep Feed", description: "Feed specially formulated for small ruminants.", type: "Feed", href: "/booking?service=Goat%20%26%20Sheep%20Feed" },
]

/**
 * Search controls for /services: text input + district anchor.
 *
 * Search submits on Enter or the Search button. GPS is deliberately NOT
 * requested here; the results component detects location when needed.
 */
export default function ServicesSearchInput({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [location, setLocation] = useState({ lat: -1.9441, lng: 30.0619 })
  const district = searchParams.get("district") ?? ""
  const districts = Object.keys(rwandaData).sort()
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Stay in sync when the URL changes from elsewhere (deep link, clear link).
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "")
  }, [searchParams])

  useEffect(() => {
    if (district) {
      setLocation(districtCenter(district))
      return
    }

    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {},
      { timeout: 5000 }
    )
  }, [district])

  useEffect(() => {
    const value = query.trim()
    if (value.length === 0) {
      setSuggestions([])
      setSuggestionsOpen(false)
      setSuggestionsLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const params = new URLSearchParams({
          q: value,
          lat: location.lat.toString(),
          lng: location.lng.toString(),
          maxDistance: "500",
        })
        const response = await fetch(`/api/search?${params}`, { signal: controller.signal })
        const data = await response.json()
        if (response.ok) {
          const remoteSuggestions = (data.results || []) as SearchSuggestion[]
          const localSuggestions = builtInServices.filter((suggestion) => {
            const haystack = `${suggestion.name} ${suggestion.description} ${suggestion.type}`.toLowerCase()
            return haystack.includes(value.toLowerCase())
          })
          const merged = [...remoteSuggestions, ...localSuggestions].filter(
            (suggestion, index, all) => all.findIndex((item) => item.name.toLowerCase() === suggestion.name.toLowerCase()) === index
          )
          setSuggestions(merged.slice(0, 6))
        }
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, location])

  useEffect(() => {
    const closeSuggestions = (event: MouseEvent) => {
      if (!suggestionsRef.current?.contains(event.target as Node)) setSuggestionsOpen(false)
    }
    document.addEventListener("mousedown", closeSuggestions)
    return () => document.removeEventListener("mousedown", closeSuggestions)
  }, [])

  const navigate = (q: string, d: string) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (d && d !== ALL_DISTRICTS) params.set("district", d)
    const qs = params.toString()
    // replace, not push: per-character searches shouldn't flood history
    router.replace(qs ? `/services?${qs}` : "/services", { scroll: false })
  }

  const navigateNow = () => {
    setSuggestionsOpen(false)
    navigate(query.trim(), district)
  }

  const chooseSuggestion = (suggestion: SearchSuggestion) => {
    setSuggestionsOpen(false)
    router.push(suggestion.href)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestionsOpen) {
      event.preventDefault()
      setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1))
    } else if (event.key === "ArrowUp" && suggestionsOpen) {
      event.preventDefault()
      setActiveSuggestion((current) => Math.max(current - 1, -1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        chooseSuggestion(suggestions[activeSuggestion])
      } else {
        navigateNow()
      }
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false)
    }
  }

  const onDistrictChange = (value: string) => {
    navigate(query.trim(), value)
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
        <div className="relative flex-1" ref={suggestionsRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search services, products, or animals..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveSuggestion(-1)
              setSuggestionsOpen(true)
            }}
            onFocus={() => query.trim() && setSuggestionsOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full h-12 pl-12 pr-20 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base shadow-sm"
          />
          {suggestionsOpen && query.trim() && (suggestionsLoading || suggestions.length > 0) && (
            <div className="absolute z-30 left-0 right-0 top-14 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {suggestionsLoading && suggestions.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching...
                </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.id}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                      index === activeSuggestion ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    {suggestion.image ? (
                      <img
                        src={suggestion.image}
                        alt=""
                        className="mt-0.5 h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <Search className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-900">{suggestion.name}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {suggestion.type}
                        {suggestion.distance !== undefined && ` · ${formatDistance(suggestion.distance)} away`}
                        {suggestion.description && ` · ${suggestion.description}`}
                      </span>
                      {suggestion.price !== undefined && (
                        <span className="block text-xs font-semibold text-primary">
                          RWF {suggestion.price.toLocaleString()}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          <button
            onClick={navigateNow}
            disabled={!query.trim() && !district}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>
        </div>

        <div className="relative sm:w-48">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
          <Select value={district || ALL_DISTRICTS} onValueChange={onDistrictChange}>
            <SelectTrigger className="w-full h-12 pl-9 rounded-xl border-gray-200 bg-white shadow-sm text-sm">
              <SelectValue placeholder="All districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DISTRICTS}>All districts</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {district && (
            <button
              onClick={() => onDistrictChange(ALL_DISTRICTS)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
              aria-label="Clear district filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        {district
          ? `Results anchored to ${district} — pick “All districts” to search from your live location`
          : "Search by name, category, or product"}
      </p>
    </div>
  )
}
