"use client"

import { useEffect } from "react"
import { recordBlogView } from "@/lib/actions/blog"

export default function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    recordBlogView(postId)
  }, [postId])

  return null
}
