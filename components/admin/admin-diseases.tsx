"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Search, Loader2, TriangleAlert } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getDiseaseOversightData } from "@/lib/actions/admin-oversight"

type DiseaseItem = {
  id: string
  farmerId: string
  farmerName: string
  district: string | null
  sector: string | null
  animalName: string | null
  diseaseName: string
  status: string
  diagnosedDate: string
  resolvedDate: string | null
  veterinarianName: string | null
}

type TrendingDisease = { diseaseName: string; farmerCount: number }

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-red-100 text-red-800",
  "Under Treatment": "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
}

export default function AdminDiseases() {
  const { t } = useLanguage()
  const [items, setItems] = useState<DiseaseItem[]>([])
  const [counts, setCounts] = useState({ Active: 0, "Under Treatment": 0, Resolved: 0 })
  const [trending, setTrending] = useState<TrendingDisease[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await getDiseaseOversightData()
      setItems(data.items)
      setCounts(data.counts)
      setTrending(data.trending)
    } catch (error) {
      console.error("Failed to fetch disease oversight data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter((item) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch = !q || item.farmerName.toLowerCase().includes(q) || item.diseaseName.toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {trending.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <TriangleAlert className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">{t('admin.outbreakAlert')}</AlertTitle>
          <AlertDescription className="text-red-700 space-y-1">
            {trending.map((entry) => (
              <p key={entry.diseaseName}>
                {t('admin.outbreakAlertDesc')
                  .replace('{disease}', entry.diseaseName)
                  .replace('{count}', String(entry.farmerCount))}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.diseaseActive')}</p>
            <h3 className="text-2xl font-bold text-red-600 mt-2">{counts.Active}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.underTreatment')}</p>
            <h3 className="text-2xl font-bold text-yellow-600 mt-2">{counts["Under Treatment"]}</h3>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-gray-500 font-medium">{t('admin.resolved')}</p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">{counts.Resolved}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">{t('admin.diseaseOversight')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('admin.searchByFarmerOrDisease')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('admin.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allStatus')}</SelectItem>
                <SelectItem value="Active">{t('admin.diseaseActive')}</SelectItem>
                <SelectItem value="Under Treatment">{t('admin.underTreatment')}</SelectItem>
                <SelectItem value="Resolved">{t('admin.resolved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-600">{t('admin.farmerName')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.location')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.animal')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.diseaseName')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.veterinarian')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.diagnosedDate')}</TableHead>
                  <TableHead className="font-semibold text-gray-600">{t('admin.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <TableCell className="font-medium">{item.farmerName}</TableCell>
                    <TableCell>{item.district ? `${item.district}, ${item.sector}` : "—"}</TableCell>
                    <TableCell>{item.animalName || "—"}</TableCell>
                    <TableCell>{item.diseaseName}</TableCell>
                    <TableCell>{item.veterinarianName || "—"}</TableCell>
                    <TableCell>{item.diagnosedDate}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"}>
                        {item.status === "Active" ? t('admin.diseaseActive')
                          : item.status === "Under Treatment" ? t('admin.underTreatment')
                          : item.status === "Resolved" ? t('admin.resolved')
                          : item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {t('admin.noDiseaseRecordsFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
