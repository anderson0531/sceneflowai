import type { AggregatorVendor } from './types'

export function getPrimaryAggregatorVendor(): AggregatorVendor {
  const v = (process.env.VIDEO_AGGREGATOR_VENDOR || 'renderful').trim().toLowerCase()
  if (v === 'pollo' || v === 'renderful' || v === 'glio' || v === 'reapi' || v === 'fal') {
    return v
  }
  return 'renderful'
}

export function getFailoverAggregatorVendor(): AggregatorVendor {
  const v = (process.env.VIDEO_AGGREGATOR_FAILOVER_VENDOR || 'pollo').trim().toLowerCase()
  if (v === 'pollo' || v === 'renderful' || v === 'glio' || v === 'reapi' || v === 'fal') {
    return v
  }
  return 'pollo'
}

export function getAggregatorApiKey(vendor?: AggregatorVendor): string | undefined {
  const primary = process.env.VIDEO_AGGREGATOR_API_KEY?.trim()
  const failover = process.env.VIDEO_AGGREGATOR_FAILOVER_API_KEY?.trim()
  if (!vendor || vendor === getPrimaryAggregatorVendor()) return primary
  return failover || primary
}

export function getAggregatorBaseUrl(vendor: AggregatorVendor): string {
  const envKey = `VIDEO_AGGREGATOR_${vendor.toUpperCase()}_BASE_URL`
  const fromEnv = process.env[envKey]?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  switch (vendor) {
    case 'renderful':
      return (process.env.VIDEO_AGGREGATOR_BASE_URL || 'https://api.renderful.ai/api/v1').replace(
        /\/$/,
        ''
      )
    case 'pollo':
      return 'https://pollo.ai/api/platform'
    default:
      return (process.env.VIDEO_AGGREGATOR_BASE_URL || '').replace(/\/$/, '')
  }
}

export function getAggregatorWebhookSecret(): string | undefined {
  return process.env.VIDEO_AGGREGATOR_WEBHOOK_SECRET?.trim()
}

export type AggregatorDisabledReason =
  | 'ok'
  | 'no_api_key'
  | 'explicitly_disabled'

export interface AggregatorDiagnostics {
  enabled: boolean
  disabledReason: AggregatorDisabledReason
  hasApiKey: boolean
  vendor: AggregatorVendor
  asyncEnabled: boolean
  vercelEnv?: string
}

export function getAggregatorDiagnostics(): AggregatorDiagnostics {
  const hasApiKey = !!process.env.VIDEO_AGGREGATOR_API_KEY?.trim()
  const explicitlyDisabled = process.env.VIDEO_AGGREGATOR_ENABLED === 'false'
  let disabledReason: AggregatorDisabledReason = 'ok'
  if (explicitlyDisabled) {
    disabledReason = 'explicitly_disabled'
  } else if (!hasApiKey) {
    disabledReason = 'no_api_key'
  }

  return {
    enabled: isAggregatorEnabled(),
    disabledReason,
    hasApiKey,
    vendor: getPrimaryAggregatorVendor(),
    asyncEnabled: isAggregatorAsyncEnabled(),
    vercelEnv: process.env.VERCEL_ENV,
  }
}

export function isAggregatorEnabled(): boolean {
  if (process.env.VIDEO_AGGREGATOR_ENABLED === 'false') return false
  return !!getAggregatorApiKey()
}

export function isAggregatorAsyncEnabled(): boolean {
  return process.env.VIDEO_AGGREGATOR_ASYNC === 'true' && isAggregatorEnabled()
}

export function getAggregatorPollIntervalMs(): number {
  const n = parseInt(process.env.VIDEO_AGGREGATOR_POLL_INTERVAL_MS || '5000', 10)
  return Number.isFinite(n) && n >= 2000 ? n : 5000
}

export function getAggregatorPollTimeoutSec(): number {
  const n = parseInt(process.env.VIDEO_AGGREGATOR_POLL_TIMEOUT_SEC || '280', 10)
  return Number.isFinite(n) && n >= 60 ? n : 280
}

export function getAggregatorWebhookBaseUrl(): string {
  const explicit = process.env.VIDEO_AGGREGATOR_WEBHOOK_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}
