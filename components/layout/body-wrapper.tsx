'use client'

import { usePathname } from "next/navigation"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import WhatsAppWidget from "@/components/widgets/whatsapp-widget"
import { Suspense } from "react"

export default function BodyWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith("/farmer") || pathname?.startsWith("/veterinary") || pathname?.startsWith("/trackdevice") || pathname?.startsWith("/maintenance") || pathname?.startsWith("/superadmin") || pathname?.startsWith("/admin");
  const isPublicPage = !isDashboard && !pathname?.startsWith("/login") && !pathname?.startsWith("/register");

  return (
    <Suspense>
      {!isDashboard && <Header />}
      <main>{children}</main>
      {!isDashboard && <Footer />}
      {isPublicPage && <WhatsAppWidget />}
    </Suspense>
  )
} 