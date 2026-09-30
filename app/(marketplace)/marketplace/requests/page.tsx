import { getCurrentUser } from "@/lib/auth"
import { canAccessMarketplaceCategory } from "@/lib/marketplace-access"
import { LISTING_KINDS, LISTING_KIND_CATEGORY } from "@/lib/validations/listing-request"
import RequestsQueue from "@/components/marketplace/requests-queue"

export default async function MarketplaceRequestsPage() {
  const user = await getCurrentUser()
  // A reviewer sees the queue for each kind whose storefront category they hold -
  // farmers' animals for "sales", pharmacies' drugs for "drugs", feed suppliers' feed
  // for "feeds". The API checks the same rule on every call; this only decides which
  // switches to draw.
  const allowedKinds = LISTING_KINDS.filter((kind) => canAccessMarketplaceCategory(user, LISTING_KIND_CATEGORY[kind]))
  return <RequestsQueue allowedKinds={allowedKinds} />
}
