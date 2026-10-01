import type { Metadata } from "next"
import { storefrontListingMetadata } from "@/lib/public-listings"

// A drug sells out, expires or is hidden between visits, so it is checked on every request.
export const dynamic = "force-dynamic"

// The page is a client component; this is where the server learns a drug is gone (see storefrontListingMetadata).
export function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return storefrontListingMetadata("drugs", params.id)
}

export default function DrugDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
