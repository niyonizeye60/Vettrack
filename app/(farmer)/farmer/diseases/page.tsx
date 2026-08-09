"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import DiseaseManager from "@/components/livestock/disease-manager"
import { ownerCapabilities } from "@/components/livestock/capabilities"

// The page body lives in components/livestock/disease-manager.tsx so the exact same
// UI can be rendered for a veterinarian the farmer has delegated access to
// (app/(veterinary)/veterinary/farms/[farmerId]). Here the farmer owns the farm, so
// every capability is granted.
export default function DiseaseManagementPage() {
  const [farmerId, setFarmerId] = useState<string | null>(null)
  const [farmerName, setFarmerName] = useState("")

  useEffect(() => {
    async function init() {
      const userData = await getCurrentUser()
      if (!userData) return
      setFarmerId(userData._id.toString())
      setFarmerName(userData.name || "")
    }
    init()
  }, [])

  if (!farmerId) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-7 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
        <div className="h-10 bg-gray-200 rounded w-full max-w-md" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return <DiseaseManager farmerId={farmerId} can={ownerCapabilities(farmerId, farmerName)} />
}
