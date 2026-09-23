import * as Sentry from "@sentry/nextjs"
import { sentryBaseOptions } from "@/lib/sentry-config"

// No Session Replay on purpose: chat, health-record and payment screens must not be recorded.
Sentry.init({
  ...sentryBaseOptions,
  // Errors that only mean "the connection dropped" (common on mobile data), a stale tab after
  // a deploy, or a browser extension - nothing to fix, and they would eat the plan's quota.
  // The fetch ones are anchored so an app-thrown "Failed to fetch <thing>" is still reported.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^Failed to fetch$/,
    /^Load failed$/,
    /^NetworkError when attempting to fetch resource\.?$/,
    /^AbortError/,
    /^ChunkLoadError/,
    /^Loading chunk [\w-]+ failed/,
  ],
  denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-(web-)?extension:\/\//i],
})
