import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/public-listings"

// Nothing is disallowed on purpose. Keeping a page out of search results is done with
// noindex (NOINDEX_PATHS in next.config.mjs, and the error screens), which only works
// if Google may fetch the page. /api must stay fetchable because the storefronts load
// their products from it. Portals redirect anonymous visitors to /login, so there is
// nothing behind them to hide.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
