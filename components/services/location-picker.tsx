"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Crosshair, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number) => void
  readOnly?: boolean
}

export default function LocationPicker({ latitude, longitude, onLocationChange, readOnly }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [detecting, setDetecting] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [latInput, setLatInput] = useState(latitude?.toString() || "")
  const [lngInput, setLngInput] = useState(longitude?.toString() || "")
  const [error, setError] = useState("")

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || mapInstanceRef.current) return

    let isMounted = true

    import("leaflet").then((L) => {
      if (!isMounted || !mapRef.current) return

      // Fix default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current, {
        center: [latitude || -1.9403, longitude || 29.8739],
        zoom: latitude && longitude ? 13 : 8,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      // Add click handler to place marker
      if (!readOnly) {
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng
          placeMarker(lat, lng)
          onLocationChange(lat, lng)
          setLatInput(lat.toFixed(6))
          setLngInput(lng.toFixed(6))
        })
      }

      // If coordinates provided, place initial marker
      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude]).addTo(map)
        markerRef.current = marker
      }

      mapInstanceRef.current = map
      setMapReady(true)

      // Fix map rendering after a short delay
      setTimeout(() => map.invalidateSize(), 500)
    })

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const placeMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return
    import("leaflet").then((L) => {
      if (markerRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current)
      }
      const marker = L.marker([lat, lng], { draggable: !readOnly }).addTo(mapInstanceRef.current)
      if (!readOnly) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng()
          onLocationChange(pos.lat, pos.lng)
          setLatInput(pos.lat.toFixed(6))
          setLngInput(pos.lng.toFixed(6))
        })
      }
      markerRef.current = marker
    })
  }

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }
    setDetecting(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        onLocationChange(lat, lng)
        setLatInput(lat.toFixed(6))
        setLngInput(lng.toFixed(6))
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15)
          placeMarker(lat, lng)
        }
        setDetecting(false)
      },
      (err) => {
        setError(`Location detection failed: ${err.message}`)
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleManualInput = (type: "lat" | "lng", value: string) => {
    if (type === "lat") setLatInput(value)
    else setLngInput(value)

    const lat = type === "lat" ? parseFloat(value) : parseFloat(latInput)
    const lng = type === "lng" ? parseFloat(value) : parseFloat(lngInput)
    const newLat = type === "lat" ? parseFloat(value) : latitude
    const newLng = type === "lng" ? parseFloat(value) : longitude

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      onLocationChange(newLat || lat, newLng || lng)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([newLat || lat, newLng || lng], 15)
        placeMarker(newLat || lat, newLng || lng)
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Location on Map
        </Label>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={handleAutoDetect} disabled={detecting}>
            {detecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Crosshair className="h-3 w-3 mr-1" />}
            {detecting ? "Detecting..." : "Auto-detect"}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg border border-gray-200 z-0"
        style={{ background: "#f0f0f0" }}
      />

      {!mapReady && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map...
        </div>
      )}

      {/* Coordinates display */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lat" className="text-xs">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="0.000001"
            placeholder="-1.940278"
            value={latInput}
            onChange={(e) => handleManualInput("lat", e.target.value)}
            readOnly={readOnly}
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="lng" className="text-xs">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="0.000001"
            placeholder="29.873889"
            value={lngInput}
            onChange={(e) => handleManualInput("lng", e.target.value)}
            readOnly={readOnly}
            className="text-sm"
          />
        </div>
      </div>

      {latitude && longitude && (
        <p className="text-xs text-gray-400">
          Click on the map to place a marker, drag to adjust. Or enter coordinates manually.
        </p>
      )}
    </div>
  )
}
