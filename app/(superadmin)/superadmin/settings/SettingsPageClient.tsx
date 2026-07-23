'use client'

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Settings,
  Database,
  Mail,
  Shield,
  Bell,
  Save,
  AlertTriangle,
  Image,
  Upload,
  X
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { updateSystemSettings, performDatabaseAction } from "@/lib/actions/superadmin"
import { useRouter } from "next/navigation"

interface SettingsPageClientProps {
  settings: any
}

export default function SettingsPageClient({ settings }: SettingsPageClientProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(settings || {})
  const [bannerPreview, setBannerPreview] = useState<string | null>(settings?.bannerImage ?? null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
  const [removeBannerConfirmOpen, setRemoveBannerConfirmOpen] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const result = await updateSystemSettings(formData)
      if (result.success) {
        toast({ title: "Settings saved", description: "Your changes have been saved successfully." })
        router.refresh()
      } else {
        toast({ title: "Error", description: "Failed to save settings: " + result.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error saving settings", variant: "destructive" })
    }
    setIsSaving(false)
  }

  const handleDatabaseAction = async (action: string) => {
    try {
      const result = await performDatabaseAction(action)
      toast({ title: "Success", description: result.message })
    } catch (error) {
      toast({ title: "Error", description: "Error performing action", variant: "destructive" })
    }
  }

  const handleRestartServices = () => {
    setRestartConfirmOpen(false)
    toast({ title: "Not implemented", description: "System restart would be initiated (not implemented)" })
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload/banner", { method: "POST", body: form })
      const data = await res.json()
      if (data.success) {
        setBannerPreview(data.bannerImage)
        toast({ title: "Banner updated", description: "Banner image updated successfully." })
        router.refresh()
      } else {
        toast({ title: "Error", description: "Failed to upload banner: " + (data.message ?? "Unknown error"), variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Error uploading banner", variant: "destructive" })
    } finally {
      setBannerUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveBanner = async () => {
    setRemoveBannerConfirmOpen(false)
    try {
      const res = await fetch("/api/system/banner", { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setBannerPreview(null)
        toast({ title: "Banner removed", description: "The profile page will fall back to the default gradient." })
        router.refresh()
      } else {
        toast({ title: "Error", description: "Failed to remove banner", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Error removing banner", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('superadmin.systemSettings') || 'System Settings'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('superadmin.configureSystemWideSettings') || 'Configure system-wide settings and preferences'}</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>{t('superadmin.generalSettings') || 'General Settings'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">{t('superadmin.siteName') || 'Site Name'}</Label>
                <Input
                  id="siteName"
                  value={formData.siteName || ''}
                  onChange={(e) => handleInputChange('siteName', e.target.value)}
                  placeholder={t('superadmin.enterSiteName') || 'Enter site name'}
                />
              </div>
              <div>
                <Label htmlFor="siteEmail">{t('superadmin.siteEmail') || 'Site Email'}</Label>
                <Input
                  id="siteEmail"
                  type="email"
                  value={formData.siteEmail || ''}
                  onChange={(e) => handleInputChange('siteEmail', e.target.value)}
                  placeholder={t('superadmin.enterSiteEmail') || 'Enter site email'}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="siteDescription">{t('superadmin.siteDescription') || 'Site Description'}</Label>
              <Textarea
                id="siteDescription"
                value={formData.siteDescription || ''}
                onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                placeholder={t('superadmin.enterSiteDescription') || 'Enter site description'}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* User Management Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>{t('superadmin.userManagement') || 'User Management'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoApproveUsers">{t('superadmin.autoApproveUsers') || 'Auto-approve new users'}</Label>
                <p className="text-sm text-gray-500">
                  {t('superadmin.autoApproveUsersDesc') || 'Automatically approve new user registrations'}
                </p>
              </div>
              <Switch 
                id="autoApproveUsers" 
                checked={formData.autoApproveUsers || false}
                onCheckedChange={(checked) => handleInputChange('autoApproveUsers', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireEmailVerification">{t('superadmin.requireEmailVerification') || 'Require email verification'}</Label>
                <p className="text-sm text-gray-500">
                  {t('superadmin.requireEmailVerificationDesc') || 'Users must verify their email before accessing the system'}
                </p>
              </div>
              <Switch 
                id="requireEmailVerification" 
                checked={formData.requireEmailVerification || false}
                onCheckedChange={(checked) => handleInputChange('requireEmailVerification', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowUserDeletion">{t('superadmin.allowUserDeletion') || 'Allow user deletion'}</Label>
                <p className="text-sm text-gray-500">
                  {t('superadmin.allowUserDeletionDesc') || 'Allow super admins to permanently delete user accounts'}
                </p>
              </div>
              <Switch 
                id="allowUserDeletion" 
                checked={formData.allowUserDeletion || false}
                onCheckedChange={(checked) => handleInputChange('allowUserDeletion', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Security & Access Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>System Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableTwoFactor">Require 2FA for Admins</Label>
                <p className="text-sm text-gray-500">
                  Force two-factor authentication for admin and superadmin accounts
                </p>
              </div>
              <Switch 
                id="enableTwoFactor" 
                checked={formData.enableTwoFactor || false}
                onCheckedChange={(checked) => handleInputChange('enableTwoFactor', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sessionTimeout">Auto-logout inactive sessions</Label>
                <p className="text-sm text-gray-500">
                  Automatically log out users after period of inactivity
                </p>
              </div>
              <Switch 
                id="sessionTimeout" 
                checked={formData.sessionTimeout || false}
                onCheckedChange={(checked) => handleInputChange('sessionTimeout', checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionDuration">Session Duration (hours)</Label>
                <Input
                  id="sessionDuration"
                  type="number"
                  value={formData.sessionDuration || 8}
                  onChange={(e) => handleInputChange('sessionDuration', parseInt(e.target.value))}
                  placeholder="Enter session duration"
                />
              </div>
              <div>
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={formData.maxLoginAttempts || 5}
                  onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                  placeholder="Enter max attempts"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Limits & Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Limits</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUsersPerRole">Max Users per Role</Label>
                <Input
                  id="maxUsersPerRole"
                  type="number"
                  value={formData.maxUsersPerRole || 1000}
                  onChange={(e) => handleInputChange('maxUsersPerRole', parseInt(e.target.value))}
                  placeholder="Enter max users"
                />
              </div>
              <div>
                <Label htmlFor="maxConsultationsPerDay">Max Consultations/Day</Label>
                <Input
                  id="maxConsultationsPerDay"
                  type="number"
                  value={formData.maxConsultationsPerDay || 500}
                  onChange={(e) => handleInputChange('maxConsultationsPerDay', parseInt(e.target.value))}
                  placeholder="Enter max consultations"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                <p className="text-sm text-gray-500">
                  Enable maintenance mode to restrict system access
                </p>
              </div>
              <Switch 
                id="maintenanceMode" 
                checked={formData.maintenanceMode || false}
                onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>{t('superadmin.notifications') || 'Admin Notifications'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="systemAlerts">System Alerts</Label>
                <p className="text-sm text-gray-500">
                  Get notified about system errors, downtime, and critical issues
                </p>
              </div>
              <Switch 
                id="systemAlerts" 
                checked={formData.systemAlerts || false}
                onCheckedChange={(checked) => handleInputChange('systemAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="userRegistrationAlerts">{t('superadmin.userRegistrationAlerts') || 'User registration alerts'}</Label>
                <p className="text-sm text-gray-500">
                  {t('superadmin.userRegistrationAlertsDesc') || 'Get notified when new users register'}
                </p>
              </div>
              <Switch 
                id="userRegistrationAlerts" 
                checked={formData.userRegistrationAlerts || false}
                onCheckedChange={(checked) => handleInputChange('userRegistrationAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="suspiciousActivity">Suspicious Activity Alerts</Label>
                <p className="text-sm text-gray-500">
                  Get notified about failed login attempts and unusual activity
                </p>
              </div>
              <Switch 
                id="suspiciousActivity" 
                checked={formData.suspiciousActivityAlerts || false}
                onCheckedChange={(checked) => handleInputChange('suspiciousActivityAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>{t('superadmin.databaseMaintenance') || 'Database & Maintenance'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backupFrequency">{t('superadmin.backupFrequency') || 'Backup Frequency'}</Label>
                <Select 
                  value={formData.backupFrequency || 'daily'} 
                  onValueChange={(value) => handleInputChange('backupFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">{t('superadmin.hourly') || 'Hourly'}</SelectItem>
                    <SelectItem value="daily">{t('superadmin.daily') || 'Daily'}</SelectItem>
                    <SelectItem value="weekly">{t('superadmin.weekly') || 'Weekly'}</SelectItem>
                    <SelectItem value="monthly">{t('superadmin.monthly') || 'Monthly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="retentionPeriod">{t('superadmin.dataRetention') || 'Data Retention (days)'}</Label>
                <Input
                  id="retentionPeriod"
                  type="number"
                  value={formData.dataRetention || 365}
                  onChange={(e) => handleInputChange('dataRetention', parseInt(e.target.value))}
                  placeholder={t('superadmin.enterRetentionPeriod') || 'Enter retention period'}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">{t('superadmin.databaseActions') || 'Database Actions'}</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDatabaseAction('backup')}
                >
                  {t('superadmin.createBackup') || 'Create Backup'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDatabaseAction('optimize')}
                >
                  {t('superadmin.optimizeDatabase') || 'Optimize Database'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDatabaseAction('clearCache')}
                >
                  {t('superadmin.clearCache') || 'Clear Cache'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setRestartConfirmOpen(true)}
                >
                  Restart Services
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>{t('superadmin.emailConfiguration') || 'Email Configuration'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpHost">{t('superadmin.smtpHost') || 'SMTP Host'}</Label>
                <Input
                  id="smtpHost"
                  value={formData.smtpHost || ''}
                  onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                  placeholder={t('superadmin.enterSmtpHost') || 'Enter SMTP host'}
                />
              </div>
              <div>
                <Label htmlFor="smtpPort">{t('superadmin.smtpPort') || 'SMTP Port'}</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={formData.smtpPort || 587}
                  onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                  placeholder={t('superadmin.enterSmtpPort') || 'Enter SMTP port'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpUser">{t('superadmin.smtpUsername') || 'SMTP Username'}</Label>
                <Input
                  id="smtpUser"
                  type="email"
                  value={formData.smtpUser || ''}
                  onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                  placeholder={t('superadmin.enterSmtpUsername') || 'Enter SMTP username'}
                />
              </div>
              <div>
                <Label htmlFor="smtpPass">{t('superadmin.smtpPassword') || 'SMTP Password'}</Label>
                <Input
                  id="smtpPass"
                  type="password"
                  value={formData.smtpPass || ''}
                  onChange={(e) => handleInputChange('smtpPass', e.target.value)}
                  placeholder={t('superadmin.enterSmtpPassword') || 'Enter SMTP password'}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bookingNotificationEmail">Booking Notification Recipient</Label>
              <Input
                id="bookingNotificationEmail"
                type="email"
                value={formData.bookingNotificationEmail || ''}
                onChange={(e) => handleInputChange('bookingNotificationEmail', e.target.value)}
                placeholder="Email that receives new booking notifications"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to send booking notifications to the SMTP account above.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smtpSecure">{t('superadmin.useSslTls') || 'Use SSL/TLS'}</Label>
                <p className="text-sm text-gray-500">
                  {t('superadmin.useSslTlsDesc') || 'Enable secure connection for email sending'}
                </p>
              </div>
              <Switch
                id="smtpSecure"
                checked={formData.smtpSecure || false}
                onCheckedChange={(checked) => handleInputChange('smtpSecure', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Farmer Profile Banner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="h-5 w-5" />
              <span>Farmer Profile Banner</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              This banner is shown at the top of every farmer's profile page. All farmers see the same image.
            </p>
            <div className="relative h-36 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Profile banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-emerald-600 to-green-500 flex items-center justify-center">
                  <span className="text-white/70 text-sm">Default gradient (no image set)</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={bannerUploading}
                onClick={() => bannerInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {bannerUploading ? "Uploading…" : "Upload Banner"}
              </Button>
              {bannerPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setRemoveBannerConfirmOpen(true)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
              <span className="text-xs text-gray-400">JPEG, PNG, WebP or GIF · max 5 MB</span>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleBannerUpload}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Changes require system restart to take effect</span>
          </div>
          <Button 
            className="flex items-center space-x-2" 
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : (t('superadmin.saveSettings') || 'Save Settings')}</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={restartConfirmOpen} onOpenChange={setRestartConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart all services?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restart all services. Any in-progress requests may be interrupted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartServices} className="bg-red-600 hover:bg-red-700 text-white">
              Restart Services
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeBannerConfirmOpen} onOpenChange={setRemoveBannerConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the current banner image?</AlertDialogTitle>
            <AlertDialogDescription>
              The profile page will fall back to the default gradient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveBanner} className="bg-red-600 hover:bg-red-700 text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}