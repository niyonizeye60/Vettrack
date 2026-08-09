import type { Metadata } from "next"
import AboutContent from "@/components/about/about-content"

export const metadata: Metadata = {
  title: "About Us - NTDM Vettrack",
  description: "Learn about NTDM Vettrack's mission, vision, and our team of expert veterinarians.",
}

export default function AboutPage() {
  return <AboutContent />
}