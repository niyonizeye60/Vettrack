"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { Skeleton } from "@/components/ui/skeleton"
import CalvesManager from "@/components/livestock/calves-manager"
import { ownerCapabilities } from "@/components/livestock/capabilities"

// The page body lives in components/livestock/calves-manager.tsx so a veterinarian the
// farmer gave the "calves" module can use the same Weight Log and Expenses tabs
// (app/(veterinary)/veterinary/farms/[farmerId]). Here the farmer owns the farm, so
// every capability is granted.
export default function CalvesPage() {
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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 max-w-full mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-gray-200 rounded-xl bg-white p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
    )
  }

  return <CalvesManager farmerId={farmerId} can={ownerCapabilities(farmerId, farmerName)} />
}
