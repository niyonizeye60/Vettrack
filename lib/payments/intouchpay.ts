import { IntouchPayClient } from "@d-merci/intouchpay-client"

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
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
  return new IntouchPayClient({
    username: env.username,
    accountNumber: env.accountNumber,
    partnerPassword: env.partnerPassword,
    disableDepositEndpoint: process.env.INTOUCHPAY_DISABLE_DEPOSIT_ENDPOINT === "false" ? false : true,
    baseUrl: process.env.INTOUCHPAY_BASE_URL || "https://www.intouchpay.co.rw/api/",
  })
}

export async function initiateIntouchPayment(amount: number, mobilePhone: string) {
  const env = getEnvConfig()
  const callbackUrl = `${getBaseUrl()}/api/payments/intouchpay/callback`
  
  // Create client with a custom fetch that logs the actual payload
  const client = new IntouchPayClient({
    username: env.username,
    accountNumber: env.accountNumber,
    partnerPassword: env.partnerPassword,
    disableDepositEndpoint: process.env.INTOUCHPAY_DISABLE_DEPOSIT_ENDPOINT === "false" ? false : true,
    baseUrl: process.env.INTOUCHPAY_BASE_URL || "https://www.intouchpay.co.rw/api/",
    fetchImpl: async (url: string | URL | Request, options?: RequestInit) => {
      console.log("\n========== INTOUCHPAY DEBUG ==========")
      console.log("Method:", options?.method || "POST")
      console.log("URL:", url.toString())
      console.log("Body (raw):", options?.body?.toString() || "(empty)")
      console.log("Callback URL in payload:", callbackUrl)
      console.log("======================================\n")
      return fetch(url, options)
    },
  })
  
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
