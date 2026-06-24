"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Phone, MapPin, Heart, User, Stethoscope, Activity, PawPrint, Search } from "lucide-react"
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
  animals: string[]
  recentConsultations: any[]
}

interface PatientsPageClientProps {
  patients: Patient[]
  activePatients: Patient[]
  totalAnimals: number
  totalConsultations: number
}

export default function PatientsPageClient({
  patients,
  activePatients,
  totalAnimals,
  totalConsultations
}: PatientsPageClientProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return patients
    return patients.filter(p =>
      p.name?.toLowerCase().includes(query) ||
      p.phone?.toLowerCase().includes(query) ||
      p.district?.toLowerCase().includes(query)
    )
  }, [patients, searchTerm])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-red-500 rounded-lg">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t('vet.patientRegistry')}</h1>
            <p className="text-red-600 font-medium">{t('vet.animalCareRecords')}</p>
          </div>
        </div>
        <p className="text-gray-600 ml-14">{t('vet.comprehensivePatient')}</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t('vet.searchPatients')}
          className="pl-9 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Clinical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.totalPatients')}</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <User className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{patients.length}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.registeredFarmers')}</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.activePatients')}</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activePatients.length}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.recentConsultations')}</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.animalsUnderCare')}</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <PawPrint className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{totalAnimals}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.differentSpecies')}</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">{t('vet.totalCases')}</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
              <Stethoscope className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalConsultations}</div>
            <p className="text-xs text-gray-500 mt-1">{t('vet.medicalConsultations')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Records */}
      <div className="grid gap-6">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="shadow-md border-0 bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-blue-200">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                          {patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        patient.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{patient.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-blue-500" />
                          <span>{patient.phone}</span>
                        </div>
                        {patient.district && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-green-500" />
                            <span>{patient.district}, {patient.sector}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={`px-3 py-1 font-medium ${
                      patient.status === 'active' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {patient.status === 'active' ? `🟢 ${t('vet.active')}` : `⚪ ${t('vet.inactive')}`}
                    </Badge>
                    <Link href={`/veterinary/messages`}>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t('vet.contact')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <PawPrint className="h-4 w-4 text-purple-600" />
                      <h4 className="font-semibold text-gray-700">{t('vet.animalsUnderCare')}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {patient.animals.length > 0 ? (
                        patient.animals.map((animal, index) => (
                          <Badge key={index} className="bg-purple-100 text-purple-700 border border-purple-200">
                            {animal}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500 italic">{t('vet.noAnimalsRecorded')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      <h4 className="font-semibold text-gray-700">{t('vet.medicalSummary')}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('vet.totalCasesCount')}:</span>
                        <span className="font-semibold text-orange-600">{patient.totalConsultations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('vet.lastVisit')}:</span>
                        <span className="font-semibold text-gray-700">
                          {new Date(patient.lastConsultation).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Stethoscope className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-gray-700">{t('vet.recentCases')}</h4>
                    </div>
                    <div className="space-y-2">
                      {patient.recentConsultations.map((consultation, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">{consultation.service}</span>
                          <Badge className={`text-xs ${
                            consultation.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                            consultation.status === 'pending' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {consultation.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="shadow-md border-0 bg-white">
            <CardContent className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm.trim() ? t('vet.noResultsFound') : t('vet.noPatientsYet')}
              </h3>
              {!searchTerm.trim() && (
                <p className="text-gray-500 max-w-md mx-auto">
                  {t('vet.patientRegistryDesc')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}