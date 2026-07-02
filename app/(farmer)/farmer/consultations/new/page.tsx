import { redirect } from "next/navigation"

export default function NewConsultationPage() {
  redirect("/farmer/consultations?action=add")
}
