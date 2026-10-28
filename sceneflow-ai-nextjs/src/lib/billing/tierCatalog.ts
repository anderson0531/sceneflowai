/**
 * Single source of truth for SceneFlow billing tiers and Whop plan mapping.
 */

import {
  EXPLORER_CREDIT_FEATURE_COPY,
  EXPLORER_CREDIT_PACK_COPY,
  SUBSCRIPTION_CREDIT_EXPIRY_COPY,
} from '@/lib/credits/creditLots'

export type BillingTierName =
  | 'explorer'
  | 'hobbyist'
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
    displayName: 'Explorer — Start Your First Film',
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
      EXPLORER_CREDIT_FEATURE_COPY,
      '5 GB trial storage (30 days)',
      '1080p max resolution',
      'Full platform access',
      'Production Script export (PDF, FDX, Fountain)',
    ],
    marketingDescription:
      'Turn your idea into a structured Blueprint, cast your characters, and preview your first voiced scene—then subscribe and add credits as you finish your film.',
    marketingFeatures: [
      'One-time purchase (30-day Studio Test Flight)',
      EXPLORER_CREDIT_PACK_COPY,
      '5 GB trial storage (30 days — subscribe to retain vault)',
      'Full studio access + Production Script export (PDF, FDX, Fountain)',
      'MP4 export (any resolution)',
      'AI voiceover (70+ languages)',
    ],
    marketingLimitations: ['No recurring credits or Add-On pack access', '30-day asset retention unless subscribed'],
    whopProductSlug: 'sceneflow-explorer',
  },
  hobbyist: {
    name: 'hobbyist',
    displayName: 'Hobbyist — Storyteller & Vault',
    priceUsd: 19,
    credits: 1500,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_HOBBYIST',
    storageGb: 10,
    voiceCloneSlots: 0,
    maxProjects: 5,
    maxScenesPerProject: 15,
    collaborationSeats: 1,
    maxResolution: '1080p',
    aiModelAccess: 'standard',
    byokAccess: false,
    processingPriority: 'standard',
    features: [
      '1,500 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '10 GB Continuity Vault storage',
      '1080p max resolution',
      'Active membership unlocks 12-month Add-On credit packs',
      'Production Script export (PDF, FDX, Fountain)',
      'Email support',
    ],
    marketingDescription:
      'Storytellers & Creative Visionaries — express your vision with zero technical filmmaking skills required, and keep your Continuity Vault active between shoots',
    marketingFeatures: [
      'Active Studio Membership & Continuity Vault retention',
      '1,500 credits/month included',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '10 GB Active Continuity Vault (retains cast, wardrobes & sets)',
      'Unlocks 12-month Subscriber Add-On credit packs',
      'Ideal for personal visions, family stories & Pre-Vis animatics',
      'Production Script preview & export (PDF, FDX, Fountain)',
      'MP4 export & AI voiceover (70+ languages)',
    ],
    marketingLimitations: ['1 creator seat', 'Standard 1080p queue'],
    whopProductSlug: 'sceneflow-hobbyist',
  },
  starter: {
    name: 'starter',
    displayName: 'Starter — Chapter & Pre-Vis',
    priceUsd: 49,
    credits: 4500,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STARTER',
    storageGb: 25,
    voiceCloneSlots: 1,
    maxProjects: 15,
    maxScenesPerProject: 30,
    collaborationSeats: 1,
    maxResolution: '1080p',
    aiModelAccess: 'standard',
    byokAccess: false,
    processingPriority: 'standard',
    features: [
      '4,500 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '25 GB Continuity Vault storage',
      '1080p max resolution',
      'Veo 3.1 Fast & Kling access',
      '1 custom voice clone',
      'Live-action video clip upload & hybrid mixing',
      'Priority email support',
    ],
    marketingDescription:
      'The Publish Chapter Strategy — for 5–15 min episodic chapter releases and traditional filmmakers building Production Funding Packages',
    marketingFeatures: [
      'Everything in Hobbyist, plus:',
      '4,500 credits/month included (3x Hobbyist compute)',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '25 GB Active Continuity Vault for character & setting continuity',
      'Built for 5–15 min chapter releases & Pre-Vis funding packages',
      'Upload live-action scenes & combine with AI clips in Mixer',
      '1 custom voice clone & 70+ language dubbing',
      'Email support',
    ],
    marketingLimitations: ['1 creator seat'],
    whopProductSlug: 'sceneflow-starter',
  },
  pro: {
    name: 'pro',
    displayName: 'Pro — Series & Hybrid',
    priceUsd: 149,
    credits: 15000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_PRO',
    storageGb: 100,
    voiceCloneSlots: 5,
    maxProjects: 50,
    maxScenesPerProject: 60,
    collaborationSeats: 3,
    maxResolution: '4K',
    aiModelAccess: 'premium',
    byokAccess: true,
    processingPriority: 'priority',
    features: [
      '15,000 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '100 GB Continuity Vault storage',
      '4K max resolution (Veo 3.1 Quality)',
      '5 custom voice clones',
      'BYOK support (Vertex AI & Kling)',
      'Hybrid live-action + AI production workflow',
      'Priority processing',
      '3 collaboration seats',
      'Priority support',
    ],
    marketingDescription:
      'Monetized Series & Hybrid Filmmaker — for social channels with recurring characters and experienced filmmakers blending live-action with 4K AI production',
    marketingFeatures: [
      'Everything in Starter, plus:',
      '15,000 credits/month included',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '100 GB Active Continuity Vault + Character Consistency Engine',
      'Veo 3.1 Quality (4K) access & hybrid live-action + AI workflow',
      '5 custom voice clones for recurring series cast',
      'BYOK (Bring Your Own Key) for direct provider billing',
      '3 team seats & Priority support',
    ],
    marketingLimitations: [],
    whopProductSlug: 'sceneflow-pro',
    popular: true,
  },
  studio: {
    name: 'studio',
    displayName: 'Studio — Production House',
    priceUsd: 599,
    credits: 75000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STUDIO',
    storageGb: 500,
    voiceCloneSlots: 25,
    maxProjects: 200,
    maxScenesPerProject: 200,
    collaborationSeats: 10,
    maxResolution: '4K+',
    aiModelAccess: 'premium_beta',
    byokAccess: true,
    processingPriority: 'high',
    features: [
      '75,000 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '500 GB Continuity Vault storage',
      '4K+ max resolution (Veo 3.1 4K Priority Queue)',
      'Premium + Beta AI models',
      '25 custom voice clones',
      'BYOK support & API access',
      'High priority processing',
      '10 collaboration seats',
      'Dedicated account manager',
    ],
    marketingDescription:
      'Production House & Feature Slate — a $500–$5,000 full-production pipeline for experienced filmmakers, agencies, and multi-series studios',
    marketingFeatures: [
      'Everything in Pro, plus:',
      '75,000 credits/month included (lowest per-credit rate)',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '500 GB Active Continuity Vault + Unlimited Character Consistency',
      'Veo 3.1 4K Priority Queue & 25 custom voice clones',
      'White-label Screening Room & exports + API & BYOK access',
      '10 team seats & Dedicated account manager',
      'Enterprise SLA available on request',
    ],
    marketingLimitations: [],
    whopProductSlug: 'sceneflow-ai-studio',
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
  'hobbyist',
  'starter',
  'pro',
  'studio',
  'enterprise',
]

