import { getSystemSettings } from "@/lib/actions/superadmin"
import SettingsPageClient from "./SettingsPageClient"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSystemSettings()

  return <SettingsPageClient settings={settings} />
}