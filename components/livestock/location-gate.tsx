"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MapPin } from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCurrentLocation } from "@/hooks/use-current-location"

interface LocationFields {
  lat?: number
  lng?: number
  accuracy?: number | null
}

/** Stringify location fields for a DELETE request's query string, dropping nullish values. */
export function toQueryFields(fields: LocationFields): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value != null) out[key] = String(value)
  }
  return out
}

/**
 * Shared on-site gate for insemination/disease/vaccination CRUD forms.
 *
 * `submitWithLocationGate` attaches the caller's current position to a request. If the
 * server rejects it for being outside the farm's registered sector, or for missing
 * location entirely (see lib/farm-access.ts), `dialog` shows the reason. This is a
 * hard block - there is no override, the caller must move and retry.
 *
 * While a superadmin has the restriction switched off (lib/farm-location-restriction.ts)
 * the GPS prompt is skipped. That is only a UX shortcut - the server re-reads the
 * setting on every write, so a stale value here can never let a write through.
 */
export function useLocationGatedRequest() {
  const { getLocation } = useCurrentLocation()
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  // null until the setting has loaded, and treated as ON meanwhile.
  const restrictionEnabledRef = useRef<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/system/farm-location-restriction")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.enabled === "boolean") restrictionEnabledRef.current = data.enabled
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const submitWithLocationGate = useCallback(
    async (attempt: (fields: LocationFields) => Promise<Response>): Promise<Response> => {
      const send = async (withLocation: boolean) => {
        const loc = withLocation ? await getLocation() : null
        const fields: LocationFields = loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy } : {}
        return attempt(fields)
      }

      const skippedLocation = restrictionEnabledRef.current === false
      let res = await send(!skippedLocation)

      if (res.status === 403) {
        let body = await res.clone().json().catch(() => null)
        // The restriction was switched back on after this page loaded. Every route runs
        // the location check before writing anything, so one retry with GPS is safe.
        if (skippedLocation && body?.code === "LOCATION_REQUIRED") {
          restrictionEnabledRef.current = true
          res = await send(true)
          body = res.status === 403 ? await res.clone().json().catch(() => null) : null
        }
        if (body?.code === "SECTOR_MISMATCH" || body?.code === "LOCATION_REQUIRED") {
          setAlertMessage(body.error)
        }
      }
      return res
    },
    [getLocation]
  )

  const dialog = (
    <AlertDialog open={!!alertMessage} onOpenChange={(open) => !open && setAlertMessage(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            Wrong location
          </AlertDialogTitle>
          <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setAlertMessage(null)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { submitWithLocationGate, dialog }
}
