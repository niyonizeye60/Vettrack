"use client"

import { useEffect, useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { reportClientError } from "@/lib/actions"

// This only fires when the root layout itself throws (very rare) - Next.js requires it to
// render its own <html>/<body> since it replaces the whole page, so no Tailwind/globals.css
// is guaranteed to be loaded here. Keep it inline-styled and dependency-free.

// No LanguageProvider up here either, so the two languages are inlined and the reader's
// choice is read from where LanguageContext saves it.
const TEXT = {
  en: {
    title: "Something went wrong",
    body: "An unexpected error occurred. It's been logged and we'll take a look.",
    retry: "Try again",
    home: "Go home",
  },
  rw: {
    title: "Hari ikitagenze neza",
    body: "Habaye ikosa ritunguranye. Ryanditswe kandi tugiye kurikurikirana.",
    retry: "Ongera ugerageze",
    home: "Jya ahabanza",
  },
}
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [lang, setLang] = useState<keyof typeof TEXT>("en")
  useEffect(() => {
    try {
      if (localStorage.getItem("language") === "rw") setLang("rw")
    } catch {
      // Storage blocked - English it is.
    }
  }, [])
  const text = TEXT[lang]

  useEffect(() => {
    Sentry.captureException(error)
    reportClientError(error.message, error.stack).catch(() => {})
  }, [error])

  return (
    <html lang={lang}>
      {/* Served under the URL that failed, so without this Google indexes the error text as that page. */}
      <head>
        <meta name="robots" content="noindex" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
              {text.title}
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
              {text.body}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={() => reset()}
                style={{ padding: "8px 16px", borderRadius: 9999, background: "#2563eb", color: "#fff", border: "none", fontSize: 14, cursor: "pointer" }}
              >
                {text.retry}
              </button>
              <button
                onClick={() => { window.location.href = "/" }}
                style={{ padding: "8px 16px", borderRadius: 9999, background: "#fff", color: "#111827", border: "1px solid #d1d5db", fontSize: 14, cursor: "pointer" }}
              >
                {text.home}
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
