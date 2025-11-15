import type { Metadata } from "next"
import BlogList from "@/components/blog/blog-list"
import BlogBanner from "@/components/blog/blog-banner"

export const metadata: Metadata = {
  title: "Blog - NTDM Animal Hospital",
  description: "Read the latest articles on animal health, tracking, and care from NTDM Animal Hospital experts.",
}

export default function BlogPage() {
  return (
    <>
      <BlogBanner />
      <div className="py-16">
        <div className="container-custom">
          <BlogList />
        </div>
      </div>
    </>
  )
}
