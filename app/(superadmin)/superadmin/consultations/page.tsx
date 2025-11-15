import { getAllConsultations } from "@/lib/actions/superadmin"
import ConsultationsPageClient from "./ConsultationsPageClient"

export const dynamic = 'force-dynamic'
export default async function ConsultationsManagementPage() {
  const consultations = await getAllConsultations()

  return <ConsultationsPageClient consultations={consultations} />
}
