"use client"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, Legend, ComposedChart } from "recharts"
import { useEffect, useState } from "react"
import { Activity, MapPin, Heart, RefreshCw, Thermometer, Database, Download, FileText, FileSpreadsheet, Eye, EyeOff, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DistributionChart } from "@/components/distribution-chart"
import { RwandaMap } from "@/components/rwanda-map"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import { getCurrentUser as getAuthUser } from "@/lib/auth"

// Define our data types based on API response
type Channel = {
  id: number
  name: string
  latitude: string
  longitude: string
  field1: string
  field2: string
  field3: string
  field4: string
  created_at: string
  updated_at: string
  last_entry_id: number
}

type Feed = {
  created_at: string
  entry_id: number
  field1: string
  field2: string | null
  field3: string | null
  field4: string | null
}

type ApiResponse = {
  channel: Channel
  feeds: Feed[]
}

type FormattedData = {
  created_at: string
  timestamp: string
  bpm: number
  latitude: number | null
  longitude: number | null
  temperature: number | null
  hasLocation: boolean
  hasTemperature: boolean
}

export default function PetTrackingPage() {
  const { t } = useLanguage()
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  const [data, setData] = useState<FormattedData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [refreshing, setRefreshing] = useState(false)
  const [deviceId, setDeviceId] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [results, setResults] = useState<number>(20)
  const [configLoading, setConfigLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email?: string; phone?: string } | null>(null)
  const role = "farmer" // TODO: Replace with dynamic role detection if needed

  // Fetch config and user data from API on mount
  useEffect(() => {
    async function fetchConfig() {
      setConfigLoading(true)
      try {
        const res = await fetch(`/api/tracking-config?role=${role}`)
        const json = await res.json()
        if (json.config) {
          setDeviceId(json.config.channelId || "")
          setApiKey(json.config.apiKey || "")
        }
      } catch (err) {
        // fallback to defaults if needed
      } finally {
        setConfigLoading(false)
      }
    }

    async function fetchUser() {
      try {
        const userData = await getAuthUser()
        if (userData) {
          // cast to any for optional fields not declared on the User type (e.g. phone)
          const u = userData as any
          setCurrentUser({
            name: u.name ?? userData.name,
            email: u.email ?? userData.email,
            phone: u.phone ?? undefined
          })
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      }
    }

    fetchConfig()
    fetchUser()
  }, [])

  // Save config to API
  const saveConfig = async () => {
    try {
      await fetch("/api/tracking-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: deviceId, apiKey, role }),
      })
    } catch (err) { }
  }
  // Load Leaflet CSS dynamically
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
    link.integrity = "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
    link.crossOrigin = ""
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  const fetchSensorData = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/thingspeak?channelId=${deviceId}&results=${results}`)

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }

      const json: ApiResponse = await res.json()

      // Validate the response structure
      if (!json.feeds || !Array.isArray(json.feeds)) {
        console.error("Invalid API response:", json)
        throw new Error("No data available from sensor")
      }

      setApiResponse(json)

      // Format the data using dynamic field mapping
      const formatted = json.feeds.map((feed: Feed) => {
        const date = new Date(feed.created_at)
        return {
          created_at: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: date.toISOString(),
          bpm: Number.parseFloat(feed.field1) || 0,
          latitude: feed.field2 ? Number.parseFloat(feed.field2) : null,
          longitude: feed.field3 ? Number.parseFloat(feed.field3) : null,
          temperature: feed.field4 ? Number.parseFloat(feed.field4) : null,
          hasLocation: !!feed.field2 && !!feed.field3,
          hasTemperature: !!feed.field4,
        }
      })

      // Sort by date
      formatted.sort(
        (a: FormattedData, b: FormattedData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )

      setData(formatted)
      setLastUpdated(new Date().toLocaleString())
    } catch (error) {
      console.error("Error fetching data:", error)
      setData([]) // Clear data on error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSensorData()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSensorData()
    }, 30000)

    return () => clearInterval(interval)
  }, [deviceId, apiKey, results])

  // Calculate stats dynamically
  const averageBpm =
    data.length > 0 ? Math.round(data.reduce((sum: number, item: FormattedData) => sum + item.bpm, 0) / data.length) : 0

  const latestBpm = data.length > 0 ? data[data.length - 1].bpm : 0

  // Temperature stats
  const temperatureData = data.filter((item: FormattedData) => item.hasTemperature)
  const averageTemperature =
    temperatureData.length > 0
      ? Math.round(
        (temperatureData.reduce((sum: number, item: FormattedData) => sum + (item.temperature || 0), 0) /
          temperatureData.length) *
        10,
      ) / 10
      : 0

  const latestTemperature = data.length > 0 ? data[data.length - 1].temperature : null

  // Location data stats
  const locationDataPoints = data.filter((item: FormattedData) => item.hasLocation).length
  const totalDataPoints = data.length
  const locationPercentage = totalDataPoints > 0 ? Math.round((locationDataPoints / totalDataPoints) * 100) : 0

  // Dynamic status determination
  const getBpmStatus = (bpm: number) => {
    if (bpm === 0) return { label: t('farmer.noData'), color: "#9CA3AF" }
    if (bpm < 60) return { label: t('farmer.low'), color: "#3B82F6" }
    if (bpm <= 100) return { label: t('farmer.normal'), color: "#10B981" }
    if (bpm <= 130) return { label: t('farmer.elevated'), color: "#F59E0B" }
    return { label: t('farmer.high'), color: "#EF4444" }
  }

  const getTemperatureStatus = (temp: number | null) => {
    if (temp === null) return { label: t('farmer.noData'), color: "#9CA3AF" }
    if (temp < 36) return { label: t('farmer.low'), color: "#3B82F6" }
    if (temp <= 39) return { label: t('farmer.normal'), color: "#10B981" }
    if (temp <= 41) return { label: t('farmer.elevated'), color: "#F59E0B" }
    return { label: t('farmer.high'), color: "#EF4444" }
  }

  const bpmStatus = getBpmStatus(latestBpm)
  const temperatureStatus = getTemperatureStatus(latestTemperature)

  // Data for pie chart - use English keys for consistent colors
  const statusCounts = data.reduce((acc: Record<string, number>, item: FormattedData) => {
    const bpm = item.bpm
    let statusKey = "High"
    if (bpm === 0) statusKey = "No Data"
    else if (bpm < 60) statusKey = "Low"
    else if (bpm <= 100) statusKey = "Normal"
    else if (bpm <= 130) statusKey = "Elevated"

    acc[statusKey] = (acc[statusKey] || 0) + 1
    return acc
  }, {})

  const getStatusColor = (statusKey: string) => {
    switch (statusKey) {
      case "No Data": return "#9CA3AF"
      case "Low": return "#3B82F6"
      case "Normal": return "#10B981"
      case "Elevated": return "#F59E0B"
      case "High": return "#EF4444"
      default: return "#9CA3AF"
    }
  }

  const getTranslatedStatus = (statusKey: string) => {
    switch (statusKey) {
      case "No Data": return t('farmer.noData')
      case "Low": return t('farmer.low')
      case "Normal": return t('farmer.normal')
      case "Elevated": return t('farmer.elevated')
      case "High": return t('farmer.high')
      default: return statusKey
    }
  }

  const pieData = Object.entries(statusCounts).map(([statusKey, value]: [string, number]) => ({
    name: getTranslatedStatus(statusKey),
    value,
    color: getStatusColor(statusKey),
  }))

  // Get locations for map
  const locationPoints = data.filter((item: FormattedData) => item.hasLocation)

  // Get dynamic field labels from channel
  const getFieldLabel = (fieldKey: keyof Channel) => {
    return apiResponse?.channel[fieldKey] || fieldKey
  }

  // Export functions
  const exportToPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF()

      // Header background
      doc.setFillColor(22, 163, 74) // green-600
      doc.rect(32, 5, 210, 30, 'F')

      // Logo (if available)
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        logoImg.src = '/logo/Vet print.png'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })
        doc.addImage(logoImg, 'PNG', 15, 8, 35, 24)
      } catch (error) {
        console.log('Logo not loaded:', error)
      }

      // Header text
      doc.setTextColor(255, 255, 255) // white
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(t('farmer.animalHealthMonitoringReport'), 52, 20)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Vettrack', 52, 28)

      // Reset text color for body
      doc.setTextColor(55, 65, 81) // gray-700
      doc.setFontSize(11)
      doc.text(`${t('farmer.animal')}: ${apiResponse?.channel.name || t('farmer.unknown')}`, 20, 55)
      doc.text(`${t('farmer.generated')}: ${new Date().toLocaleString()}`, 20, 65)
      doc.text(`${t('farmer.genName')}: ${currentUser?.name || 'Unknown User'}`, 20, 75)
      doc.text(`${t('farmer.channelId')}: ${deviceId}`, 20, 85)

      // Health Summary section
      doc.setFillColor(248, 250, 252) // slate-50
      doc.rect(15, 95, 180, 60, 'F')
      doc.setDrawColor(226, 232, 240) // slate-200
      doc.rect(15, 95, 180, 60, 'S')

      doc.setTextColor(22, 163, 74) // green-600
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(t('farmer.healthSummary'), 20, 108)

      doc.setTextColor(55, 65, 81) // gray-700
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`${t('farmer.latest')} ${getFieldLabel('field1')}: ${latestBpm}`, 20, 120)
      doc.text(`${t('farmer.average')} ${getFieldLabel('field1')}: ${averageBpm}`, 20, 130)
      doc.text(`${t('farmer.latest')} ${t('farmer.temperature')}: ${latestTemperature || 'N/A'}°C`, 20, 140)
      doc.text(`${t('farmer.locationCoverage')}: ${locationPercentage}%`, 20, 150)

      // Recent Readings section
      doc.setTextColor(22, 163, 74) // green-600
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(t('farmer.recentReadings'), 20, 175)

      doc.setTextColor(55, 65, 81) // gray-700
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')

      let yPos = 185
      data.slice(-15).forEach((item, index) => {
        if (yPos > 280) {
          doc.addPage()
          yPos = 20
        }
        const status = getBpmStatus(item.bpm)
        const statusColor: [number, number, number] = status.color === '#10B981' ? [16, 185, 129] :
          status.color === '#EF4444' ? [239, 68, 68] :
            status.color === '#F59E0B' ? [245, 158, 11] :
              status.color === '#3B82F6' ? [59, 130, 246] : [156, 163, 175]

        doc.setTextColor(...statusColor)
        doc.text(`● `, 20, yPos)
        doc.setTextColor(55, 65, 81)
        doc.text(`${new Date(item.timestamp).toLocaleString()} - BPM: ${item.bpm}, Temp: ${item.temperature || 'N/A'}°C`, 25, yPos)
        yPos += 8
      })

      // Footer
      const pageHeight = doc.internal.pageSize.height
      doc.setFillColor(248, 250, 252) // slate-50
      doc.rect(0, pageHeight - 25, 210, 25, 'F')

      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setTextColor(55, 65, 81) // gray-700
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')

      // Contact info
      const contactInfo = `Contact Vettrack Support`
      const emailInfo = `Email: info@vettrack.rw`
      const phoneInfo = `Phone:+250 78 072 1800 `

      const baseY = pageHeight - 22;
      const lineHeight = 5;
      const centerX = pageWidth / 2;

      doc.text(contactInfo, centerX, baseY, { align: 'center' });
      doc.text(emailInfo, centerX, baseY + lineHeight, { align: 'center' });
      doc.text(phoneInfo, centerX, baseY + lineHeight * 2, { align: 'center' });

      doc.textWithLink(
        'Website: www.vettrack.rw | Generated by Vettrack System',
        centerX,
        baseY + lineHeight * 3,
        { align: 'center', url: 'https://www.vettrack.rw' }
      );

      doc.text(
        `© ${new Date().getFullYear()} Vettrack. All rights reserved.`,
        centerX,
        baseY + lineHeight * 4,
        { align: 'center' }
      );


      doc.save(`health-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
    }
  }

  const exportToCSV = () => {
    const headers = [t('farmer.timestamp'), 'BPM', t('farmer.temperature'), t('farmer.latitude'), t('farmer.longitude'), t('farmer.status')]
    const csvData = data.map(item => [
      new Date(item.timestamp).toLocaleString(),
      item.bpm,
      item.temperature || '',
      item.latitude || '',
      item.longitude || '',
      getBpmStatus(item.bpm).label
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `health-data-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportToExcel = async () => {
    try {
      const XLSX = (await import('xlsx')).default

      // Animal info sheet
      const animalInfo = {
        [t('farmer.genName')]: currentUser?.name || 'Unknown User',
        [t('farmer.animal')]: apiResponse?.channel.name || t('farmer.unknown'),
        [t('farmer.channelId')]: deviceId,
        [t('farmer.reportDate')]: new Date().toLocaleString(),
        [`${t('farmer.latest')} BPM`]: latestBpm,
        [`${t('farmer.average')} BPM`]: averageBpm,
        [`${t('farmer.latest')} ${t('farmer.temperature')}`]: latestTemperature || 'N/A',
        [t('farmer.locationCoverage')]: `${locationPercentage}%`,
        [t('farmer.totalRecords')]: data.length
      }

      // Health data sheet
      const healthData = data.map(item => ({
        [t('farmer.timestamp')]: new Date(item.timestamp).toLocaleString(),
        'BPM': item.bpm,
        [`${t('farmer.temperature')} (°C)`]: item.temperature || '',
        [t('farmer.latitude')]: item.latitude || '',
        [t('farmer.longitude')]: item.longitude || '',
        [t('farmer.bpmStatus')]: getBpmStatus(item.bpm).label,
        [t('farmer.tempStatus')]: getTemperatureStatus(item.temperature).label,
        [t('farmer.hasLocation')]: item.hasLocation ? t('farmer.yes') : t('farmer.no')
      }))

      const wb = XLSX.utils.book_new()

      // Add animal info sheet
      const infoWs = XLSX.utils.json_to_sheet([animalInfo])
      XLSX.utils.book_append_sheet(wb, infoWs, t('farmer.animalInfo'))

      // Add health data sheet
      const dataWs = XLSX.utils.json_to_sheet(healthData)
      XLSX.utils.book_append_sheet(wb, dataWs, t('farmer.healthData'))

      XLSX.writeFile(wb, `health-report-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Excel export failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {apiResponse?.channel.name || t('farmer.cowHealthMonitor')}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{t('farmer.realTimeTracking')}</p>
              </div>
              {apiResponse && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Database className="w-4 h-4" />
                  <span>
                    {t('farmer.channel')} #{apiResponse.channel.id} • {apiResponse.channel.last_entry_id} {t('farmer.totalEntries')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{t('farmer.lastUpdated')}:</span> {lastUpdated}
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="font-medium">{t('farmer.exportReport')}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportToPDF()}>
                      <FileText className="mr-2 h-4 w-4" />
                      {t('farmer.exportAsPDF')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToCSV()}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      {t('farmer.exportAsCSV')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToExcel()}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      {t('farmer.exportAsExcel')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 print:hidden"
                  onClick={fetchSensorData}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="font-medium">{t('farmer.refresh')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="border border-gray-200 shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('farmer.dataSourceConfig')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('farmer.channelId')}</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                onBlur={saveConfig}
                placeholder="ThingSpeak Channel ID"
                disabled={configLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('farmer.apiKey')}</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onBlur={saveConfig}
                  placeholder="ThingSpeak API Key (secured)"
                  disabled={configLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{t('farmer.resultsCount')}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  value={results}
                  onChange={(e) => setResults(Number.parseInt(e.target.value) || 20)}
                  min="1"
                  max="8000"
                />
                <button
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  onClick={fetchSensorData}
                >
                  {t('farmer.fetch')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">{t('farmer.loadingSensorData')}</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="border border-gray-200 shadow-sm rounded-lg p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-50">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('farmer.noDataAvailable')}</h3>
            <p className="text-gray-600 mb-6">
              {t('farmer.noSensorData')}
            </p>
            <button
              onClick={fetchSensorData}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('farmer.tryAgain')}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Field Information */}
            {apiResponse && (
              <div className="border border-gray-200 shadow-sm rounded-lg p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t('farmer.dataFieldsMapping')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <Heart className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-800">{t('farmer.field')} 1</p>
                      <p className="text-sm text-red-600">{getFieldLabel("field1")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <MapPin className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold text-blue-800">{t('farmer.field')} 2</p>
                      <p className="text-sm text-blue-600">{getFieldLabel("field2")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                    <MapPin className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-800">{t('farmer.field')} 3</p>
                      <p className="text-sm text-green-600">{getFieldLabel("field3")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <Thermometer className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="font-semibold text-orange-800">{t('farmer.field')} 4</p>
                      <p className="text-sm text-orange-600">{getFieldLabel("field4")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <Heart className="w-6 h-6 text-red-500" />
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${bpmStatus.color === "#10B981"
                      ? "bg-green-100 text-green-800"
                      : bpmStatus.color === "#EF4444"
                        ? "bg-red-100 text-red-800"
                        : bpmStatus.color === "#F59E0B"
                          ? "bg-yellow-100 text-yellow-800"
                          : bpmStatus.color === "#3B82F6"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {bpmStatus.label}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{t('farmer.latest')} {getFieldLabel("field1")}</h3>
                <p className="text-3xl font-bold text-gray-900">{latestBpm}</p>
              </div>

              <div className="border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <Thermometer className="w-6 h-6 text-orange-500" />
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${temperatureStatus.color === "#10B981"
                      ? "bg-green-100 text-green-800"
                      : temperatureStatus.color === "#EF4444"
                        ? "bg-red-100 text-red-800"
                        : temperatureStatus.color === "#F59E0B"
                          ? "bg-yellow-100 text-yellow-800"
                          : temperatureStatus.color === "#3B82F6"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {temperatureStatus.label}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{getFieldLabel("field4")}</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {latestTemperature !== null ? `${latestTemperature}°C` : "N/A"}
                </p>
              </div>

              <div className="border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Activity className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{t('farmer.average')} {getFieldLabel("field1")}</h3>
                <p className="text-3xl font-bold text-gray-900">{averageBpm}</p>
              </div>

              <div className="border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-sky-50 rounded-xl">
                    <MapPin className="w-6 h-6 text-sky-500" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{t('farmer.locationCoverage')}</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">{locationPercentage}%</p>
                  <span className="text-sm text-gray-500">
                    ({locationDataPoints}/{totalDataPoints})
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-gray-200 shadow-sm rounded-lg p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">{t('farmer.healthMetricsTrend')}
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={data}>
                    <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                    <XAxis dataKey="created_at" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis
                      yAxisId="left"
                      label={{
                        value: getFieldLabel("field1"),
                        angle: -90,
                        position: "insideLeft",
                        style: { textAnchor: "middle" },
                      }}
                      domain={[0, "auto"]}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{
                        value: `${getFieldLabel("field4")} (°C)`,
                        angle: 90,
                        position: "insideRight",
                        style: { textAnchor: "middle" },
                      }}
                      domain={[20, 45]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        backdropFilter: "blur(8px)",
                      }}
                      labelStyle={{ fontWeight: "bold", marginBottom: "5px" }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="bpm"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.2}
                      name={`${getFieldLabel("field1")}`}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                      name={`${getFieldLabel("field4")} (°C)`}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="border border-gray-200 shadow-sm rounded-lg p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">{getFieldLabel("field1")} {t('farmer.distribution')}
                </h2>
                <DistributionChart pieData={pieData} data={data} />
              </div>
            </div>

            {/* Rwanda Map */}
            {locationDataPoints > 0 && (
              <div className="border border-gray-200 shadow-sm rounded-lg p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">🇷🇼 {apiResponse?.channel.name} {t('farmer.locationTrackingInRwanda')}
                </h2>
                <RwandaMap
                  locationPoints={locationPoints.map((point) => ({
                    latitude: point.latitude!,
                    longitude: point.longitude!,
                    timestamp: point.timestamp,
                    bpm: point.bpm,
                    temperature: point.temperature,
                  }))}
                  animalName={apiResponse?.channel.name || "Pet"}
                />
              </div>
            )}

            {/* Data Table */}
            <div className="border border-gray-200 shadow-sm rounded-lg p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{t('farmer.recentReadings')}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmer.time')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {getFieldLabel("field1")}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {getFieldLabel("field4")}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">{t('farmer.status')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        {t('farmer.location')} ({getFieldLabel("field2")}, {getFieldLabel("field3")})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data
                      .slice()
                      .reverse()
                      .slice(0, 15)
                      .map((item, index) => {
                        const bpmStatus = getBpmStatus(item.bpm)
                        const tempStatus = getTemperatureStatus(item.temperature)
                        return (
                          <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-150">
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(item.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.bpm}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {item.temperature !== null ? `${item.temperature}°C` : "N/A"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bpmStatus.color === "#10B981"
                                    ? "bg-green-100 text-green-800"
                                    : bpmStatus.color === "#EF4444"
                                      ? "bg-red-100 text-red-800"
                                      : bpmStatus.color === "#F59E0B"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : bpmStatus.color === "#3B82F6"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                  {getFieldLabel("field1")}: {bpmStatus.label}
                                </span>
                                {item.hasTemperature && (
                                  <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${tempStatus.color === "#10B981"
                                      ? "bg-green-100 text-green-800"
                                      : tempStatus.color === "#EF4444"
                                        ? "bg-red-100 text-red-800"
                                        : tempStatus.color === "#F59E0B"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : tempStatus.color === "#3B82F6"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-gray-100 text-gray-800"
                                      }`}
                                  >
                                    {getFieldLabel("field4")}: {tempStatus.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {item.hasLocation ? (
                                <span className="text-green-600 font-medium">
                                  {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}
                                </span>
                              ) : (
                                <span className="text-gray-400">{t('farmer.noLocationData')}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
