"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  exportUsers,
  exportConsultations,
  exportSystemLogs,
  exportSystemReport,
  scheduleDataExport
} from "@/lib/actions/superadmin"
import {
  Download,
  Users,
  FileText,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Database,
  Upload,
  ShieldAlert,
  Eye,
  EyeOff
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DataExportsPageClientProps {
  users: any[]
}

export default function DataExportsPageClient({ users }: DataExportsPageClientProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState<string | null>(null)
  
  const [userFilters, setUserFilters] = useState({
    role: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  })

  const [consultationFilters, setConsultationFilters] = useState({
    status: 'all',
    doctorId: 'all',
    farmerId: 'all',
    startDate: '',
    endDate: ''
  })

  const [logFilters, setLogFilters] = useState({
    logType: 'all',
    userId: 'all',
    startDate: '',
    endDate: ''
  })

  const [scheduleForm, setScheduleForm] = useState({
    exportType: 'users',
    frequency: 'weekly',
    email: ''
  })

  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importConnectionString, setImportConnectionString] = useState("")
  const [importTargetDatabase, setImportTargetDatabase] = useState("")
  const [showConnectionString, setShowConnectionString] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ database: string; summary: Record<string, any> } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" })
      return
    }

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && (val.includes(',') || val.includes('"')) 
            ? `"${val.replace(/"/g, '""')}"` 
            : val
        ).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const downloadJSON = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportUsers = async () => {
    setIsExporting('users')
    try {
      const filters: any = {}
      
      if (userFilters.role !== 'all') filters.role = userFilters.role
      if (userFilters.status !== 'all') filters.status = userFilters.status
      if (userFilters.startDate && userFilters.endDate) {
        filters.dateRange = {
          start: new Date(userFilters.startDate),
          end: new Date(userFilters.endDate)
        }
      }

      const result = await exportUsers(filters)
      
      if (result.success) {
        downloadCSV(result.data || [], 'users-export')
        toast({ title: "Success", description: `Exported ${result.count} users` })
      } else {
        toast({ title: "Error", description: result.message || 'Failed to export users', variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: 'Failed to export users', variant: "destructive" })
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportConsultations = async () => {
    setIsExporting('consultations')
    try {
      const filters: any = {}
      
      if (consultationFilters.status !== 'all') filters.status = consultationFilters.status
      if (consultationFilters.doctorId !== 'all') filters.doctorId = consultationFilters.doctorId
      if (consultationFilters.farmerId !== 'all') filters.farmerId = consultationFilters.farmerId
      if (consultationFilters.startDate && consultationFilters.endDate) {
        filters.dateRange = {
          start: new Date(consultationFilters.startDate),
          end: new Date(consultationFilters.endDate)
        }
      }

      const result = await exportConsultations(filters)
      
      if (result.success) {
        downloadCSV(result.data || [], 'consultations-export')
        toast({ title: "Success", description: `Exported ${result.count} consultations` })
      } else {
        toast({ title: "Error", description: result.message || 'Failed to export consultations', variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: 'Failed to export consultations', variant: "destructive" })
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportLogs = async () => {
    setIsExporting('logs')
    try {
      const filters: any = {}
      
      if (logFilters.userId !== 'all') filters.userId = logFilters.userId
      if (logFilters.startDate && logFilters.endDate) {
        filters.dateRange = {
          start: new Date(logFilters.startDate),
          end: new Date(logFilters.endDate)
        }
      }

      const result = await exportSystemLogs(filters)
      
      if (result.success) {
        downloadCSV(result.data || [], 'system-logs-export')
        toast({ title: "Success", description: `Exported ${result.count} log entries` })
      } else {
        toast({ title: "Error", description: result.message || 'Failed to export logs', variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: 'Failed to export logs', variant: "destructive" })
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportSystemReport = async () => {
    setIsExporting('report')
    try {
      const result = await exportSystemReport()
      
      if (result.success) {
        downloadJSON(result.data, 'system-report')
        toast({ title: "Success", description: 'System report exported successfully' })
      } else {
        toast({ title: "Error", description: result.message || 'Failed to export system report', variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: 'Failed to export system report', variant: "destructive" })
    } finally {
      setIsExporting(null)
    }
  }

  const handleScheduleExport = async () => {
    if (!scheduleForm.email) {
      toast({ title: "Error", description: "Please enter an email address", variant: "destructive" })
      return
    }

    try {
      const result = await scheduleDataExport({
        exportType: scheduleForm.exportType as any,
        frequency: scheduleForm.frequency as any,
        email: scheduleForm.email
      })
      
      if (result.success) {
        toast({ title: "Success", description: 'Export scheduled successfully' })
        setScheduleForm({ exportType: 'users', frequency: 'weekly', email: '' })
      } else {
        toast({ title: "Error", description: result.message || 'Failed to schedule export', variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: 'Failed to schedule export', variant: "destructive" })
    }
  }

  const handleDownloadBackup = () => {
    setIsDownloadingBackup(true)
    toast({ title: "Preparing backup", description: "Your full database backup download will start shortly." })
    window.location.href = "/api/superadmin/database/export"
    setTimeout(() => setIsDownloadingBackup(false), 3000)
  }

  const handleImport = async () => {
    if (!importFile || !importConnectionString.trim()) return

    setIsImporting(true)
    setImportResult(null)
    setImportError(null)

    try {
      const formData = new FormData()
      formData.append("file", importFile)
      formData.append("connectionString", importConnectionString.trim())
      if (importTargetDatabase.trim()) formData.append("targetDatabase", importTargetDatabase.trim())

      const res = await fetch("/api/superadmin/database/import", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Import failed")
      }

      setImportResult(data)
      toast({ title: "Import complete", description: `Data imported into "${data.database}"` })
    } catch (error: any) {
      const message = error?.message || "Import failed"
      setImportError(message)
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{t('superadmin.dataExports') || 'Data Exports'}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('superadmin.exportSystemData') || 'Export system data in various formats'}</p>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="manual">{t('superadmin.manualExports') || 'Manual Exports'}</TabsTrigger>
          <TabsTrigger value="scheduled">{t('superadmin.scheduledExports') || 'Scheduled Exports'}</TabsTrigger>
          <TabsTrigger value="backup">{t('superadmin.databaseBackup') || 'Database Backup'}</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          {/* Users Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                {t('superadmin.exportUsers') || 'Export Users'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.exportUserData') || 'Export user data with filtering options'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>{t('superadmin.role') || 'Role'}</Label>
                  <Select value={userFilters.role} onValueChange={(value) => setUserFilters({...userFilters, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('superadmin.allRoles') || 'All Roles'}</SelectItem>
                      <SelectItem value="farmer">{t('superadmin.farmers') || 'Farmers'}</SelectItem>
                      <SelectItem value="doctor">{t('superadmin.doctors') || 'Doctors'}</SelectItem>
                      <SelectItem value="admin">{t('superadmin.admins') || 'Admins'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.status') || 'Status'}</Label>
                  <Select value={userFilters.status} onValueChange={(value) => setUserFilters({...userFilters, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('superadmin.allStatus') || 'All Status'}</SelectItem>
                      <SelectItem value="active">{t('superadmin.active') || 'Active'}</SelectItem>
                      <SelectItem value="suspended">{t('superadmin.suspended') || 'Suspended'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.startDate') || 'Start Date'}</Label>
                  <Input
                    type="date"
                    value={userFilters.startDate}
                    onChange={(e) => setUserFilters({...userFilters, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('superadmin.endDate') || 'End Date'}</Label>
                  <Input
                    type="date"
                    value={userFilters.endDate}
                    onChange={(e) => setUserFilters({...userFilters, endDate: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleExportUsers} disabled={isExporting === 'users'}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting === 'users' ? (t('superadmin.exporting') || 'Exporting...') : (t('superadmin.exportUsers') || 'Export Users')}
              </Button>
            </CardContent>
          </Card>

          {/* Consultations Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                {t('superadmin.exportConsultations') || 'Export Consultations'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.exportConsultationData') || 'Export consultation data with filtering options'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>{t('superadmin.status') || 'Status'}</Label>
                  <Select value={consultationFilters.status} onValueChange={(value) => setConsultationFilters({...consultationFilters, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('superadmin.allStatus') || 'All Status'}</SelectItem>
                      <SelectItem value="pending">{t('superadmin.pending') || 'Pending'}</SelectItem>
                      <SelectItem value="accepted">{t('superadmin.accepted') || 'Accepted'}</SelectItem>
                      <SelectItem value="completed">{t('superadmin.completed') || 'Completed'}</SelectItem>
                      <SelectItem value="rejected">{t('superadmin.rejected') || 'Rejected'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.doctor') || 'Doctor'}</Label>
                  <Select value={consultationFilters.doctorId} onValueChange={(value) => setConsultationFilters({...consultationFilters, doctorId: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('superadmin.allDoctors') || 'All Doctors'}</SelectItem>
                      {users.filter(u => u.role === 'doctor').map(doctor => (
                        <SelectItem key={doctor._id} value={doctor._id}>{doctor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.startDate') || 'Start Date'}</Label>
                  <Input
                    type="date"
                    value={consultationFilters.startDate}
                    onChange={(e) => setConsultationFilters({...consultationFilters, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('superadmin.endDate') || 'End Date'}</Label>
                  <Input
                    type="date"
                    value={consultationFilters.endDate}
                    onChange={(e) => setConsultationFilters({...consultationFilters, endDate: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleExportConsultations} disabled={isExporting === 'consultations'}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting === 'consultations' ? (t('superadmin.exporting') || 'Exporting...') : (t('superadmin.exportConsultations') || 'Export Consultations')}
              </Button>
            </CardContent>
          </Card>

          {/* System Logs Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                {t('superadmin.exportSystemLogs') || 'Export System Logs'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.exportLogData') || 'Export system activity and error logs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>{t('superadmin.user') || 'User'}</Label>
                  <Select value={logFilters.userId} onValueChange={(value) => setLogFilters({...logFilters, userId: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('superadmin.allUsers') || 'All Users'}</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user._id} value={user._id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.startDate') || 'Start Date'}</Label>
                  <Input
                    type="date"
                    value={logFilters.startDate}
                    onChange={(e) => setLogFilters({...logFilters, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('superadmin.endDate') || 'End Date'}</Label>
                  <Input
                    type="date"
                    value={logFilters.endDate}
                    onChange={(e) => setLogFilters({...logFilters, endDate: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleExportLogs} disabled={isExporting === 'logs'}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting === 'logs' ? (t('superadmin.exporting') || 'Exporting...') : (t('superadmin.exportLogs') || 'Export Logs')}
              </Button>
            </CardContent>
          </Card>

          {/* System Report Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                {t('superadmin.systemReport') || 'System Report'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.comprehensiveSystemReport') || 'Generate comprehensive system analytics report'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {t('superadmin.systemReportDesc') || 'Includes user statistics, consultation metrics, system health, and recent activity data.'}
              </p>
              <Button onClick={handleExportSystemReport} disabled={isExporting === 'report'}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting === 'report' ? (t('superadmin.generating') || 'Generating...') : (t('superadmin.generateReport') || 'Generate Report')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                {t('superadmin.scheduleExport') || 'Schedule Export'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.scheduleAutomaticExports') || 'Schedule automatic data exports to be sent via email'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>{t('superadmin.exportType') || 'Export Type'}</Label>
                  <Select value={scheduleForm.exportType} onValueChange={(value) => setScheduleForm({...scheduleForm, exportType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">{t('superadmin.users') || 'Users'}</SelectItem>
                      <SelectItem value="consultations">{t('superadmin.consultations') || 'Consultations'}</SelectItem>
                      <SelectItem value="logs">{t('superadmin.systemLogs') || 'System Logs'}</SelectItem>
                      <SelectItem value="system_report">{t('superadmin.systemReport') || 'System Report'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.frequency') || 'Frequency'}</Label>
                  <Select value={scheduleForm.frequency} onValueChange={(value) => setScheduleForm({...scheduleForm, frequency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('superadmin.daily') || 'Daily'}</SelectItem>
                      <SelectItem value="weekly">{t('superadmin.weekly') || 'Weekly'}</SelectItem>
                      <SelectItem value="monthly">{t('superadmin.monthly') || 'Monthly'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('superadmin.emailAddress') || 'Email Address'}</Label>
                  <Input
                    type="email"
                    value={scheduleForm.email}
                    onChange={(e) => setScheduleForm({...scheduleForm, email: e.target.value})}
                    placeholder={t('superadmin.enterEmail') || 'Enter email address'}
                  />
                </div>
              </div>
              <Button onClick={handleScheduleExport}>
                <Calendar className="w-4 h-4 mr-2" />
                {t('superadmin.scheduleExport') || 'Schedule Export'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          {/* Full Database Export */}
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                {t('superadmin.exportFullDatabase') || 'Export Full Database'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.exportFullDatabaseDesc') ||
                  "Downloads every collection and document in the database — including users, sessions, chats, and all other records — as a single compressed backup file."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {t('superadmin.exportFullDatabaseWarning') ||
                    'This file contains sensitive data (including account credentials and private messages). Store it securely and delete it once your migration is complete.'}
                </span>
              </div>
              <Button onClick={handleDownloadBackup} disabled={isDownloadingBackup}>
                <Download className="w-4 h-4 mr-2" />
                {isDownloadingBackup
                  ? (t('superadmin.startingDownload') || 'Starting download...')
                  : (t('superadmin.downloadFullBackup') || 'Download Full Backup')}
              </Button>
            </CardContent>
          </Card>

          {/* Full Database Import */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                {t('superadmin.importDatabaseBackup') || 'Import Database Backup'}
              </CardTitle>
              <CardDescription>
                {t('superadmin.importDatabaseBackupDesc') ||
                  "Restores a backup file into a different MongoDB Atlas cluster — for example, when moving this project to a new database. Documents that already exist in the target (matched by _id) are left untouched; only missing ones are inserted."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {t('superadmin.importConnectionStringWarning') ||
                    'The connection string below is sent to the server only to perform this import and is never stored or logged. Double-check it points at the correct (new) cluster before continuing.'}
                </span>
              </div>

              <div className="space-y-2">
                <Label>{t('superadmin.backupFile') || 'Backup file'}</Label>
                <Input
                  type="file"
                  accept=".gz,.ndjson,.json"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('superadmin.newDbConnectionString') || 'New database connection string'}</Label>
                <div className="relative">
                  <Input
                    type={showConnectionString ? "text" : "password"}
                    value={importConnectionString}
                    onChange={(e) => setImportConnectionString(e.target.value)}
                    placeholder="mongodb+srv://user:password@new-cluster.mongodb.net"
                    className="pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConnectionString((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConnectionString ? "Hide connection string" : "Show connection string"}
                  >
                    {showConnectionString ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('superadmin.targetDatabaseName') || 'Target database name (optional)'}</Label>
                <Input
                  value={importTargetDatabase}
                  onChange={(e) => setImportTargetDatabase(e.target.value)}
                  placeholder={t('superadmin.targetDatabaseNamePlaceholder') || "Defaults to the database name recorded in the backup"}
                />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!importFile || !importConnectionString.trim() || isImporting}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting
                      ? (t('superadmin.importing') || 'Importing...')
                      : (t('superadmin.importIntoNewDatabase') || 'Import Into New Database')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('superadmin.confirmImportTitle') || 'Import into the new database?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('superadmin.confirmImportDesc') ||
                        `This will connect to the connection string you entered and insert every document from "${importFile?.name ?? 'the selected backup file'}" into it. Documents that already exist there are skipped, not overwritten. Make sure the connection string is correct before continuing.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('superadmin.cancel') || 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImport} className="bg-red-600 hover:bg-red-700 text-white">
                      {t('superadmin.confirmImportAction') || 'Yes, import now'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {importError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{importError}</div>
              )}

              {importResult && (
                <div className="text-sm bg-green-50 border border-green-200 rounded-md p-3 space-y-1">
                  <p className="font-medium text-green-800">
                    {(t('superadmin.importedInto') || 'Imported into')} "{importResult.database}"
                  </p>
                  {Object.entries(importResult.summary).map(([name, stats]: [string, any]) => (
                    <p key={name} className="text-green-700">
                      {name}: {stats.documentsInserted} inserted, {stats.documentsSkipped} already existed
                      {stats.indexesCreated ? `, ${stats.indexesCreated} indexes created` : ""}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}