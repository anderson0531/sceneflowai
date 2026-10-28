import Whop from '@whop/sdk'
import { WHOP_COMPANY_ID } from './tierCatalog'

let client: Whop | null = null
let runtimeConfigLoaded = false

function sanitizeEnvValue(val: string | undefined): string {
  return (val || '').replace(/\\n/g, '').trim()
}

/**
 * Hydrates Whop runtime configuration from `platform_runtime_config` in Postgres
 * when `WHOP_API_KEY` is not present in the serverless environment.
 */
export async function ensureWhopRuntimeConfig(): Promise<void> {
  if (sanitizeEnvValue(process.env.WHOP_API_KEY)) {
    if (!sanitizeEnvValue(process.env.WHOP_COMPANY_ID)) {
      process.env.WHOP_COMPANY_ID = WHOP_COMPANY_ID
    }
    return
  }

  if (runtimeConfigLoaded || process.env.NODE_ENV === 'test') {
    return
  }

  try {
    const { sequelize } = await import('@/config/database')
    const [rows] = (await sequelize.query(
      `SELECT key, value FROM platform_runtime_config WHERE key IN ('WHOP_API_KEY', 'WHOP_COMPANY_ID', 'WHOP_WEBHOOK_SECRET', 'PAYMENT_PROVIDER', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL')`
    )) as [Array<{ key: string; value: string }>, unknown]

    for (const row of rows || []) {
      const cleaned = sanitizeEnvValue(row.value)
      if (cleaned && !sanitizeEnvValue(process.env[row.key])) {
        process.env[row.key] = cleaned
      }
    }
    if (!sanitizeEnvValue(process.env.WHOP_COMPANY_ID)) {
      process.env.WHOP_COMPANY_ID = WHOP_COMPANY_ID
    }
    runtimeConfigLoaded = true
  } catch (error) {
    console.warn('[WhopClient] Could not load runtime config from database:', error)
  }
}

export function getWhopClient(): Whop {
  const apiKey = sanitizeEnvValue(process.env.WHOP_API_KEY)
  if (!apiKey) {
    throw new Error('WHOP_API_KEY is not configured')
  }

  if (client) return client

  const webhookKey = sanitizeEnvValue(process.env.WHOP_WEBHOOK_SECRET) || null

  client = new Whop({
    apiKey,
    webhookKey,
  })

  return client
}

export function getWhopCompanyId(): string {
  return sanitizeEnvValue(process.env.WHOP_COMPANY_ID) || WHOP_COMPANY_ID
}
