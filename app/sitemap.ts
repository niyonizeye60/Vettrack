import type { MetadataRoute } from "next"
import { getPublishedBlogPosts } from "@/lib/actions/blog"
import { SITE_URL, STOREFRONT_PATHS, listPublicListings, type StorefrontCategory } from "@/lib/public-listings"

// Built per request from the database: listings come and go daily, and building it at
// deploy time would need the database during the build.
export const dynamic = "force-dynamic"

/** The public pages worth landing on from a search. Login and register are left to be found through links. */
const PAGES = ["/", "/services", "/booking", "/animal-sales", "/pharmacy", "/feeds", "/blog", "/about", "/contact", "/privacy", "/terms"]

/** The built-in articles hard-coded in app/blog/[id]/page.tsx (and components/blog/blog-list.tsx). */
const STATIC_BLOG_POST_IDS = [1, 2, 3, 4, 5, 6]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, posts] = await Promise.all([
    // Without the database the sitemap still lists the fixed pages, rather than failing whole.
    listPublicListings().catch((error) => {
      console.error("Sitemap: failed to load listings:", error)
      return []
    }),
    getPublishedBlogPosts(),
  ])

  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...STATIC_BLOG_POST_IDS.map((id) => ({ url: `${SITE_URL}/blog/${id}` })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.id}`,
      lastModified: post.updatedAt || post.createdAt || undefined,
    })),
    ...listings.map((listing) => ({
      url: `${SITE_URL}${STOREFRONT_PATHS[listing.category as StorefrontCategory]}/${listing._id.toString()}`,
      lastModified: listing.updatedAt || listing.createdAt || undefined,
    })),
  ]
}
