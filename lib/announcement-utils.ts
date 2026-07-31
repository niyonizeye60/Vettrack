export interface AnnouncementTargetInfo {
  targetType: "all" | "role" | "user"
  targetRole: "farmer" | "doctor" | "admin" | null
  targetUserName: string | null
}

function targetRoleLabel(role: string | null, t: (key: string) => string) {
  if (role === "doctor") return t("content.veterinarian")
  if (role === "admin") return t("superadmin.category.admin")
  return t("admin.farmerName")
}

// Shared by the admin and superadmin content pages so both surfaces describe
// an announcement's audience the same way.
export function getAnnouncementTargetLabel(announcement: AnnouncementTargetInfo, t: (key: string) => string) {
  if (announcement.targetType === "user") {
    return `${announcement.targetUserName || t("content.recipient")} (${targetRoleLabel(announcement.targetRole, t)})`
  }
  if (announcement.targetType === "role") {
    if (announcement.targetRole === "admin") return t("content.allAdmins")
    return announcement.targetRole === "doctor" ? t("content.allVeterinarians") : t("content.allFarmers")
  }
  return t("content.everyone")
}
