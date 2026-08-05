import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("Missing required environment variable: MONGODB_URI")
}

const MONGODB_URI = process.env.MONGODB_URI;

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
}

// Cached on `global` in every environment, not just development. In dev this
// survives HMR module reloads; in production (Vercel serverless) it's what
// makes a warm function container reuse its existing MongoDB connection
// instead of re-running this module's top-level code and paying a fresh
// TLS+auth handshake to Atlas on every invocation that lands on that
// container. Skipping this in production (the previous behavior) meant cold
// - and often even warm - invocations could each open their own connection,
// which is exactly the multi-second, refresh-doesn't-help latency this was
// causing on the conversations list.
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

function connect(): Promise<MongoClient> {
  let client: MongoClient
  try {
    client = new MongoClient(MONGODB_URI, options)
  } catch (error) {
    // A malformed URI throws synchronously out of the constructor, before any
    // network work happens.
    console.error("MongoDB client construction failed:", error)
    return Promise.reject(error)
  }

  return client.connect().catch((error) => {
    console.error("MongoDB connection error:", error)
    // A client whose handshake failed can still be holding a socket and its
    // topology monitoring timers. Close it so a retry starts clean rather than
    // leaking one half-open client per failed attempt.
    void client.close().catch(() => {})
    throw error
  })
}

// A *rejected* connection must never stay in the cache. It used to: one
// dropped TLS handshake at container start left a rejected promise on `global`,
// and every later `await clientPromise` on that container re-awaited the same
// rejection and failed instantly - so a single transient blip kept breaking
// logins until the container recycled, which is how a 10s connect timeout
// surfaced as a 438s one. Evicting on rejection lets the next caller dial
// again. While a connect is still in flight the pending promise stays cached,
// so concurrent callers share one dial instead of stampeding Atlas.
export function getMongoClient(): Promise<MongoClient> {
  const cached = globalWithMongo._mongoClientPromise
  if (cached) return cached

  const promise = connect()
  globalWithMongo._mongoClientPromise = promise
  promise.catch(() => {
    if (globalWithMongo._mongoClientPromise === promise) {
      globalWithMongo._mongoClientPromise = undefined
    }
  })
  return promise
}

// Every caller does `const client = await clientPromise`, so the default export
// stays awaitable - but it has to resolve *lazily*. Exporting a plain promise
// object would freeze whichever attempt happened first (including a failed one)
// into the module binding forever, defeating the eviction above. This thenable
// re-enters getMongoClient() on each await, so it hands back the live cached
// connection when there is one and dials again when there isn't.
const clientPromise: Promise<MongoClient> = {
  then<TResult1 = MongoClient, TResult2 = never>(
    onFulfilled?: ((value: MongoClient) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return getMongoClient().then(onFulfilled, onRejected)
  },
  catch<TResult = never>(
    onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<MongoClient | TResult> {
    return getMongoClient().catch(onRejected)
  },
  finally(onFinally?: (() => void) | null): Promise<MongoClient> {
    return getMongoClient().finally(onFinally)
  },
  [Symbol.toStringTag]: "Promise",
}

// Transient MongoDB errors - a connection pool cleared during an Atlas
// failover, a socket dropped on a cold serverless container, a brief DNS or
// network blip - can make a single read throw even though nothing is actually
// wrong. Every caller wraps its reads in try/catch and turns a throw into a
// fallback value; for the auth path that fallback is `null`, which the layout
// guards read as "logged out" (redirect to /login) and data loaders read as
// "no data" (empty table). Retrying the read a second time with a short backoff
// absorbs those blips so a healthy session isn't spuriously signed out. The
// driver's own retryReads only covers a subset of these, and never a pool that
// was momentarily unavailable - hence this app-level retry on top.
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)))
      }
    }
  }
  throw lastError
}

// Raw driver errors are meaningless to the people using this app - "Socket
// 'secureConnect' timed out after 438037ms (connectTimeoutMS: 10000)" tells a
// farmer on a phone nothing about what to do next, and echoing internals back
// on an unauthenticated route (login, registration, password reset) hands a
// free map of the deployment to anyone probing it. Callers still log the real
// error via console.error + logSystemError before calling this, so nothing is
// lost from the server-side record.
const CONNECTIVITY_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoServerSelectionError",
  "MongoTimeoutError",
  "MongoNotConnectedError",
])

const CONNECTIVITY_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EAI_AGAIN",
  "EPIPE",
])

// The driver reports the same class of failure under several names depending on
// where it gave up (TLS handshake, server selection, an in-flight socket), so
// the message is checked too rather than relying on the error type alone.
const CONNECTIVITY_MESSAGE_PATTERN =
  /timed out|timeout|socket|connection closed|connection refused|server selection|topology|getaddrinfo|network|not connected/i

export function isDbConnectivityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (CONNECTIVITY_ERROR_NAMES.has(error.name)) return true
  const code = (error as { code?: unknown }).code
  if (typeof code === "string" && CONNECTIVITY_ERROR_CODES.has(code)) return true
  return CONNECTIVITY_MESSAGE_PATTERN.test(error.message)
}

// Returns the message to show the user for a failed operation. Connectivity
// failures get the one piece of genuinely actionable advice available (wait and
// retry); everything else stays deliberately generic.
export function userFacingDbErrorMessage(error: unknown, action: string): string {
  if (isDbConnectivityError(error)) {
    return `We couldn't reach the server to ${action}. Please check your internet connection and try again in a moment.`
  }
  return `Something went wrong on our side and we couldn't ${action}. Please try again - if this keeps happening, contact support.`
}

// Add a function to test the connection
export async function testConnection() {
  try {
    const client = await clientPromise
    await client.db().command({ ping: 1 })
    console.log('Successfully connected to MongoDB')
    return true
  } catch (error) {
    console.error('MongoDB connection test failed:', error)
    return false
  }
}

export default clientPromise
