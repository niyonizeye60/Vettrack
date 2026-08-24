'use client'

import { usePathname } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import WhatsAppWidget from "@/components/widgets/whatsapp-widget"
import { Suspense } from "react"
import { isPortalPath } from "@/lib/roles"

export default function BodyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Portals bring their own sidebar, header and frame. Rendering the public header
  // over one puts the marketing navbar on top of the portal's own brand - so the
  // list of portal prefixes lives in lib/roles.ts next to the roles themselves,
  // rather than being restated here where a new portal is easy to forget.
  const isDashboard = isPortalPath(pathname) || pathname?.startsWith("/maintenance")
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");
  const isPublicPage = !isDashboard && !isAuthPage;

  return (
    <Suspense>
      {!isDashboard && <Header />}
      {isDashboard ? children : <main>{children}</main>}
      {isPublicPage && <Footer />}
      {isPublicPage && <WhatsAppWidget />}
    </Suspense>
  )
}
