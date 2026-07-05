"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, BadgeCheck, Stethoscope, Camera, KeyRound } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCurrentUser } from "@/lib/actions/auth"
import { useToast } from "@/hooks/use-toast"

export default function VeterinaryProfilePage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerImage, setBannerImage] = useState<string | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [bio, setBio] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  async function loadProfile() {
    setLoading(true)
    try {
      const [userData, bannerRes] = await Promise.all([
        getCurrentUser(),
        fetch("/api/system/banner").then((r) => r.json()).catch(() => ({})),
      ])
      setBannerImage(bannerRes.bannerImage ?? null)
      if (userData) {
        setUser(userData)
        setAvatarPreview((userData as any).image ?? null)
        setEmail(userData.email ?? "")
        setPhone((userData as any).phone ?? "")
        setLicenseNumber((userData as any).licenseNumber ?? "")
        setSpecialization((userData as any).specialization ?? "")
        setBio((userData as any).bio ?? "")
        const parts = (userData.name ?? "").split(" ")
        setFirstName(parts[0] ?? "")
        setLastName(parts.slice(1).join(" ") ?? "")
      }
    } catch (err) {
      console.error("Failed to load profile:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "V"

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form })
      const data = await res.json()
      if (data.success) {
        setAvatarPreview(data.image)
        toast({ title: t("vet.profileUpdated"), description: t("vet.profileUpdatedDesc") })
      } else {
        toast({ title: t("common.error"), description: data.message ?? "Upload failed", variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error"), description: "Upload failed", variant: "destructive" })
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      toast({ title: t("common.error"), description: t("vet.passwordMismatch"), variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const name = [firstName, lastName].filter(Boolean).join(" ").trim() || firstName
      const payload: Record<string, string> = { name, email, phone, bio, licenseNumber, specialization }
      if (password) payload.password = password

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) throw new Error(data?.message ?? "Save failed")

      toast({ title: t("vet.profileUpdated"), description: t("vet.profileUpdatedDesc") })
      setPassword("")
      setConfirmPassword("")
      await loadProfile()
    } catch (err: any) {
      toast({ title: t("common.error"), description: err?.message ?? "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-64" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-96 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("vet.profile")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("vet.manageProfile")}</p>
      </div>

      {/* Identity card */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        {/* Banner — avatar anchored to its bottom edge */}
        <div className="relative h-36">
          {bannerImage ? (
            <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-green-600 to-green-500" />
          )}
          <div className="absolute bottom-0 left-5 translate-y-1/2">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white shadow-sm">
                <AvatarImage src={avatarPreview ?? undefined} alt={user?.name} />
                <AvatarFallback className="bg-green-100 text-green-700 text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                title={t("vet.changeAvatar")}
              >
                <Camera className="h-3 w-3 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content — top padding clears the avatar overhang (h-20/2 = 40px → pt-12) */}
        <CardContent className="pt-14 pb-5 px-5">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate">
              {[firstName, lastName].filter(Boolean).join(" ") || t("vet.veterinarian")}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Stethoscope className="h-2.5 w-2.5 mr-1" />
                {t("vet.veterinarian")}
              </Badge>
              {specialization && (
                <span className="text-xs text-gray-500">{specialization}</span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">{t("vet.avatarHint")}</p>
        </CardContent>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </Card>

      {/* Profile form */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <User className="h-5 w-5 text-green-600" />
            {t("vet.personalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t("vet.firstName")}</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("vet.firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t("vet.lastName")}</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("vet.lastName")} />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" />{t("common.email")}</span>
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />{t("vet.phoneNumber")}</span>
              </Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 ..." />
            </div>
          </div>

          {/* License + Specialization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="license">
                <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-gray-400" />{t("vet.licenseNumber")}</span>
              </Label>
              <Input id="license" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder={t("vet.licenseNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialization">
                <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-gray-400" />{t("vet.specialization")}</span>
              </Label>
              <Input id="specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder={t("vet.specialization")} />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">{t("vet.professionalBio")}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("vet.professionalBio")}
              rows={3}
              className="resize-none"
            />
          </div>

          <Separator />

          {/* Password */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">{t("vet.changePassword")}</p>
              <span className="text-xs text-gray-400">— {t("vet.leaveBlankPassword")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("vet.newPassword")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t("vet.confirmPassword")}</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-1">
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white min-w-28">
              {saving ? t("vet.saving") : t("vet.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
