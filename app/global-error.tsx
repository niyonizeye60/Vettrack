"use client"

import { useEffect } from "react"
import { reportClientError } from "@/lib/actions"

// This only fires when the root layout itself throws (very rare) - Next.js requires it to
// render its own <html>/<body> since it replaces the whole page, so no Tailwind/globals.css
// is guaranteed to be loaded here. Keep it inline-styled and dependency-free.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error.message, error.stack).catch(() => {})
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
              An unexpected error occurred. It's been logged and we'll take a look.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={() => reset()}
                style={{ padding: "8px 16px", borderRadius: 9999, background: "#2563eb", color: "#fff", border: "none", fontSize: 14, cursor: "pointer" }}
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = "/" }}
                style={{ padding: "8px 16px", borderRadius: 9999, background: "#fff", color: "#111827", border: "1px solid #d1d5db", fontSize: 14, cursor: "pointer" }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
