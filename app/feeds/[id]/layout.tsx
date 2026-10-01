import type { Metadata } from "next"
import { storefrontListingMetadata } from "@/lib/public-listings"

// A feed sells out, expires or is hidden between visits, so it is checked on every request.
export const dynamic = "force-dynamic"

// The page is a client component; this is where the server learns a feed is gone (see storefrontListingMetadata).
export function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return storefrontListingMetadata("feeds", params.id)
}

export default function FeedDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
