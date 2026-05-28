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
  storageGb: number
  voiceCloneSlots: number
  maxProjects: number
  maxScenesPerProject: number
  collaborationSeats: number
  maxResolution: '1080p' | '4K' | '4K+'
  aiModelAccess: 'standard' | 'premium' | 'premium_beta'
  byokAccess: boolean
  processingPriority: 'standard' | 'priority' | 'high'
  features: string[]
  marketingDescription: string
  marketingFeatures: string[]
  marketingLimitations?: string[]
  whopProductSlug?: string
  popular?: boolean
}

export const TIER_CATALOG: Record<BillingTierName, TierDefinition> = {
  explorer: {
    name: 'explorer',
    displayName: 'Explorer',
    priceUsd: 9,
    credits: 750,
    isOneTime: true,
    whopPlanEnvKey: 'WHOP_PLAN_EXPLORER',
    storageGb: 5,
    voiceCloneSlots: 0,
    maxProjects: 3,
    maxScenesPerProject: 20,
    collaborationSeats: 0,
    maxResolution: '1080p',
    aiModelAccess: 'standard',
    byokAccess: false,
    processingPriority: 'standard',
    features: [
      '750 credits (one-time)',
      'Credits never expire',
      '5 GB storage',
      '1080p max resolution',
      'Full platform access',
      'Email support',
    ],
    marketingDescription: 'One-time purchase to try it out',
    marketingFeatures: [
      'One-time purchase',
      '750 credits (never expire)',
      '5 GB storage (30 days)',
      'Full platform access',
      'MP4 export (any resolution)',
      'AI voiceover (70+ languages)',
    ],
    marketingLimitations: ['No recurring credits', 'Community support only'],
    whopProductSlug: 'sceneflow-explorer',
  },
  starter: {
    name: 'starter',
    displayName: 'Starter',
    priceUsd: 49,
    credits: 4500,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STARTER',
    storageGb: 25,
    voiceCloneSlots: 1,
    maxProjects: 5,
    maxScenesPerProject: 15,
    collaborationSeats: 2,
    maxResolution: '1080p',
    aiModelAccess: 'standard',
    byokAccess: false,
    processingPriority: 'standard',
    features: [
      '4,500 credits/month',
      '25 GB storage',
      '1080p max resolution',
      'Veo 3.1 Fast',
      '1 voice clone',
      'Priority email support',
    ],
    marketingDescription: 'For individual creators',
    marketingFeatures: [
      'Full platform access',
      '4,500 credits/month included',
      '25 GB active storage',
      'MP4 export (any resolution)',
      'AI voiceover (70+ languages)',
      'Email support',
    ],
    marketingLimitations: ['1 team seat', 'Community support only'],
    whopProductSlug: 'sceneflow-starter',
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    priceUsd: 149,
    credits: 15000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_PRO',
    storageGb: 100,
    voiceCloneSlots: 5,
    maxProjects: 20,
    maxScenesPerProject: 50,
    collaborationSeats: 10,
    maxResolution: '4K',
    aiModelAccess: 'premium',
    byokAccess: true,
    processingPriority: 'priority',
    features: [
      '15,000 credits/month',
      '100 GB storage',
      '4K max resolution (Veo 3.1 Quality)',
      '5 voice clones',
      'BYOK support',
      'Priority processing',
      '10 collaboration seats',
      'Priority support',
    ],
    marketingDescription: 'For professional creators',
    marketingFeatures: [
      'Everything in Starter, plus:',
      '15,000 credits/month included',
      '100 GB active storage',
      'Veo 3.1 Quality (4K) access',
      'Character Consistency Engine',
      'Voice cloning',
      'BYOK (Bring Your Own Key)',
      '3 team seats',
      'Priority support',
    ],
    marketingLimitations: [],
    whopProductSlug: 'pro-59-a0e5',
    popular: true,
  },
  studio: {
    name: 'studio',
    displayName: 'Studio',
    priceUsd: 599,
    credits: 75000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STUDIO',
    storageGb: 500,
    voiceCloneSlots: 25,
    maxProjects: 100,
    maxScenesPerProject: 200,
    collaborationSeats: 50,
    maxResolution: '4K+',
    aiModelAccess: 'premium_beta',
    byokAccess: true,
    processingPriority: 'high',
    features: [
      '75,000 credits/month',
      '500 GB storage',
      '4K+ max resolution',
      'Premium + Beta AI models',
      '25 voice clones',
      'BYOK support',
      'High priority processing',
      '50 collaboration seats',
      'Dedicated support',
    ],
    marketingDescription: 'For teams & agencies',
    marketingFeatures: [
      'Everything in Pro, plus:',
      '75,000 credits/month included',
      '500 GB active storage',
      'Veo 3.1 4K Priority Queue',
      'Unlimited Character Consistency',
      'White-label exports',
      'API access',
      '10 team seats',
      'Dedicated account manager',
      'Enterprise SLA available on request',
    ],
    marketingLimitations: [],
    whopProductSlug: 'studio-c6',
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceUsd: 0,
    credits: 200000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_ENTERPRISE',
    storageGb: 2000,
    voiceCloneSlots: 100,
    maxProjects: 999,
    maxScenesPerProject: 999,
    collaborationSeats: 999,
    maxResolution: '4K+',
    aiModelAccess: 'premium_beta',
    byokAccess: true,
    processingPriority: 'high',
    features: [
      'Custom credit allocation',
      'Dedicated infrastructure',
      'Custom SLA',
      'Dedicated account manager',
    ],
    marketingDescription: 'Custom solutions for large organizations',
    marketingFeatures: ['Custom pricing', 'Dedicated support', 'Custom SLA'],
    marketingLimitations: [],
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

export interface CheckoutPlanDisplay {
  name: BillingTierName
  displayName: string
  price: number
  credits: number
  isOneTime: boolean
  storageGb: number
}

export function getCheckoutPlans(): CheckoutPlanDisplay[] {
  return CHECKOUT_TIER_NAMES.map((name) => {
    const tier = TIER_CATALOG[name]
    return {
      name: tier.name,
      displayName: tier.displayName,
      price: tier.priceUsd,
      credits: tier.credits,
      isOneTime: tier.isOneTime,
      storageGb: tier.storageGb,
    }
  })
}

export interface LandingPlanDisplay {
  id: BillingTierName
  name: string
  price: number
  includedCredits: number
  storage: string
  description: string
  isOneTime?: boolean
  popular?: boolean
  features: string[]
  limitations: string[]
}

export function getLandingPlans(): { explorer: LandingPlanDisplay; subscriptions: LandingPlanDisplay[] } {
  const explorer = TIER_CATALOG.explorer
  const subscriptions = CHECKOUT_TIER_NAMES.filter((n) => n !== 'explorer').map((name) => {
    const tier = TIER_CATALOG[name]
    return {
      id: tier.name,
      name: tier.displayName,
      price: tier.priceUsd,
      includedCredits: tier.credits,
      storage: `${tier.storageGb} GB`,
      description: tier.marketingDescription,
      popular: tier.popular,
      features: tier.marketingFeatures,
      limitations: tier.marketingLimitations || [],
    }
  })

  return {
    explorer: {
      id: explorer.name,
      name: explorer.displayName,
      price: explorer.priceUsd,
      includedCredits: explorer.credits,
      storage: `${explorer.storageGb} GB`,
      description: explorer.marketingDescription,
      isOneTime: true,
      features: explorer.marketingFeatures,
      limitations: explorer.marketingLimitations || [],
    },
    subscriptions,
  }
}

/** Seed data shape for subscription_tiers table */
export function getSubscriptionTierSeedRows() {
  const tierNames: BillingTierName[] = [
    'explorer',
    'starter',
    'pro',
    'studio',
    'enterprise',
  ]

  return tierNames.map((name) => {
    const tier = TIER_CATALOG[name]
    const annualMultiplier = name === 'explorer' ? 1 : 0.96
    return {
      name: tier.name,
      display_name: tier.displayName,
      monthly_price_usd: tier.priceUsd,
      annual_price_usd: tier.isOneTime ? tier.priceUsd : Math.round(tier.priceUsd * 12 * annualMultiplier),
      included_credits_monthly: tier.credits,
      storage_gb: tier.storageGb,
      max_resolution: tier.maxResolution,
      ai_model_access: tier.aiModelAccess,
      byok_access: tier.byokAccess,
      processing_priority: tier.processingPriority,
      collaboration_seats: tier.collaborationSeats,
      is_active: true,
      is_one_time: tier.isOneTime,
      max_projects: tier.maxProjects,
      max_scenes_per_project: tier.maxScenesPerProject,
      features: tier.features,
    }
  })
}

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
  const checkoutParam = status === 'cancel' ? 'error' : status
  return `${base}${separator}checkout=${checkoutParam}`
}

export function isWhopPaymentEnabled(): boolean {
  return (process.env.PAYMENT_PROVIDER || 'whop') === 'whop'
}

export function hasPurchasedExplorer(purchased: string[] | undefined | null): boolean {
  if (!purchased?.length) return false
  return purchased.includes('explorer') || purchased.includes('trial')
}
