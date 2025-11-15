import type { Metadata } from "next"
import AboutContent from "@/components/about/about-content"

export const metadata: Metadata = {
  title: "About Us - NTDM Animal Hospital",
  description: "Learn about NTDM Animal Hospital's mission, vision, and our team of expert veterinarians.",
}

export default function AboutPage() {
  return <AboutContent />
}