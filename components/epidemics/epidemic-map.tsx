"use client"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

export interface EpidemicMapCase {
  _id: string
  diseaseName: string
  animalType?: string | null
  animalName?: string | null
  farmerName?: string | null
  affectedCount?: number
  severity?: string
  latitude: number
  longitude: number
  locationLabel?: string | null
  district?: string | null
  sector?: string | null
  status?: string
  reportedAt?: string
}

// Pins are intentionally uniform - case statuses are managed in the tables,
// not shown on the map.
const PIN_COLOR = "#ef4444"

interface EpidemicMapProps {
  cases?: EpidemicMapCase[]
  heightClassName?: string
  selectedCaseId?: string | null
  onSelect?: (c: EpidemicMapCase) => void
}

export default function EpidemicMap({
  cases = [],
  heightClassName = "h-96",
  selectedCaseId,
  onSelect,
}: EpidemicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<any[]>([])
  const markersRef = useRef<{ id: string; marker: any }[]>([])
  const [mapReady, setMapReady] = useState(false)

  // Leaflet's base CSS is bundled locally via app/layout.tsx (no CDN needed).
  // Init map once
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || mapInstanceRef.current) return
    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return
      const el = mapRef.current as any
      if (el._leaflet_id) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      const map = L.map(el, {
        center: [-1.9403, 29.8739],
        zoom: 8,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Render markers whenever cases change.
  // NOTE: selectedCaseId is deliberately NOT a dependency - restyling the
  // selected pin must not destroy and recreate layers (which would close any
  // open popup the moment the user clicks a pin). Selection styling is applied
  // in a separate effect below.
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear previous custom layers (markers)
    layersRef.current.forEach((layer) => map.removeLayer(layer))
    layersRef.current = []
    markersRef.current = []

    import("leaflet").then((L) => {
      // Case markers
      cases.forEach((c) => {
        const color = PIN_COLOR

        const icon = L.divIcon({
          html: `<div class="epidemic-pin ${selectedCaseId === c._id ? "epidemic-pin-selected" : ""}" style="--pin-color:${color}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`,
          className: "epidemic-marker-wrap",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        })

        const marker = L.marker([c.latitude, c.longitude], { icon }).addTo(map)
        // Lift the selected pin above neighbours at creation time too, so it
        // survives case refreshes (the restyle effect below re-applies it on
        // selection changes).
        marker.setZIndexOffset?.(selectedCaseId === c._id ? 1000 : 0)
        layersRef.current.push(marker)
        markersRef.current.push({ id: c._id, marker })

        const rows = [
          `<div class="flex items-center gap-1.5"><span class="epidemic-dot" style="background:${color}"></span><span class="font-bold text-gray-900">${c.diseaseName}</span></div>`,
          c.animalName ? `<div class="text-gray-600">${c.animalName}${c.animalType ? ` · ${c.animalType}` : ""}</div>` : c.animalType ? `<div class="text-gray-600">${c.animalType}</div>` : "",
          c.farmerName ? `<div class="text-gray-500">Reported by ${c.farmerName}</div>` : "",
          c.district ? `<div class="text-gray-600"><strong>${c.district}</strong>${c.sector ? ` · ${c.sector}` : ""}</div>` : "",
          `<div class="text-gray-500">${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}</div>`,
          c.affectedCount ? `<div class="text-gray-600">${c.affectedCount} animal(s) affected</div>` : "",
          c.reportedAt ? `<div class="text-xs text-gray-400">${new Date(c.reportedAt).toLocaleString()}</div>` : "",
        ].filter(Boolean).join("")

        if (onSelect) {
          // Management pages show a detail card on selection — skip the popup
          // so the two don't stack on top of each other (no visual noise).
          marker.on("click", () => onSelect(c))
        } else {
          marker.bindPopup(`<div class="epidemic-popup">${rows}</div>`, { maxWidth: 280 })
        }
      })

      // Fit bounds when there are markers
      if (cases.length > 0) {
        const group = L.featureGroup(cases.map((c) => L.marker([c.latitude, c.longitude])))
        const bounds = group.getBounds().pad(0.15)
        if (bounds.isValid() && !bounds.equals(L.latLngBounds([-1.9403, 29.8739], [-1.9403, 29.8739]))) {
          map.fitBounds(bounds, { maxZoom: 11 })
        } else {
          map.setView([-1.9403, 29.8739], 8)
        }
      } else {
        map.setView([-1.9403, 29.8739], 8)
      }
    })
  }, [mapReady, cases, onSelect])

  // Restyle the selected pin in place so open popups are never destroyed.
  // Also lift the selected marker above neighbouring pins so it never hides
  // behind another marker when pins are close together.
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    markersRef.current.forEach(({ id, marker }) => {
      const el = marker.getElement?.()
      el?.querySelector(".epidemic-pin")?.classList.toggle("epidemic-pin-selected", id === selectedCaseId)
      marker.setZIndexOffset?.(id === selectedCaseId ? 1000 : 0)
    })
  }, [selectedCaseId, mapReady])

  return (
    // isolate + z-0: the map keeps its own stacking context pinned at the page
    // flow level, so its popups/controls can never override other page elements
    // (header, footer, cards, tooltips) or render above a dialog overlay.
    <div className="relative isolate z-0">
      <div ref={mapRef} className={`w-full ${heightClassName} rounded-xl border border-gray-200 shadow-sm bg-gray-100`} />

      {!mapReady && (
        <div className="absolute inset-0 bg-gray-100 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            Loading map…
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        .epidemic-marker-wrap {
          background: transparent;
          border: none;
        }
        .epidemic-pin {
          position: relative;
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: var(--pin-color, #ef4444);
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
        }
        .epidemic-pin svg {
          transform: rotate(45deg);
          color: #fff;
        }
        .epidemic-pin-selected {
          transform: rotate(-45deg) scale(1.25);
          box-shadow: 0 0 0 4px rgba(239,68,68,0.25);
        }
        .epidemic-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          flex-shrink: 0;
        }
        .epidemic-popup {
          min-width: 190px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        }
        .leaflet-popup-content {
          margin: 12px 14px;
        }
        .leaflet-container {
          font-family: inherit;
          background: #e5e7eb;
        }
        .leaflet-marker-icon {
          transition: z-index 0s;
        }
        /* Keep every Leaflet layer low so no pane/control can ever bleed out
           of the map and paint over a dialog (dialogs sit at z-50). The
           isolate wrapper already traps them; these caps are a safeguard.
           Internal order is preserved: tiles < markers < tooltips < popups
           < controls. */
        .leaflet-tile-pane { z-index: 10 !important; }
        .leaflet-overlay-pane { z-index: 15 !important; }
        .leaflet-shadow-pane { z-index: 20 !important; }
        .leaflet-marker-pane { z-index: 25 !important; }
        .leaflet-tooltip-pane { z-index: 30 !important; }
        .leaflet-popup-pane { z-index: 35 !important; }
        .leaflet-control-container .leaflet-top,
        .leaflet-control-container .leaflet-bottom { z-index: 40 !important; }
      `}</style>
    </div>
  )
}
