import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Next 15+ calls this for every server-side request error. Next 14 ignores it (there the SDK's
// build-time wrappers report them), so it is here ready for an upgrade.
export const onRequestError = Sentry.captureRequestError
