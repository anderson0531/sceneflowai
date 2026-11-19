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
    displayName: 'Creator & Vault',
    priceUsd: 29,
    credits: 2000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_HOBBYIST',
    storageGb: 25,
    voiceCloneSlots: 1,
    maxProjects: 10,
    maxScenesPerProject: 20,
    collaborationSeats: 1,
    maxResolution: '1080p',
    aiModelAccess: 'standard',
    byokAccess: false,
    processingPriority: 'standard',
    features: [
      '2,000 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '25 GB Continuity Vault storage (+$15/mo per extra 100 GB)',
      '1080p max resolution · 1 custom voice clone',
      'Active membership retains Continuity Vault & Screening Room links',
      'Unlocks $25 & $100 12-month Add-On credit packs',
      'Production Script export (PDF, FDX, Fountain)',
      'Email support',
    ],
    marketingDescription:
      'Solo Storytellers & Vault Hosting — express your vision with zero filmmaking skills required while keeping characters, voice clones, and Screening Room links hosted year-round',
    marketingFeatures: [
      'Active Studio Platform & Continuity Vault hosting',
      '2,000 credits/month included',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '25 GB Active Continuity Vault (retains cast, wardrobes & sets)',
      '1 custom voice clone & 70+ language AI dubbing',
      'Unlocks $25 & $100 12-month Subscriber Add-On packs',
      'Production Script export (PDF, FDX, Fountain) & MP4 export',
      'Expand Vault anytime (+$15/mo per 100 GB) or Pause-to-Vault ($19/mo)',
    ],
    marketingLimitations: ['1 creator seat', 'SceneFlow-branded Screening Room links'],
    whopProductSlug: 'sceneflow-hobbyist',
  },
  starter: {
    name: 'starter',
    displayName: 'Filmmaker & Pre-Vis',
    priceUsd: 59,
    credits: 4500,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STARTER',
    storageGb: 50,
    voiceCloneSlots: 2,
    maxProjects: 20,
    maxScenesPerProject: 35,
    collaborationSeats: 1,
    maxResolution: '1080p',
    aiModelAccess: 'standard',
    byokAccess: false,
    processingPriority: 'standard',
    features: [
      '4,500 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '50 GB Continuity Vault storage (+$15/mo per extra 100 GB)',
      '1080p max resolution',
      'Veo 3.1 Fast & Kling access',
      '2 custom voice clones',
      'Live-action video clip upload & hybrid mixing',
      'Priority email support',
    ],
    marketingDescription:
      'Chapter Releases, Podcasters & Investor Pre-Vis — publish 5–15 min episodes, intercut live studio clips, and ship pitch packages without upfront studio overhead',
    marketingFeatures: [
      'Everything in Creator & Vault, plus:',
      '4,500 credits/month included (2.25x Creator compute)',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '50 GB Active Continuity Vault for multi-chapter cast & set locks',
      'Upload live-action studio clips & mix with AI cinema scenes',
      'Built for 5–15 min episodic chapters & Pre-Vis funding packages',
      '2 custom voice clones & 70+ language stem-separated dubbing',
      'Priority email support',
    ],
    marketingLimitations: ['1 creator seat', 'Upgrade to Operator Pro for White-Label Client Portals'],
    whopProductSlug: 'sceneflow-starter',
  },
  pro: {
    name: 'pro',
    displayName: 'Operator Pro — White-Label Business',
    priceUsd: 149,
    credits: 10000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_PRO',
    storageGb: 150,
    voiceCloneSlots: 5,
    maxProjects: 50,
    maxScenesPerProject: 60,
    collaborationSeats: 3,
    maxResolution: '4K',
    aiModelAccess: 'premium',
    byokAccess: true,
    processingPriority: 'priority',
    features: [
      '10,000 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '150 GB Client & Continuity Vault storage (up to 25 active client portals)',
      '4K max resolution (Veo 3.1 Quality)',
      '100% White-Label Client Portals (Intake, Blueprint, Continuity & Screening Room)',
      'Mobile Companion PWA for zero-login client photo uploads & voice interviews',
      '5 custom voice clones · 3 team seats',
      'Unlocks $250 Bulk Add-On Pack ($0.0100/cr) + BYOK support',
      'Priority processing & support',
    ],
    marketingDescription:
      'Flagship White-Label Video Service Business — run a high-margin Life Memoir, Real Estate, or Corporate Training studio under your own brand with 150 GB client hosting & 4K AI production',
    marketingFeatures: [
      'Everything in Filmmaker & Pre-Vis, plus:',
      '10,000 credits/month included + $250 Bulk Pack rate ($0.010/cr)',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '150 GB Active Client & Continuity Vault (25 branded client portals)',
      '100% White-Label Intake, Blueprint Pass, Continuity & Screening Room',
      'Mobile Companion PWA + automatic EXIF GPS stripping & consent ledger',
      'Veo 3.1 Quality (4K), 5 custom voice clones & BYOK orchestration',
      '3 team seats (Kanban SLA, Client CRM, QA Reviewer) & Priority support',
    ],
    marketingLimitations: [],
    whopProductSlug: 'sceneflow-pro',
    popular: true,
  },
  studio: {
    name: 'studio',
    displayName: 'Agency Scale — Multi-PM Studio',
    priceUsd: 599,
    credits: 45000,
    isOneTime: false,
    whopPlanEnvKey: 'WHOP_PLAN_STUDIO',
    storageGb: 750,
    voiceCloneSlots: 25,
    maxProjects: 200,
    maxScenesPerProject: 200,
    collaborationSeats: 10,
    maxResolution: '4K+',
    aiModelAccess: 'premium_beta',
    byokAccess: true,
    processingPriority: 'high',
    features: [
      '45,000 credits/month',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '750 GB Client & Continuity Vault storage (unlimited client portals)',
      '4K+ max resolution (Veo 3.1 4K Priority Queue)',
      'Custom Domain White-Label Portals + PM RBAC & Monthly Credit Caps',
      '25 custom voice clones · 10 team seats',
      'BYOK support & API access',
      'High priority processing & Dedicated account manager',
    ],
    marketingDescription:
      'Multi-PM White-Label Agencies, Corporate L&D Teams & Feature Slates — custom domain branding, 10 PM seats with credit guardrails, 750 GB vault storage, and priority 4K scale',
    marketingFeatures: [
      'Everything in Operator Pro, plus:',
      '45,000 credits/month included + lowest bulk Add-On rates',
      SUBSCRIPTION_CREDIT_EXPIRY_COPY,
      '750 GB Active Client & Continuity Vault (unlimited client portals)',
      'Custom Domain portals + Multi-PM RBAC, Locale Auto-Routing & Client CRM Scorecard',
      'Veo 3.1 4K Priority Queue, 25 voice clones, Series Delegation & 1-Click Draft Purge',
      '10 team seats (Workspace Switcher & QA Reviewers) + Dedicated account manager',
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

export const ANNUAL_BILLING_MONTHS_CHARGED = 10 // 2 months free (~16.7% annual prepaid savings)
export const STORAGE_OVERAGE_USD_PER_100GB = 15 // Recurring high-margin Vault expansion
export const VAULT_HOSTING_PAUSE_USD_MONTHLY = 19 // Read-only Client Screening Room & Vault hosting during slow months

export interface LandingPlanDisplay {
  id: BillingTierName
  name: string
  price: number
  annualPrice?: number
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
      annualPrice: tier.priceUsd * ANNUAL_BILLING_MONTHS_CHARGED,
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
    return {
      name: tier.name,
      display_name: tier.displayName,
      monthly_price_usd: tier.priceUsd,
      annual_price_usd: tier.isOneTime ? tier.priceUsd : tier.priceUsd * ANNUAL_BILLING_MONTHS_CHARGED,
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
 * Default live Whop company and plan IDs for SceneFlow AI Studio (biz_6WdfJpp97rWaLl).
 * Environment variables take precedence when set.
 */
export const DEFAULT_WHOP_COMPANY_ID = 'biz_6WdfJpp97rWaLl'

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
  /** Optional tier restriction; omitted means available to all active monthly subscribers. */
  eligibleTiers?: readonly BillingTierName[]
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
    description: '9,000 credits ($0.0111/cr) — ideal for client film bursts, multi-chapter series, or Pre-Vis packages.',
  },
  addon_250: {
    id: 'addon_250',
    displayName: '$250 Operator Bulk Pack (25,000 Credits)',
    priceUsd: 250,
    credits: 25000,
    bonusLabel: '+25% Bonus · Pro & Agency',
    whopPlanEnvKey: 'WHOP_PLAN_ADDON_250',
    defaultWhopPlanId: 'plan_SZVOqaDy0G0XT',
    description: '25,000 credits ($0.0100/cr) — exclusive to Operator Pro & Agency Scale subscribers running high-volume client slates.',
    eligibleTiers: ['pro', 'studio', 'enterprise'],
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
      ? rawReturnUrl.replace(/^https:\/\/sceneflowai\.studio\b/, 'https://www.sceneflowai.studio')
      : ''
  const validAppUrl =
    rawAppUrl && !(isProd && rawAppUrl.startsWith('http://localhost'))
      ? rawAppUrl.replace(/^https:\/\/sceneflowai\.studio\b/, 'https://www.sceneflowai.studio')
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

export type CharterOfferId = 'founding_operator'

export interface CharterOfferDefinition {
  id: CharterOfferId
  displayName: string
  priceUsd: number
  credits: number
  durationDays: number
  grantsTier: BillingTierName
  renewalMonthlyUsd: number
  seatCap: number
  whopPlanEnvKey: string
  description: string
}

export const CHARTER_OFFER_CATALOG: Record<CharterOfferId, CharterOfferDefinition> = {
  founding_operator: {
    id: 'founding_operator',
    displayName: 'Founding Operator 90-Day Launchpad',
    priceUsd: 299,
    credits: 18000,
    durationDays: 90,
    grantsTier: 'pro',
    renewalMonthlyUsd: 119,
    seatCap: 25,
    whopPlanEnvKey: 'WHOP_PLAN_FOUNDING_OPERATOR',
    description:
      '90 days of Pro White-Label Studio access + 18,000 12-month production credits + all 4 Service-in-a-Box Playbooks (locks $119/mo post-charter Pro rate).',
  },
}

export function normalizeCharterOfferId(raw?: string | null): CharterOfferId | null {
  if (!raw) return null
  const clean = raw.trim().toLowerCase().replace(/-/g, '_')
  if (clean in CHARTER_OFFER_CATALOG) return clean as CharterOfferId
  if (clean === 'founding_operators' || clean === 'charter') return 'founding_operator'
  return null
}

export function getWhopCharterPlanId(offerId: string): string | undefined {
  const normalized = normalizeCharterOfferId(offerId)
  if (!normalized) return undefined
  const offer = CHARTER_OFFER_CATALOG[normalized]
  const envVal = (process.env[offer.whopPlanEnvKey] || '').replace(/\\n/g, '').trim()
  return envVal || undefined
}

export function isCharterWhopPlanConfigured(offerId: CharterOfferId = 'founding_operator'): boolean {
  return Boolean(getWhopCharterPlanId(offerId))
}

export function getCharterOfferFromWhopPlanId(planId: string): CharterOfferDefinition | null {
  if (!planId) return null
  for (const offer of Object.values(CHARTER_OFFER_CATALOG)) {
    const envPlanId = (process.env[offer.whopPlanEnvKey] || '').replace(/\\n/g, '').trim()
    if (envPlanId && envPlanId === planId) {
      return offer
    }
  }
  return null
}
