"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"

export default function FarmerSettingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [name, setName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [phone, setPhone] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  async function loadProfile() {
    setLoading(true)
    try {
      const userData = await getCurrentUser()
      if (userData) {
        setName(userData.name || "")
        setEmail(userData.email || "")
        setPhone(userData.phone || "")
      }
    } catch (err) {
      console.error("Failed to load profile:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload: Record<string, any> = { name, email, phone }
      if (password) payload.password = password

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Save failed")
      }

      toast({ title: t('farmer.profileSaved'), description: t('farmer.profileSavedDesc') })
      setPassword("") // clear password field after successful save
      await loadProfile()
    } catch (err: any) {
      console.error(err)
      toast({
        title: t('farmer.profileSaveFailed'),
        description: err?.message ?? undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('farmer.settings')}
        </h1>
        <p className="text-sm text-gray-500">{t('farmer.manageAccountSettings')}</p>
      </div>

      <div className="bg-white/90 shadow-xl rounded-lg border-0 p-4 sm:p-6 lg:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          {t('farmer.myProfile')}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{t('farmer.fullName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              placeholder={t('farmer.fullName')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{t('common.email')}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              placeholder={t('common.email')}
              type="email"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{t('farmer.phoneNumber')}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              placeholder={t('farmer.phoneNumber')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{t('farmer.changePassword')}</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              placeholder={t('farmer.leaveBlankPassword')}
              type="password"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-medium shadow-lg disabled:opacity-60 text-sm sm:text-base"
          >
            {saving ? t('farmer.saving') : t('farmer.saveChanges')}
          </button>

          <button
            onClick={() => {
              loadProfile()
              setPassword("")
            }}
            className="px-4 sm:px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm sm:text-base"
          >
            {t('farmer.reset')}
          </button>

          {loading && (
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-500 py-2">
              <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
              {t('common.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
