"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AnnouncementInput, TargetableUser } from "@/lib/actions/announcements"

export default function AnnouncementTargetFields({
  idPrefix,
  formData,
  setFormData,
  targetableUsers,
  targetableUsersLoading,
  t,
  allowAdminTarget = false,
}: {
  idPrefix: string
  formData: AnnouncementInput
  setFormData: (data: AnnouncementInput) => void
  targetableUsers: TargetableUser[]
  targetableUsersLoading: boolean
  t: (key: string) => string
  // Only superadmins may target admins - regular admins never get this option.
  allowAdminTarget?: boolean
}) {
  const sendToValue =
    formData.targetType === "role" ? `role:${formData.targetRole || ""}` :
    formData.targetType === "user" ? "user" : "all"

  const handleSendToChange = (value: string) => {
    if (value === "all") {
      setFormData({ ...formData, targetType: "all", targetRole: "", targetUserId: "", targetUserName: "" })
    } else if (value.startsWith("role:")) {
      const role = value.split(":")[1] as "farmer" | "doctor" | "admin"
      setFormData({ ...formData, targetType: "role", targetRole: role, targetUserId: "", targetUserName: "" })
    } else {
      setFormData({ ...formData, targetType: "user", targetRole: "farmer", targetUserId: "", targetUserName: "" })
    }
  }

  const usersForSelectedRole = targetableUsers.filter((u) => u.role === (formData.targetRole || "farmer"))

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`${idPrefix}-sendTo`}>{t("content.sendTo")}</Label>
        <Select value={sendToValue} onValueChange={handleSendToChange}>
          <SelectTrigger id={`${idPrefix}-sendTo`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("content.everyone")}</SelectItem>
            <SelectItem value="role:farmer">{t("content.allFarmers")}</SelectItem>
            <SelectItem value="role:doctor">{t("content.allVeterinarians")}</SelectItem>
            {allowAdminTarget && <SelectItem value="role:admin">{t("content.allAdmins")}</SelectItem>}
            <SelectItem value="user">{t("content.specificUser")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.targetType === "user" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${idPrefix}-recipientRole`}>{t("content.recipientRole")}</Label>
            <Select
              value={formData.targetRole || "farmer"}
              onValueChange={(value: "farmer" | "doctor" | "admin") => setFormData({ ...formData, targetRole: value, targetUserId: "", targetUserName: "" })}
            >
              <SelectTrigger id={`${idPrefix}-recipientRole`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="farmer">{t("admin.farmerName")}</SelectItem>
                <SelectItem value="doctor">{t("content.veterinarian")}</SelectItem>
                {allowAdminTarget && <SelectItem value="admin">{t("superadmin.category.admin")}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-selectUser`}>{t("content.selectUser")}</Label>
            <Select
              value={formData.targetUserId || undefined}
              onValueChange={(value) => {
                const picked = usersForSelectedRole.find((u) => u.id === value)
                setFormData({ ...formData, targetUserId: value, targetUserName: picked?.name || "" })
              }}
            >
              <SelectTrigger id={`${idPrefix}-selectUser`}>
                <SelectValue placeholder={targetableUsersLoading ? t("content.loadingUsers") : t("content.selectRecipient")} />
              </SelectTrigger>
              <SelectContent>
                {usersForSelectedRole.length ? (
                  usersForSelectedRole.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">{t("content.noUsersFound")}</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
