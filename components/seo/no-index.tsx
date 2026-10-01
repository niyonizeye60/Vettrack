"use client"

import { useEffect } from "react"

/**
 * Tells search engines not to index the page while this is on screen.
 *
 * For screens that replace a page's content after it has already been served with
 * "200 OK" - the error boundary, or a detail page whose item could not be loaded.
 * Google renders the JavaScript and would otherwise index the error text under the
 * page's real URL: /login once showed up in results as "Something went wrong".
 *
 * Added to <head> by hand because React 18 renders a <meta> where it stands, in the
 * body, and a client component can't export metadata. Removed again on unmount, so
 * a successful "Try again" leaves the page indexable.
 */
export default function NoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return null
}
