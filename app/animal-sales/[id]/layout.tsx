import type { Metadata } from "next"
import { storefrontListingMetadata } from "@/lib/public-listings"

// A listing sells or is hidden between visits, so it is checked on every request.
export const dynamic = "force-dynamic"

// The page is a client component; this is where the server learns an animal is gone (see storefrontListingMetadata).
export function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return storefrontListingMetadata("sales", params.id)
}

export default function AnimalDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
