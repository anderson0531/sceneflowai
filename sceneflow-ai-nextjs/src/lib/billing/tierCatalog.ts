/**
 * Single source of truth for SceneFlow billing tiers and Whop plan mapping.
 */

export type BillingTierName =
  | 'explorer'
  | 'starter'
  | 'pro'
  | 'studio'
  | 'enterprise'

/** Legacy alias — maps to explorer */
export type LegacyTierName = 'trial'

export type TierName = BillingTierName | LegacyTierName

export interface TierDefinition {
  name: BillingTierName
  displayName: string
  priceUsd: number
  credits: number
  isOneTime: boolean
  whopPlanEnvKey: string
}

export const TIER_CATALOG: Record<BillingTierName, TierDefinition> = {
  explorer: {
    name: 'explorer',
    displayName: 'Explorer',
    priceUsd: 9,
    credits: 750,
    isOneTime: true,
    whopPlanEnvKey: 'WHOP_PLAN_EXPLORER',
  },
  starter: {
    name: 'starter',
    displayName: 'Starter',
    priceUsd: 49,
    credits: 4500,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STARTER',
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    priceUsd: 149,
    credits: 15000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_PRO',
  },
  studio: {
    name: 'studio',
    displayName: 'Studio',
    priceUsd: 599,
    credits: 75000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STUDIO',
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceUsd: 0,
    credits: 200000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_ENTERPRISE',
  },
}

export const SUBSCRIPTION_TIER_NAMES: BillingTierName[] = [
  'starter',
  'pro',
  'studio',
  'enterprise',
]

export const CHECKOUT_TIER_NAMES: BillingTierName[] = [
  'explorer',
  'starter',
  'pro',
  'studio',
]

/** Normalize legacy tier names to current catalog names */
export function normalizeTierName(tierName: string): BillingTierName | null {
  const normalized = tierName.toLowerCase()
  if (normalized === 'trial') return 'explorer'
  if (normalized in TIER_CATALOG) return normalized as BillingTierName
  return null
}

export function getTierCredits(tierName: string): number {
  const tier = normalizeTierName(tierName)
  if (!tier) return 0
  return TIER_CATALOG[tier].credits
}

export function getWhopPlanId(tierName: string): string | undefined {
  const tier = normalizeTierName(tierName)
  if (!tier) return undefined
  const envKey = TIER_CATALOG[tier].whopPlanEnvKey
  return process.env[envKey] || undefined
}

export function getTierNameFromWhopPlanId(planId: string): BillingTierName | null {
  for (const tier of Object.values(TIER_CATALOG)) {
    const envPlanId = process.env[tier.whopPlanEnvKey]
    if (envPlanId && envPlanId === planId) {
      return tier.name
    }
  }
  return null
}

export function isOneTimeTier(tierName: string): boolean {
  const tier = normalizeTierName(tierName)
  if (!tier) return false
  return TIER_CATALOG[tier].isOneTime
}

export function getCheckoutReturnUrl(status: 'success' | 'cancel' = 'success'): string {
  const base =
    process.env.WHOP_CHECKOUT_RETURN_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}checkout=${status}`
}

export function isWhopPaymentEnabled(): boolean {
  return (process.env.PAYMENT_PROVIDER || 'whop') === 'whop'
}
