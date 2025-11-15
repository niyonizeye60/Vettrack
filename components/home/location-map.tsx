"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { Icon } from "leaflet"

// Define salon locations
const locations = [
  { name: "Glow Salon - Bandra", position: [19.0596, 72.8295] },
  { name: "Glow Salon - Andheri", position: [19.1136, 72.8697] },
  { name: "Glow Salon - Powai", position: [19.1176, 72.906] },
]

// Custom icon for markers
const customIcon = new Icon({
  iconUrl: "/placeholder.svg?height=41&width=32&text=📍",
  iconSize: [32, 41],
  iconAnchor: [16, 41],
  popupAnchor: [0, -41],
})

export default function LocationMap() {
  const [activeLocation, setActiveLocation] = useState(null)

  return (
    <div className="h-[400px] rounded-lg overflow-hidden shadow-md">
      <MapContainer center={[19.076, 72.8777]} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {locations.map((location, index) => (
          <Marker
            key={index}
            position={location.position}
            icon={customIcon}
            eventHandlers={{
              click: () => setActiveLocation(location),
            }}
          >
            <Popup>
              <div className="font-semibold">{location.name}</div>
              <Button asChild size="sm" className="mt-2 bg-primary text-white">
                <Link href="/booking">Book Now</Link>
              </Button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
