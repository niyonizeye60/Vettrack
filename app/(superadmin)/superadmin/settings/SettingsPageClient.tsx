'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Settings, 
  Database, 
  Mail, 
  Shield, 
  Bell,
  Save,
  AlertTriangle
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { updateSystemSettings, performDatabaseAction } from "@/lib/actions/superadmin"
import { useRouter } from "next/navigation"

interface SettingsPageClientProps {
  settings: any
}

export default function SettingsPageClient({ settings }: SettingsPageClientProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(settings || {})
  
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }
  
  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const result = await updateSystemSettings(formData)
      if (result.success) {
        alert('Settings saved successfully!')
        router.refresh()
      } else {
        alert('Failed to save settings: ' + result.message)
      }
    } catch (error) {
      alert('Error saving settings')
    }
    setIsSaving(false)
  }
  
  const handleDatabaseAction = async (action: string) => {
    try {
      const result = await performDatabaseAction(action)
      alert(result.message)
    } catch (error) {
      alert('Error performing action')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('superadmin.systemSettings') || 'System Settings'}</h1>
        <p className="text-gray-600 mt-2">{t('superadmin.configureSystemWideSettings') || 'Configure system-wide settings and preferences'}</p>
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
                  onClick={() => confirm('Are you sure? This will restart all services.') && alert('System restart would be initiated (not implemented)')}
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
    </div>
  )
}