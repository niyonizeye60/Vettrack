import * as Sentry from "@sentry/nextjs"
import { sentryBaseOptions } from "@/lib/sentry-config"

// Runs for middleware.ts (API rate limiting and the portal login redirect).
Sentry.init(sentryBaseOptions)
