"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import VeterinaryConsultations from "@/components/dashboard/veterinary-consultations"
import { useLanguage } from "@/contexts/LanguageContext"

interface AppointmentsPageClientProps {
  consultations: any[]
}

export default function AppointmentsPageClient({ consultations }: AppointmentsPageClientProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  const filteredConsultations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return consultations
    return consultations.filter((c) =>
      c.fullName?.toLowerCase().includes(query) ||
      c.phoneNumber?.toLowerCase().includes(query) ||
      c.service?.toLowerCase().includes(query) ||
      c.status?.toLowerCase().includes(query)
    )
  }, [consultations, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('vet.appointments')}</h1>
        <div className="text-sm text-gray-500">
          {t('vet.manageAppointments')}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t('vet.searchAppointments')}
          className="pl-9 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {searchTerm.trim() && filteredConsultations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('vet.noResultsFound')}</div>
      ) : (
        <VeterinaryConsultations consultations={filteredConsultations} />
      )}
    </div>
  )
}
