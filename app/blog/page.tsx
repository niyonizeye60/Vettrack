import type { Metadata } from "next"
import BlogList from "@/components/blog/blog-list"
import BlogBanner from "@/components/blog/blog-banner"
import { getPublishedBlogPosts } from "@/lib/actions/blog"

export const metadata: Metadata = {
  title: "Blog - NTDM Animal Hospital",
  description: "Read the latest articles on animal health, tracking, and care from NTDM Animal Hospital experts.",
}

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const dynamicPosts = await getPublishedBlogPosts()

  return (
    <>
      <BlogBanner />
      <div className="py-16">
        <div className="container-custom">
          <BlogList dynamicPosts={dynamicPosts} />
        </div>
      </div>
    </>
  )
}
