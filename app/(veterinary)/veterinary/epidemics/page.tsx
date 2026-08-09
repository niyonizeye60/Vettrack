"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import EpidemicManagement from "@/components/epidemics/epidemic-management"

const STAFF_ROLES = ["doctor", "admin", "superadmin"]

export default function VeterinaryEpidemicsPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    getCurrentUser().then((u) => u && setUser(u))
  }, [])

  if (user && !STAFF_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-gray-500">Access restricted to veterinary staff.</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-gray-200 rounded-xl bg-white p-4">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-12 mt-2" />
            </div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return <EpidemicManagement role="doctor" />
}
