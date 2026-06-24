// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import GoogleAnalytics from "@/components/analytics/google-analytics"
import BodyWrapper from "@/components/layout/body-wrapper"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
})

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: "NTDM Animal Hospital",
  icons: {
    icon: "/logo/NTDM.png",
  },
  description:
    "Leading animal hospital in Rwanda offering tracking devices, veterinary consultations, disease monitoring, and animal sales.",
  keywords: "animal hospital, veterinary care, animal tracking, disease monitoring, pet care, livestock management",
  openGraph: {
    title: "NTDM Animal Hospital - Track, Consult, and Care",
    description:
      "Leading animal hospital in Rwanda offering tracking devices, veterinary consultations, disease monitoring, and animal sales.",
    images: ["/images/og-image.jpg"],
    type: "website",
    locale: "en_RW",
  },
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <GoogleAnalytics />
        <LanguageProvider>
          <BodyWrapper>{children}</BodyWrapper>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  )
}
