export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/actions/auth"
import { redirect } from "next/navigation"
import ClientManifestHelper from "./page-client-manifest"
import VeterinaryLayoutClient from "@/components/veterinary/veterinary-layout-client"

export default async function VeterinaryRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== "doctor") {
    redirect("/login")
  }

  return (
    <VeterinaryLayoutClient>
      <ClientManifestHelper />
      {children}
    </VeterinaryLayoutClient>
  )
} 