export const CHECKOUT_TIER_NAMES: BillingTierName[] = [
  'explorer',
  'hobbyist',
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
    'hobbyist',
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

/**
 * Default live Whop plan IDs for SceneFlow AI Studio (biz_6WdfJpp97rWaLl).
 * Environment variables take precedence when set.
 */
export const DEFAULT_WHOP_PLAN_IDS: Partial<Record<BillingTierName, string>> = {
  explorer: 'plan_7LOYto3DUb7cF',
  hobbyist: 'plan_vO77CPr7sbWwC',
  starter: 'plan_CzGM3h0uz0Jor',
  pro: 'plan_veKGLrFRtGhpS',
  studio: 'plan_iuUQ4PBH2Lapz',
}

export type AddonPackId = 'addon_25' | 'addon_100' | 'addon_250'

export interface AddonPackDefinition {
  id: AddonPackId
  displayName: string
  priceUsd: number
  credits: number
  bonusLabel?: string
  whopPlanEnvKey: string
  defaultWhopPlanId: string
  description: string
}

export const ADDON_PACK_CATALOG: Record<AddonPackId, AddonPackDefinition> = {
  addon_25: {
    id: 'addon_25',
    displayName: '$25 Add-On Pack (2,000 Credits)',
    priceUsd: 25,
    credits: 2000,
    whopPlanEnvKey: 'WHOP_PLAN_ADDON_25',
    defaultWhopPlanId: 'plan_ammNF5J1Gj4Kp',
    description: '2,000 credits ($0.0125/cr) — ideal for finishing a 5–15 min chapter or Promo Trailer.',
  },
  addon_100: {
    id: 'addon_100',
    displayName: '$100 Add-On Pack (9,000 Credits)',
    priceUsd: 100,
    credits: 9000,
    bonusLabel: '+12.5% Bonus',
    whopPlanEnvKey: 'WHOP_PLAN_ADDON_100',
    defaultWhopPlanId: 'plan_gXQOT2JSqDaxX',
    description: '9,000 credits ($0.0111/cr) — ideal for multi-chapter series bursts or Pre-Vis pitch packages.',
  },
  addon_250: {
    id: 'addon_250',
    displayName: '$250 Add-On Pack (25,000 Credits)',
    priceUsd: 250,
    credits: 25000,
    bonusLabel: '+25% Bonus',
    whopPlanEnvKey: 'WHOP_PLAN_ADDON_250',
    defaultWhopPlanId: 'plan_SZVOqaDy0G0XT',
    description: '25,000 credits ($0.0100/cr) — built for $500–$5,000 hybrid productions and feature slates.',
  },
}

export function normalizeAddonPackId(packId: string): AddonPackId | null {
  const normalized = packId.trim().toLowerCase()
  if (normalized in ADDON_PACK_CATALOG) return normalized as AddonPackId
  if (normalized === '25' || normalized === '$25') return 'addon_25'
  if (normalized === '100' || normalized === '$100') return 'addon_100'
  if (normalized === '250' || normalized === '$250') return 'addon_250'
  return null
}

export function getWhopAddonPlanId(packId: string): string | undefined {
  const normalized = normalizeAddonPackId(packId)
  if (!normalized) return undefined
  const pack = ADDON_PACK_CATALOG[normalized]
  const envVal = (process.env[pack.whopPlanEnvKey] || '').replace(/\\n/g, '').trim()
  return envVal || pack.defaultWhopPlanId
}

export function getAddonPackFromWhopPlanId(planId: string): AddonPackDefinition | null {
  for (const pack of Object.values(ADDON_PACK_CATALOG)) {
    const envPlanId = (process.env[pack.whopPlanEnvKey] || '').replace(/\\n/g, '').trim()
    if ((envPlanId && envPlanId === planId) || pack.defaultWhopPlanId === planId) {
      return pack
    }
  }
  return null
}

export function getWhopPlanId(tierName: string): string | undefined {
  const tier = normalizeTierName(tierName)
  if (!tier) return undefined
  const envKey = TIER_CATALOG[tier].whopPlanEnvKey
  const envVal = (process.env[envKey] || '').replace(/\\n/g, '').trim()
  return envVal || DEFAULT_WHOP_PLAN_IDS[tier] || undefined
}

export function getTierNameFromWhopPlanId(planId: string): BillingTierName | null {
  for (const tier of Object.values(TIER_CATALOG)) {
    const envPlanId = (process.env[tier.whopPlanEnvKey] || '').replace(/\\n/g, '').trim()
    if ((envPlanId && envPlanId === planId) || DEFAULT_WHOP_PLAN_IDS[tier.name] === planId) {
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
  const isProd =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const defaultAppUrl = isProd ? 'https://www.sceneflowai.studio' : 'http://localhost:3000'
  const rawReturnUrl = (process.env.WHOP_CHECKOUT_RETURN_URL || '').replace(/\\n/g, '').trim()
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\\n/g, '').trim()

  const validReturnUrl =
    rawReturnUrl && !(isProd && rawReturnUrl.startsWith('http://localhost'))
      ? rawReturnUrl
      : ''
  const validAppUrl =
    rawAppUrl && !(isProd && rawAppUrl.startsWith('http://localhost'))
      ? rawAppUrl
      : defaultAppUrl

  const base = validReturnUrl || `${validAppUrl}/dashboard/settings/billing`
  const separator = base.includes('?') ? '&' : '?'
  const checkoutParam = status === 'cancel' ? 'error' : status
  return `${base}${separator}checkout=${checkoutParam}`
}

export function isWhopPaymentEnabled(): boolean {
  const provider = (process.env.PAYMENT_PROVIDER || 'whop').replace(/\\n/g, '').trim() || 'whop'
  return provider === 'whop'
}

export function hasPurchasedExplorer(purchased: string[] | undefined | null): boolean {
  if (!purchased?.length) return false
  return purchased.includes('explorer') || purchased.includes('trial')
}
