"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"

export default function ServicesSearchInput() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)

  const doSearch = () => {
    const q = query.trim()
    if (!q) return

    setSearching(true)
    const params = new URLSearchParams()
    params.set("q", q)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          params.set("lat", pos.coords.latitude.toString())
          params.set("lng", pos.coords.longitude.toString())
          router.push(`/services?${params.toString()}`)
        },
        () => {
          router.push(`/services?${params.toString()}`)
        },
        { timeout: 3000, enableHighAccuracy: false }
      )
    } else {
      router.push(`/services?${params.toString()}`)
    }
  }

  return (
    <div className="mb-8">
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search services, products, animals... (sorted by nearest location)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          className="w-full h-12 pl-12 pr-14 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base shadow-sm"
        />
        <button
          onClick={doSearch}
          disabled={searching || !query.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>Search</span>
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        Results are sorted by nearest location — we'll detect your location when you search
      </p>
    </div>
  )
}
