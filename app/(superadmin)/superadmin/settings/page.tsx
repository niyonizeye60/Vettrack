import { getSystemSettings, getFarmLocationRestriction } from "@/lib/actions/superadmin"
import SettingsPageClient from "./SettingsPageClient"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [settings, farmLocationRestriction] = await Promise.all([
    getSystemSettings(),
    getFarmLocationRestriction(),
  ])

  return <SettingsPageClient settings={settings} farmLocationRestriction={farmLocationRestriction} />
}
