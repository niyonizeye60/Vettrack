import { IntouchPayClient } from "@d-merci/intouchpay-client"

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

/**
 * Public base for the gateway callback. The IntouchPay gateway validates the
 * callbackurl server-side and refuses private/localhost addresses ("SSRF
 * blocklist"), so in local development — where NEXT_PUBLIC_BASE_URL is
 * http://localhost:3000 — initiate would be rejected outright and no payment
 * prompt would ever be generated. Point INTOUCHPAY_CALLBACK_BASE_URL at any
 * public https URL (e.g. the deployed site or a tunnel) to satisfy the
 * gateway; payment confirmation itself still works locally because the app
 * re-verifies status with the gateway while polling.
 */
function getCallbackBaseUrl() {
  return process.env.INTOUCHPAY_CALLBACK_BASE_URL || getBaseUrl()
}

function getRawIntouchBaseUrl() {
  return process.env.INTOUCHPAY_BASE_URL || "https://www.intouchpay.co.rw/api/"
}

/**
 * The @d-merci/intouchpay-client hard-requires a base URL ending in "/api/"
 * (it appends bare "requestpayment/"-style paths to it), but the
 * developer-portal sandbox lives at ".../api/v1/sandbox/". We hand the SDK a
 * compliant prefix and transparently rewrite outgoing URLs back to the
 * configured base. For already-compliant bases this is a no-op.
 */
function resolveSdkBaseUrl(raw: string) {
  const match = raw.match(/^(https?:\/\/[^/]*\/api\/)/)
  return match ? match[1] : raw
}

function rewriteOutgoingUrl(url: string, rawBase: string, sdkBase: string) {
  if (sdkBase === rawBase) return url
  return url.startsWith(sdkBase) ? rawBase + url.slice(sdkBase.length) : url
}

function getEnvConfig() {
  return {
    username: process.env.INTOUCHPAY_USERNAME || "",
    accountNumber: process.env.INTOUCHPAY_ACCOUNT || "",
    partnerPassword: process.env.INTOUCHPAY_PARTNER_PASSWORD || "",
  }
}

function getClient() {
  const env = getEnvConfig()
  const rawBase = getRawIntouchBaseUrl()
  const sdkBase = resolveSdkBaseUrl(rawBase)
  return new IntouchPayClient({
    username: env.username,
    accountNumber: env.accountNumber,
    partnerPassword: env.partnerPassword,
    disableDepositEndpoint: process.env.INTOUCHPAY_DISABLE_DEPOSIT_ENDPOINT === "false" ? false : true,
    baseUrl: sdkBase,
    fetchImpl: async (input: string | URL | Request, options?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      return fetch(rewriteOutgoingUrl(url, rawBase, sdkBase), options)
    },
  })
}

export async function initiateIntouchPayment(amount: number, mobilePhone: string) {
  const callbackUrl = `${getCallbackBaseUrl()}/api/payments/intouchpay/callback`

  if (process.env.INTOUCHPAY_DEBUG === "true") {
    console.log("\n========== INTOUCHPAY DEBUG ==========")
    console.log("Callback URL in payload:", callbackUrl)
    console.log("======================================\n")
  }

  const client = getClient()
  return client.requestPayment({
    amount,
    mobilePhone,
    callbackUrl,
  })
}

export async function checkIntouchPayStatus(requestTransactionId: string) {
  const client = getClient()
  return client.checkPaymentStatus({ requestTransactionId })
}

export async function parseIntouchWebhook(body: unknown) {
  const client = getClient()
  return client.parseWebhook(body as Parameters<typeof client.parseWebhook>[0])
}

export async function requestIntouchDeposit(
  amount: number,
  mobilePhone: string,
  reason?: string,
) {
  const client = getClient()
  return client.requestDeposit({
    amount,
    mobilePhone,
    reason: reason ?? "Deposit request",
  })
}

/**
 * Query the IntouchPay account balance.
 * Calls the GetBalance API directly (the client library doesn't support it).
 */
export async function getIntouchBalance(): Promise<{ balance: number; success: boolean; message?: string }> {
  const env = getEnvConfig()
  const baseUrl = process.env.INTOUCHPAY_BASE_URL || "https://www.intouchpay.co.rw/api/"
  const normalizeUrl = (url: string) => (url.endsWith("/") ? url : url + "/")
  const apiBase = normalizeUrl(baseUrl)

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)
  const passwordRaw = env.username + env.accountNumber + env.partnerPassword + timestamp
  const password = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passwordRaw))
    )
  ).map(b => b.toString(16).padStart(2, "0")).join("")

  const data = new URLSearchParams()
  data.append("username", env.username)
  data.append("timestamp", timestamp)
  data.append("accountno", env.accountNumber)
  data.append("password", password)

  try {
    const response = await fetch(`${apiBase}getbalance/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data.toString(),
      signal: AbortSignal.timeout(15000),
    })

    const result = await response.json()

    if (!result.success) {
      return { balance: 0, success: false, message: result.message || "Balance check failed" }
    }

    return {
      balance: parseFloat(result.balance) || 0,
      success: true,
    }
  } catch (error: any) {
    return { balance: 0, success: false, message: error.message || "Network error" }
  }
}
