import type { Breadcrumb, Event } from "@sentry/nextjs"

// Shared by instrumentation-client.ts, sentry.server.config.ts and sentry.edge.config.ts so the
// three Sentry.init calls cannot drift apart. With no DSN (local dev, or a deploy that hasn't
// set NEXT_PUBLIC_SENTRY_DSN) the SDK stays off.

// What must never reach a third party: reset/verify links carry a live ?token=, the ThingSpeak
// proxy puts each farmer's device api_key in an outgoing URL, and request bodies, cookies and
// console output can hold chat text or payment details. So the query string and fragment are cut
// from every URL or path found in an event, and bodies, cookies and console breadcrumbs are dropped.
//
// URLs are matched by value, not by field name, on purpose: which fields the SDK and Next put a
// URL into varies by version and runtime, and a name-based list missed Next's `next.span_name`
// ("GET /login?token=...") when tested.
const SENSITIVE_HEADERS = new Set(["cookie", "authorization", "x-forwarded-for", "x-real-ip"])
const QUERY_KEYS = new Set(["http.query", "url.query", "query_string"])
const URL_TAIL = /((?:https?:\/\/|\/)[^\s"'?#]*)[?#][^\s"']*/g
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g

const stripUrlTails = (text: string) => text.replace(URL_TAIL, "$1")
// Error text is free-form: Mongo duplicate-key errors, for one, quote the offending email.
const cleanMessage = (text: string) => stripUrlTails(text).replace(EMAIL, "[email]")

function scrubData(data: Record<string, unknown> | undefined) {
  if (!data) return
  for (const key of Object.keys(data)) {
    const value = data[key]
    if (QUERY_KEYS.has(key)) delete data[key]
    else if (typeof value === "string") data[key] = stripUrlTails(value)
  }
}

// Used for both errors and performance transactions (spans carry the outgoing request URLs).
export function scrubEvent<T extends Event>(event: T): T {
  const { request } = event
  if (request) {
    if (request.url) request.url = stripUrlTails(request.url)
    delete request.query_string
    delete request.cookies
    delete request.data
    for (const [name, value] of Object.entries(request.headers ?? {})) {
      if (SENSITIVE_HEADERS.has(name.toLowerCase())) delete request.headers![name]
      // Referer carries the previous page's URL, query string included.
      else request.headers![name] = stripUrlTails(value)
    }
  }

  // Only the id is worth keeping; email, username and IP stay out.
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined

  if (event.transaction) event.transaction = stripUrlTails(event.transaction)
  if (event.message) event.message = cleanMessage(event.message)
  if (event.logentry?.message) event.logentry.message = cleanMessage(event.logentry.message)
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = cleanMessage(exception.value)
  }

  // The console integration attaches every console.error/warn call's raw arguments here, and
  // some of those calls log whole objects (the payment callback body, the booking form).
  if (event.extra) delete event.extra.arguments

  const trace = event.contexts?.trace
  scrubData(trace?.data)
  if (typeof trace?.description === "string") trace.description = stripUrlTails(trace.description)
  for (const span of event.spans ?? []) {
    scrubData(span.data)
    if (span.description) span.description = stripUrlTails(span.description)
  }
  return event
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null
  if (breadcrumb.message) breadcrumb.message = stripUrlTails(breadcrumb.message)
  scrubData(breadcrumb.data)
  return breadcrumb
}

export const sentryBaseOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Performance tracing is off on purpose: it added ~25 kB to every page load (measured) and would
  // use most of the plan's quota. To turn it on, set tracesSampleRate here and drop removeTracing in
  // next.config.mjs; beforeSendTransaction below already scrubs the URLs traces record.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
}
