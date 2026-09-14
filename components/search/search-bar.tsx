"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, MapPin, Loader2, Navigation, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

interface SearchResult {
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
  href: string
}

const TYPE_COLORS: Record<string, string> = {
  Animal: "text-green-600 bg-green-50",
  Drug: "text-blue-600 bg-blue-50",
  Feed: "text-amber-600 bg-amber-50",
  Category: "text-purple-600 bg-purple-50",
  "Animal Record": "text-teal-600 bg-teal-50",
  Farmer: "text-indigo-600 bg-indigo-50",
  Veterinarian: "text-rose-600 bg-rose-50",
}

export default function SearchBar({ variant = "default" }: { variant?: "default" | "hero" }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [locationDetected, setLocationDetected] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Detect user location on mount
  useEffect(() => {
    if (navigator.geolocation && !locationDetected) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude)
          setUserLng(pos.coords.longitude)
          setLocationDetected(true)
        },
        () => {
          // Silently fail — search works without location
          setLocationDetected(true)
        },
        { timeout: 5000 }
      )
    } else {
      setLocationDetected(true)
    }
  }, [locationDetected])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ q: q.trim() })
      if (userLat && userLng) {
        params.set("lat", userLat.toString())
        params.set("lng", userLng.toString())
        params.set("maxDistance", "500")
      }
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setResults(data.results || [])
      setShowResults(true)
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }, [userLat, userLng])

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const isHero = variant === "hero"

  return (
    <div className={`relative w-full mx-auto ${isHero ? "max-w-xl" : "max-w-md"}`}>
      <div className="relative">
        {isHero ? (
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
        <Input
          ref={inputRef}
          type="text"
          placeholder={t('common.search') || "Search services, products, animals..."}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className={`${isHero
            ? "pl-14 pr-10 h-14 text-lg bg-white/15 border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 backdrop-blur-sm focus:ring-primary/50"
            : "pl-10 pr-10 h-10 text-sm bg-white/90 border-gray-200 focus:bg-white focus:ring-primary/30"
          } rounded-full shadow-sm focus:outline-none focus:ring-2 transition-all`}
        />
        {loading && (
          <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 animate-spin ${isHero ? "h-5 w-5 text-white/70" : "h-4 w-4 text-primary"}`} />
        )}
        {!loading && query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
            {isHero ? (
              <X className="h-5 w-5 text-white/60 hover:text-white" />
            ) : (
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl z-[100] max-h-96 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {query ? "No results found" : "Start typing to search..."}
            </div>
          ) : (
            <div className="py-2">
              {results.slice(0, 15).map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  onClick={() => setShowResults(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[result.type] || "text-gray-600 bg-gray-50"}`}
                    >
                      {result.type}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                    <p className="text-xs text-gray-500 truncate">{result.description}</p>
                    {result.price && (
                      <p className="text-xs font-semibold text-primary mt-0.5">RWF {result.price.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {result.distance !== undefined && result.distance <= 500 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ color: result.distance <= 5 ? '#16a34a' : result.distance <= 20 ? '#2563eb' : '#6b7280' }}
                      >
                        <Navigation className="h-3 w-3" />
                        {result.distance < 1
                          ? `${Math.round(result.distance * 1000)} m`
                          : `${result.distance.toFixed(1)} km`
                        }
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {results.length > 15 && (
                <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
                  + {results.length - 15} more results
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
