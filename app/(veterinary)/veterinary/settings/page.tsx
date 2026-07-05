"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Lock, Globe, Save, KeyRound } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import { useToast } from "@/hooks/use-toast"

export default function VeterinarySettingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    consultationReminders: true,
    marketingEmails: false,
    language: "en",
    timezone: "Africa/Kigali",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser()
        if (userData?.settings) {
          setSettings((prev) => ({ ...prev, ...(userData as any).settings }))
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      if (res.ok) {
        toast({ title: t("vet.profileUpdated"), description: t("vet.manageAccountSettings") })
      } else {
        toast({ title: t("common.error"), description: "Failed to update settings", variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error"), description: "Failed to update settings", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: t("common.error"), description: t("vet.passwordMismatch"), variant: "destructive" })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: t("common.error"), description: "Password must be at least 6 characters", variant: "destructive" })
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      if (res.ok) {
        toast({ title: t("vet.passwordChanged"), description: t("vet.passwordChangedDesc") })
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        toast({ title: t("common.error"), description: "Failed to change password", variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error"), description: "Failed to change password", variant: "destructive" })
    } finally {
      setChangingPassword(false)
    }
  }

  const notifToggles = [
    { key: "emailNotifications",     label: t("vet.emailNotifications"),     desc: t("vet.emailNotificationsDesc") },
    { key: "pushNotifications",      label: t("vet.pushNotifications"),      desc: t("vet.pushNotificationsDesc") },
    { key: "consultationReminders",  label: t("vet.consultationReminders"),  desc: t("vet.consultationRemindersDesc") },
    { key: "marketingEmails",        label: t("vet.marketingEmails"),        desc: t("vet.marketingEmailsDesc") },
  ] as const

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("vet.settings")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("vet.manageAccountSettings")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Notification Preferences */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Bell className="h-5 w-5 text-green-600" />
              {t("vet.notificationPreferences")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {notifToggles.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })}
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Globe className="h-5 w-5 text-blue-500" />
              {t("vet.generalSettings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="space-y-1.5">
              <Label>{t("vet.language")}</Label>
              <Select value={settings.language} onValueChange={(v) => setSettings({ ...settings, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="rw">Kinyarwanda</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("vet.timezone")}</Label>
              <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Kigali">Kigali (GMT+2)</SelectItem>
                  <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                  <SelectItem value="Africa/Nairobi">Nairobi (GMT+3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? t("vet.saving") : t("vet.saveChanges")}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Lock className="h-5 w-5 text-orange-500" />
              {t("vet.securitySettings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">{t("vet.changePassword")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">{t("vet.currentPassword")}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder={t("vet.currentPasswordPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("vet.newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("vet.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                className="bg-green-600 hover:bg-green-700 text-white min-w-36"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                {changingPassword ? t("vet.saving") : t("vet.changePassword")}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
