"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import type { TrackingDashboardData } from "@/lib/tracking/types"

const POLL_MS = 30_000

/** Loads one collar's dashboard and refreshes it every 30 s while the page is open. */
export function useDeviceDashboard(deviceRegistrationId: string | null, limit: number) {
  const [data, setData] = useState<TrackingDashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  // Ignore answers to a request for a device that is no longer selected.
  const current = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    const id = deviceRegistrationId
    if (!id) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/tracking/devices/${id}/data?limit=${limit}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (current.current !== id) return
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setData(json as TrackingDashboardData)
      setError(null)
      setLastUpdated(new Date().toLocaleString())
    } catch (err) {
      if (current.current !== id) return
      console.error("Failed to load tracking data:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (current.current === id) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [deviceRegistrationId, limit])

  // A different collar starts from a blank page...
  useEffect(() => {
    current.current = deviceRegistrationId
    setData(null)
    setError(null)
    setLoading(!!deviceRegistrationId)
  }, [deviceRegistrationId])

  // ...while a new reading count just refetches over what is shown.
  useEffect(() => {
    if (!deviceRegistrationId) return
    refresh()
    const interval = setInterval(refresh, POLL_MS)
    return () => clearInterval(interval)
  }, [deviceRegistrationId, refresh])

  return { data, loading, refreshing, error, lastUpdated, refresh }
}
