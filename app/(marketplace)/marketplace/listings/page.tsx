import { getCurrentUser } from "@/lib/auth"
import { allowedMarketplaceCategories } from "@/lib/marketplace-access"
import ListingsManager from "@/components/marketplace/listings-manager"

export default async function MarketplaceListingsPage() {
  const user = await getCurrentUser()
  return <ListingsManager allowedCategories={allowedMarketplaceCategories(user)} />
}
