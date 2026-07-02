"use client"

import { useEffect, useRef, useState } from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { useLanguage } from "@/contexts/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function FarmerSettingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [bio, setBio] = useState("")
  const [password, setPassword] = useState("")

  async function loadProfile() {
    setLoading(true)
    try {
      const userData = await getCurrentUser()
      if (userData) {
        setUser(userData)
        setAvatarPreview(userData.image ?? null)
        setEmail(userData.email ?? "")
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
    : "?"

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
        toast({ title: t("farmer.profileUpdated") || "Profile updated", description: t("farmer.profileUpdatedDesc") || "Your avatar has been changed." })
      } else {
        toast({ title: t("common.error") || "Error", description: data.message ?? "Upload failed", variant: "destructive" })
      }
    } catch {
      toast({ title: t("common.error") || "Error", description: "Upload failed", variant: "destructive" })
    } finally {
      setAvatarUploading(false)
      e.target.value = ""
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const name = [firstName, lastName].filter(Boolean).join(" ").trim() || firstName
      const payload: Record<string, string> = { name, email, bio }
      if (password) payload.password = password

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw new Error(data?.message ?? "Save failed")
      }

      toast({ title: t("farmer.profileUpdated") || "Saved", description: t("farmer.profileUpdatedDesc") || "Your profile has been updated." })
      setPassword("")
      await loadProfile()
    } catch (err: any) {
      toast({ title: t("common.error") || "Error", description: err?.message ?? "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-56" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("farmer.settings") || "Settings"}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("farmer.manageAccountSettings") || "Manage your account settings and preferences"}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("farmer.profile") || "Profile"}</CardTitle>
          <p className="text-sm text-gray-500">{t("farmer.profileDesc") || "Update your personal information"}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-gray-100">
              <AvatarImage src={avatarPreview ?? undefined} alt={user?.name} />
              <AvatarFallback className="bg-emerald-600 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarUploading ? "Uploading…" : t("farmer.changeAvatar") || "Change avatar"}
              </Button>
              <p className="text-xs text-gray-400 mt-1">
                {t("farmer.avatarHint") || "JPG, PNG or GIF. Max 2MB."}
              </p>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <Separator />

          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t("farmer.firstName") || "First name"}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("farmer.firstName") || "First name"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t("farmer.lastName") || "Last name"}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("farmer.lastName") || "Last name"}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("common.email") || "Email"}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">{t("farmer.bio") || "Bio"}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("farmer.bio") || "Tell us a little about yourself"}
              rows={4}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("farmer.changePassword") || "New password"}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("farmer.leaveBlankPassword") || "Leave blank to keep current password"}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (t("farmer.saving") || "Saving…") : (t("farmer.saveChanges") || "Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
