"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Loader2, MapPin, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { rwandaData } from "@/lib/rwanda-data"

const ALL_DISTRICTS = "all"
const LIVE_DEBOUNCE_MS = 400

/**
 * Search controls for /services: text input + district anchor.
 *
 * Realtime by character: typing updates the URL (debounced) and the results
 * below re-fetch - no button press needed. The district picker navigates
 * immediately. GPS is deliberately NOT requested here; the results component
 * detects location once and reuses it across keystrokes.
 */
export default function ServicesSearchInput({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue)
  const [pending, setPending] = useState(false)
  const district = searchParams.get("district") ?? ""
  const districts = Object.keys(rwandaData).sort()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stay in sync when the URL changes from elsewhere (deep link, clear link).
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "")
  }, [searchParams])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const navigate = (q: string, d: string) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (d && d !== ALL_DISTRICTS) params.set("district", d)
    const qs = params.toString()
    // replace, not push: per-character searches shouldn't flood history
    router.replace(qs ? `/services?${qs}` : "/services", { scroll: false })
    setPending(false)
  }

  const handleInput = (value: string) => {
    setQuery(value)
    setPending(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate(value.trim(), district), LIVE_DEBOUNCE_MS)
  }

  const navigateNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    navigate(query.trim(), district)
  }

  const onDistrictChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    navigate(query.trim(), value)
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search services, products, animals... (results update as you type)"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigateNow()}
            className="w-full h-12 pl-12 pr-20 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base shadow-sm"
          />
          {pending && (
            <Loader2 className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
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
          : "Results update as you type — sorted from your nearest location"}
      </p>
    </div>
  )
}
