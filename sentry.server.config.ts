import * as Sentry from "@sentry/nextjs"
import { sentryBaseOptions } from "@/lib/sentry-config"

Sentry.init({
  ...sentryBaseOptions,
  // Most server code catches its own errors, console.errors them (often next to logSystemError)
  // and returns { success: false }, so an uncaught-errors-only SDK would miss nearly all of
  // them. Turning console.error into events is what surfaces those.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
  // Nothing we call (Mongo Atlas, Upstash, ThingSpeak, the payment providers) understands
  // Sentry's trace headers, so don't attach them to outgoing requests.
  tracePropagationTargets: [],
})
