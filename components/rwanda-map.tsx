"use client"
import { useEffect, useRef, useState } from "react"
import { MapPin, Navigation, Zap } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface LocationPoint {
  latitude: number
  longitude: number
  timestamp: string
  bpm: number
  temperature: number | null
}

interface RwandaMapProps {
  locationPoints: LocationPoint[]
  animalName: string
}

export function RwandaMap({ locationPoints, animalName }: RwandaMapProps) {
  const { t } = useLanguage()
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [selectedPoint, setSelectedPoint] = useState<LocationPoint | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current && !map) {
      // Dynamically import Leaflet
      import("leaflet").then((L) => {
        // Check if map container already has a map instance
        if (mapRef.current && (mapRef.current as any)._leaflet_id) {
          return
        }

        // Fix for default markers in Leaflet with webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        // Initialize map centered on Rwanda
        const mapInstance = L.map(mapRef.current!, {
          center: [-1.9403, 29.8739],
          zoom: 9,
          zoomControl: true
        })

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(mapInstance)

        // Add Rwanda boundary (simplified polygon)
        const rwandaBounds: [number, number][] = [
          [-1.047, 29.34],
          [-1.047, 30.899],
          [-2.84, 30.899],
          [-2.84, 29.34],
          [-1.047, 29.34],
        ]

        L.polygon(rwandaBounds, {
          color: "#10B981",
          weight: 3,
          opacity: 0.8,
          fillColor: "#10B981",
          fillOpacity: 0.1,
        }).addTo(mapInstance)

        // Add major cities
        const cities = [
          { name: "Kigali", lat: -1.9441, lng: 30.0619, isCapital: true },
          { name: "Butare", lat: -2.5967, lng: 29.7407, isCapital: false },
          { name: "Gisenyi", lat: -1.7038, lng: 29.2564, isCapital: false },
          { name: "Ruhengeri", lat: -1.4991, lng: 29.6379, isCapital: false },
          { name: "Byumba", lat: -1.5764, lng: 30.0677, isCapital: false },
        ]

        cities.forEach((city) => {
          const marker = L.circleMarker([city.lat, city.lng], {
            radius: city.isCapital ? 8 : 5,
            fillColor: city.isCapital ? "#DC2626" : "#7C3AED",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(mapInstance)

          marker.bindPopup(`<strong>${city.name}</strong>${city.isCapital ? "<br/>Capital of Rwanda" : ""}`)
        })

        setMap(mapInstance)
      })
    }
  }, [map])

  useEffect(() => {
    if (map && locationPoints.length > 0) {
      // Clear existing pet markers
      map.eachLayer((layer: any) => {
        if (layer.options && layer.options.isPetMarker) {
          map.removeLayer(layer)
        }
      })

      // Add pet location markers
      locationPoints.forEach((point, index) => {
        import("leaflet").then((L) => {
          // Create custom icon for pet location
          const petIcon = L.divIcon({
            html: `<div class="pet-marker">
              <div class="pet-marker-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div class="pet-marker-pulse"></div>
            </div>`,
            className: "custom-pet-marker",
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          })

          const marker = L.marker([point.latitude, point.longitude], {
            icon: petIcon,
            isPetMarker: true,
          } as any).addTo(map)

          const popupContent = `
            <div class="pet-popup">
              <h3 class="font-bold text-lg text-gray-800 mb-2">${animalName}</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">${t('farmer.time')}:</span>
                  <span class="font-medium">${new Date(point.timestamp).toLocaleString()}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">${t('farmer.heartRate')}:</span>
                  <span class="font-medium text-red-600">${point.bpm} BPM</span>
                </div>
                ${
                  point.temperature
                    ? `
                  <div class="flex justify-between">
                    <span class="text-gray-600">${t('farmer.temperature')}:</span>
                    <span class="font-medium text-orange-600">${point.temperature}°C</span>
                  </div>
                `
                    : ""
                }
                <div class="flex justify-between">
                  <span class="text-gray-600">${t('farmer.location')}:</span>
                  <span class="font-medium">${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}</span>
                </div>
                <div class="text-xs text-gray-500 mt-2">
                  Reading #${index + 1} of ${locationPoints.length}
                </div>
              </div>
            </div>
          `

          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: "custom-popup",
          })

          marker.on("click", () => {
            setSelectedPoint(point)
          })
        })
      })

      // Fit map to show all points or ensure default view
      if (locationPoints.length > 1) {
        import("leaflet").then((L) => {
          const group = L.featureGroup(locationPoints.map((point) => L.marker([point.latitude, point.longitude])))
          map.fitBounds(group.getBounds().pad(0.1))
        })
      } else if (locationPoints.length === 1) {
        map.setView([locationPoints[0].latitude, locationPoints[0].longitude], 12)
      } else {
        // Ensure map shows Rwanda when no location points
        map.setView([-1.9403, 29.8739], 9)
      }
    }
  }, [map, locationPoints, animalName])

  const latestPoint = locationPoints[locationPoints.length - 1]

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{locationPoints.length} {t('farmer.locationPointsTracked')}</span>
          </div>
          {latestPoint && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Navigation className="w-4 h-4" />
              <span>{t('farmer.lastSeen')}: {new Date(latestPoint.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => map && map.setView([-1.9403, 29.8739], 9)}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t('farmer.resetView')}
          </button>
          {latestPoint && (
            <button
              onClick={() => map && map.setView([latestPoint.latitude, latestPoint.longitude], 12)}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
            >
              {t('farmer.latestLocation')}
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-gray-200 shadow-lg"
          style={{ minHeight: "400px" }}
        />

        {/* Loading overlay */}
        {!map && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600">{t('farmer.loadingRwandaMap')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-gray-800">{t('farmer.coverageArea')}</h4>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {locationPoints.length > 1 ? t('farmer.multiplePoints') : locationPoints.length === 1 ? t('farmer.singlePoint') : t('farmer.noPoints')} Points
          </p>
          <p className="text-sm text-gray-600">{t('farmer.trackingLocations')}</p>
        </div>

        {latestPoint && (
          <>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-red-500" />
                <h4 className="font-semibold text-gray-800">{t('farmer.currentHealth')}</h4>
              </div>
              <p className="text-2xl font-bold text-red-600">{latestPoint.bpm} BPM</p>
              <p className="text-sm text-gray-600">{t('farmer.heartRate')}</p>
            </div>

            {latestPoint.temperature && (
              <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 2a4 4 0 00-4 4v4a6 6 0 1012 0V6a4 4 0 00-4-4zM8 6a2 2 0 114 0v6.5a4 4 0 11-4 0V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <h4 className="font-semibold text-gray-800">{t('farmer.temperature')}</h4>
                </div>
                <p className="text-2xl font-bold text-orange-600">{latestPoint.temperature}°C</p>
                <p className="text-sm text-gray-600">{t('farmer.bodyTemperature')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Point Details */}
      {selectedPoint && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-3">{t('farmer.selectedLocationDetails')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 block">{t('farmer.coordinates')}</span>
              <span className="font-medium">
                {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block">{t('farmer.time')}</span>
              <span className="font-medium">{new Date(selectedPoint.timestamp).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600 block">{t('farmer.heartRate')}</span>
              <span className="font-medium text-red-600">{selectedPoint.bpm} BPM</span>
            </div>
            {selectedPoint.temperature && (
              <div>
                <span className="text-gray-600 block">{t('farmer.temperature')}</span>
                <span className="font-medium text-orange-600">{selectedPoint.temperature}°C</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        .pet-marker {
          position: relative;
          width: 30px;
          height: 30px;
        }
        
        .pet-marker-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: #F59E0B;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 2;
        }
        
        .pet-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: #F59E0B;
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.7;
          }
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .pet-popup {
          min-width: 200px;
        }
      `}</style>
    </div>
  )
}
