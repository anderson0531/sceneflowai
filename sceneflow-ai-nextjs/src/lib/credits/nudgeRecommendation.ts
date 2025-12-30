/**
 * Nudge Recommendation System
 * 
 * Provides strategic top-up and upgrade suggestions based on user's
 * current plan, credit balance, and usage patterns.
 */

import { type PlanTier, TOP_UP_PACKS, SUBSCRIPTION_PLANS } from './creditCosts'

// =============================================================================
// TYPES
// =============================================================================

export interface TopUpRecommendation {
  pack: keyof typeof TOP_UP_PACKS
  name: string
  price: number
  credits: number
  description: string
  reason: string
}

export interface UpgradeRecommendation {
  fromPlan: PlanTier
  toPlan: PlanTier
  name: string
  price: number
  credits: number
  savings: string
  reason: string
}

export interface NudgeRecommendation {
  type: 'top_up' | 'upgrade' | 'both'
  topUp?: TopUpRecommendation
  upgrade?: UpgradeRecommendation
  headline: string
  body: string
  urgency: 'low' | 'medium' | 'high'
}

// =============================================================================
// THRESHOLDS
// =============================================================================

const LOW_CREDIT_THRESHOLD = 0.15 // 15% of plan credits
const CRITICAL_CREDIT_THRESHOLD = 0.05 // 5% of plan credits
const UPGRADE_TRIGGER_TOP_UPS = 2 // Suggest upgrade after 2 Feature Boosts in a quarter

// =============================================================================
// RECOMMENDATION LOGIC
// =============================================================================

/**
 * Get the recommended top-up pack based on user's current plan
 */
export function getRecommendedTopUp(plan: PlanTier): TopUpRecommendation {
  switch (plan) {
    case 'trial':
      return {
        pack: 'quick_fix',
        name: TOP_UP_PACKS.quick_fix.name,
        price: TOP_UP_PACKS.quick_fix.price,
        credits: TOP_UP_PACKS.quick_fix.credits,
        description: TOP_UP_PACKS.quick_fix.description,
        reason: 'Best value for testing and exploration',
      }
    case 'starter':
    case 'pro':
      return {
        pack: 'scene_pack',
        name: TOP_UP_PACKS.scene_pack.name,
        price: TOP_UP_PACKS.scene_pack.price,
        credits: TOP_UP_PACKS.scene_pack.credits,
        description: TOP_UP_PACKS.scene_pack.description,
        reason: 'Balanced for 10-20 scene sequences',
      }
    case 'studio':
      return {
        pack: 'feature_boost',
        name: TOP_UP_PACKS.feature_boost.name,
        price: TOP_UP_PACKS.feature_boost.price,
        credits: TOP_UP_PACKS.feature_boost.credits,
        description: TOP_UP_PACKS.feature_boost.description,
        reason: 'Best value-per-credit for high-volume production',
      }
    default:
      return {
        pack: 'scene_pack',
        name: TOP_UP_PACKS.scene_pack.name,
        price: TOP_UP_PACKS.scene_pack.price,
        credits: TOP_UP_PACKS.scene_pack.credits,
        description: TOP_UP_PACKS.scene_pack.description,
        reason: 'Balanced for most projects',
      }
  }
}

/**
 * Get the recommended upgrade based on current plan
 */
export function getRecommendedUpgrade(currentPlan: PlanTier): UpgradeRecommendation | null {
  switch (currentPlan) {
    case 'trial':
      return {
        fromPlan: 'trial',
        toPlan: 'starter',
        name: SUBSCRIPTION_PLANS.starter.name,
        price: SUBSCRIPTION_PLANS.starter.price,
        credits: SUBSCRIPTION_PLANS.starter.credits,
        savings: '3.75x more credits per dollar',
        reason: 'Monthly credits for regular production',
      }
    case 'starter':
      return {
        fromPlan: 'starter',
        toPlan: 'pro',
        name: SUBSCRIPTION_PLANS.pro.name,
        price: SUBSCRIPTION_PLANS.pro.price,
        credits: SUBSCRIPTION_PLANS.pro.credits,
        savings: 'Unlock Veo 3.1 Max quality',
        reason: 'Production-quality video and collaboration',
      }
    case 'pro':
      return {
        fromPlan: 'pro',
        toPlan: 'studio',
        name: SUBSCRIPTION_PLANS.studio.name,
        price: SUBSCRIPTION_PLANS.studio.price,
        credits: SUBSCRIPTION_PLANS.studio.credits,
        savings: '5x more credits, best per-credit value',
        reason: 'Full movie capacity with dedicated support',
      }
    case 'studio':
      // Already on highest plan
      return null
    default:
      return null
  }
}

