import { createClientFromEnv } from "@d-merci/intouchpay-client"

function getClient() {
  return createClientFromEnv()
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
}

export async function initiateIntouchPayment(amount: number, mobilePhone: string) {
  const client = getClient()
  return client.requestPayment({
    amount,
    mobilePhone,
    callbackUrl: `${getBaseUrl()}/api/payments/intouchpay/callback`,
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
