"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose
} from "@/components/ui/dialog"
import {
  MessageSquare, Phone, MapPin, Heart, User, Stethoscope,
  PawPrint, Search, Users
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"

interface Patient {
  id: string
  name: string
  phone: string
  district: string
  sector: string
  totalConsultations: number
  lastConsultation: string
  status: 'active' | 'inactive'
  animals: string[]        // unique animal types for badges (Cow, Goat…)
  animalDetails: { animalId: string; name: string; type: string; breed: string; status: string }[]
  recentConsultations: any[]
}

interface PatientsPageClientProps {
  patients: Patient[]
  activePatients: Patient[]
  totalAnimals: number
  totalConsultations: number
}

export default function PatientsPageClient({
  patients, activePatients, totalAnimals, totalConsultations
}: PatientsPageClientProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q)
    )
  }, [patients, searchTerm])

  const statusBadge = (status: string) => (
    <Badge variant="outline" className={`text-xs ${
      status === 'active'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-gray-50 text-gray-500 border-gray-200'
    }`}>
      {status === 'active' ? t('vet.active') : t('vet.inactive')}
    </Badge>
  )

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('vet.patientRegistry')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('vet.comprehensivePatient')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.totalPatients')}</p>
              <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{patients.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.registeredFarmers')}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.activePatients')}</p>
              <Heart className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{activePatients.length}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.recentConsultations')}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.animalsUnderCare')}</p>
              <PawPrint className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">{totalAnimals}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.differentSpecies')}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-500 font-medium">{t('vet.totalCases')}</p>
              <Stethoscope className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>
            <h3 className="text-3xl font-bold text-orange-600 mt-2">{totalConsultations}</h3>
            <p className="text-xs text-gray-400 mt-1">{t('vet.medicalConsultations')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Users className="h-5 w-5 text-green-600" />
              {t('vet.patientRegistry')}
            </CardTitle>
            {/* Search inside the card header */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('vet.searchPatients')}
                className="pl-9 bg-white h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  {searchTerm.trim() ? t('vet.noResultsFound') : t('vet.noPatientsYet')}
                </p>
              </div>
            ) : filtered.map((patient) => (
              <div key={patient.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{patient.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Phone className="h-2.5 w-2.5" /><span>{patient.phone}</span>
                      </div>
                    </div>
                  </div>
                  {statusBadge(patient.status)}
                </div>
                {patient.district && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2 pl-8">
                    <MapPin className="h-2.5 w-2.5" />
                    <span>{patient.district}{patient.sector ? `, ${patient.sector}` : ''}</span>
                  </div>
                )}
                <div className="flex gap-2 mt-3 pl-8">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                    {t('vet.viewDetails')}
                  </Button>
                  <Link href="/veterinary/messages">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />{t('vet.contact')}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-[200px] font-semibold text-gray-600">{t('vet.farmer')}</TableHead>
                  <TableHead className="w-[160px] font-semibold text-gray-600">{t('vet.location')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('vet.animalsUnderCare')}</TableHead>
                  <TableHead className="w-[90px] font-semibold text-gray-600">{t('vet.cases')}</TableHead>
                  <TableHead className="w-[120px] font-semibold text-gray-600">{t('vet.lastVisit')}</TableHead>
                  <TableHead className="w-[100px] font-semibold text-gray-600">{t('vet.status')}</TableHead>
                  <TableHead className="w-[160px] font-semibold text-gray-600">{t('vet.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">
                        {searchTerm.trim() ? t('vet.noResultsFound') : t('vet.noPatientsYet')}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    {/* Farmer */}
                    <TableCell className="w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{patient.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone className="h-2.5 w-2.5" /><span>{patient.phone}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {/* Location */}
                    <TableCell className="w-[160px]">
                      {patient.district ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{patient.district}{patient.sector ? `, ${patient.sector}` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    {/* Animals */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {patient.animals.length > 0 ? patient.animals.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">{a}</Badge>
                        )) : <span className="text-xs text-gray-400 italic">{t('vet.noAnimalsRecorded')}</span>}
                      </div>
                    </TableCell>
                    {/* Cases */}
                    <TableCell className="w-[90px]">
                      <span className="text-sm font-semibold text-gray-900">{patient.totalConsultations}</span>
                    </TableCell>
                    {/* Last visit */}
                    <TableCell className="w-[120px]">
                      <span className="text-sm text-gray-600">
                        {patient.lastConsultation ? new Date(patient.lastConsultation).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    {/* Status */}
                    <TableCell className="w-[100px]">{statusBadge(patient.status)}</TableCell>
                    {/* Actions */}
                    <TableCell className="w-[160px]">
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSelectedPatient(patient)}>
                          {t('vet.view')}
                        </Button>
                        <Link href="/veterinary/messages">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0">
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />{t('vet.contact')}
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient detail dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-[520px] w-11/12">
          <DialogHeader>
            <DialogTitle>{t('vet.patientDetails')}</DialogTitle>
            <DialogDescription>{t('vet.patientDetailsDesc')}</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4 py-2">
              {/* Identity */}
              <div className="space-y-2">
                {[
                  { label: t('vet.farmer'),      value: selectedPatient.name },
                  { label: t('vet.phoneNumber'),  value: selectedPatient.phone },
                  { label: t('vet.location'),     value: [selectedPatient.district, selectedPatient.sector].filter(Boolean).join(', ') || '—' },
                  { label: t('vet.totalCasesCount'), value: String(selectedPatient.totalConsultations) },
                  { label: t('vet.lastVisit'),    value: selectedPatient.lastConsultation ? new Date(selectedPatient.lastConsultation).toLocaleDateString() : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="grid grid-cols-3 gap-4 text-sm">
                    <p className="font-semibold text-gray-500">{label}</p>
                    <p className="col-span-2 text-gray-900">{value}</p>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <p className="font-semibold text-gray-500">{t('vet.status')}</p>
                  <div className="col-span-2">{statusBadge(selectedPatient.status)}</div>
                </div>
              </div>

              {/* Animals */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-semibold text-gray-500 mb-2">{t('vet.animalsUnderCare')}</p>
                {selectedPatient.animalDetails.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedPatient.animalDetails.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{a.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{a.type}{a.breed ? ` · ${a.breed}` : ''}</span>
                        </div>
                        <Badge variant="outline" className={`text-xs ${
                          a.status === 'Healthy'          ? 'bg-green-50 text-green-700 border-green-200' :
                          a.status === 'Sick'             ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          a.status === 'Under Treatment'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">{t('vet.noAnimalsRecorded')}</span>
                )}
              </div>

              {/* Recent cases */}
              {selectedPatient.recentConsultations.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-gray-500 mb-2">{t('vet.recentCases')}</p>
                  <div className="space-y-1.5">
                    {selectedPatient.recentConsultations.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{c.service}</span>
                        <Badge variant="outline" className={`text-xs ${
                          c.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          c.status === 'pending'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                     'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Link href="/veterinary/messages">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <MessageSquare className="h-4 w-4 mr-1.5" />{t('vet.contact')}
              </Button>
            </Link>
            <DialogClose asChild>
              <Button variant="outline">{t('vet.close')}</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