/**
 * Generate a nudge recommendation based on user's state
 */
export function generateNudge(params: {
  plan: PlanTier
  currentBalance: number
  planCredits: number
  projectName?: string
  topUpsPurchasedThisQuarter?: number
}): NudgeRecommendation {
  const { plan, currentBalance, planCredits, projectName, topUpsPurchasedThisQuarter = 0 } = params
  
  const balanceRatio = currentBalance / planCredits
  const topUp = getRecommendedTopUp(plan)
  const upgrade = getRecommendedUpgrade(plan)
  
  // Critical: Under 5% credits
  if (balanceRatio <= CRITICAL_CREDIT_THRESHOLD) {
    return {
      type: upgrade ? 'both' : 'top_up',
      topUp,
      upgrade: upgrade || undefined,
      headline: '⚠️ Credits Almost Depleted',
      body: projectName 
        ? `You have ${currentBalance} credits left. Top up now to finish "${projectName}" without interruption.`
        : `You have ${currentBalance} credits left. Top up now to continue your creative work.`,
      urgency: 'high',
    }
  }
  
  // Low: Under 15% credits
  if (balanceRatio <= LOW_CREDIT_THRESHOLD) {
    return {
      type: 'top_up',
      topUp,
      upgrade: upgrade || undefined,
      headline: '🔋 Creative Power Running Low',
      body: projectName 
        ? `You have ${currentBalance} credits left. You're just a few scenes away from finishing "${projectName}"!`
        : `You have ${currentBalance} credits remaining.`,
      urgency: 'medium',
    }
  }
  
  // Suggest upgrade if they've bought 2+ Feature Boosts this quarter
  if (topUpsPurchasedThisQuarter >= UPGRADE_TRIGGER_TOP_UPS && upgrade) {
    return {
      type: 'upgrade',
      upgrade,
      headline: '💡 Upgrade for Better Value',
      body: `You've purchased ${topUpsPurchasedThisQuarter} top-ups this quarter. Upgrading to ${upgrade.name} gives you ${upgrade.savings}.`,
      urgency: 'low',
    }
  }
  
  // Default: No immediate nudge needed
  return {
    type: 'top_up',
    topUp,
    headline: '✨ Need More Credits?',
    body: `Your balance: ${currentBalance} credits. Top up anytime from your dashboard.`,
    urgency: 'low',
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export interface LowCreditEmailData {
  userName: string
  projectName?: string
  currentBalance: number
  balancePercentage: number
  recommendedPack: TopUpRecommendation
  estimatedScenesRemaining: number
  topUpUrl: string
  upgradeUrl?: string
}

/**
 * Generate low credit email content
 */
export function generateLowCreditEmail(data: LowCreditEmailData): {
  subject: string
  headline: string
  body: string
  ctaText: string
  ctaUrl: string
} {
  const { userName, projectName, currentBalance, recommendedPack, estimatedScenesRemaining, topUpUrl } = data
  
  const subject = projectName 
    ? `🎬 Your SceneFlow project "${projectName}" needs a recharge!`
    : '🎬 Your SceneFlow credits are running low!'
  
  const headline = projectName
    ? `You've been making incredible progress on "${projectName}".`
    : `You've been creating amazing content.`
  
  const body = `We noticed your credit balance is getting low. To ensure your renders aren't interrupted and your creative flow stays smooth, we recommend a quick top-up.

Based on your current activity, the **${recommendedPack.name}** ($${recommendedPack.price} for ${recommendedPack.credits.toLocaleString()} credits) will give you enough power to finish your current project.

| Current Balance | ${currentBalance.toLocaleString()} Credits |
|-----------------|---------------------------------------------|
| Estimated Scenes Remaining | ~${estimatedScenesRemaining} Fast Drafts |

*Pro Tip: Top-Up credits never expire! They'll stay in your account until you're ready for your next "Action!"*`

  return {
    subject,
    headline,
    body,
    ctaText: 'Top Up Now',
    ctaUrl: topUpUrl,
  }
}

// =============================================================================
// TOAST/MODAL CONTENT
// =============================================================================

export interface ToastContent {
  title: string
  description: string
  action: string
  actionUrl: string
  dismissable: boolean
}

export function generateLowCreditToast(nudge: NudgeRecommendation): ToastContent {
  return {
    title: nudge.headline,
    description: nudge.body,
    action: nudge.topUp ? `Add ${nudge.topUp.credits.toLocaleString()} Credits` : 'View Options',
    actionUrl: '/dashboard/credits',
    dismissable: nudge.urgency !== 'high',
  }
}
