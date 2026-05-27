import Whop from '@whop/sdk'

let client: Whop | null = null

export function getWhopClient(): Whop {
  if (client) return client

  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) {
    throw new Error('WHOP_API_KEY is not configured')
  }

  client = new Whop({
    apiKey,
    webhookKey: process.env.WHOP_WEBHOOK_SECRET || null,
  })

  return client
}

export function getWhopCompanyId(): string {
  const companyId = process.env.WHOP_COMPANY_ID
  if (!companyId) {
    throw new Error('WHOP_COMPANY_ID is not configured')
  }
  return companyId
}
