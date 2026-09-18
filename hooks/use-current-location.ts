"use client"

import { useCallback, useState } from "react"

export interface CurrentLocation {
  lat: number
  lng: number
  accuracy: number | null
}

/**
 * One-shot read of the browser's current position, for stamping on-site-only writes
 * (insemination/disease/vaccination CRUD) with the actor's location. Resolves to null
 * on denial, timeout, or an environment with no geolocation API - callers treat that
 * the same as "location unavailable" rather than throwing.
 */
export function useCurrentLocation() {
  const [locating, setLocating] = useState(false)

  const getLocation = useCallback((): Promise<CurrentLocation | null> => {
    setLocating(true)
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocating(false)
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false)
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null })
        },
        () => {
          setLocating(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
    })
  }, [])

  return { getLocation, locating }
}
