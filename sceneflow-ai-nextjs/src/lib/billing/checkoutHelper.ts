import {
  CHECKOUT_TIER_NAMES,
  getCheckoutReturnUrl,
  getWhopPlanId,
  isWhopPaymentEnabled,
  normalizeTierName,
  type BillingTierName,
} from './tierCatalog'
import { getWhopClient } from './whopClient'
import { SubscriptionService } from '@/services/SubscriptionService'

export interface CheckoutSessionResult {
  sessionId: string
  planId: string
  tierName: BillingTierName
  returnUrl: string
}

export function isValidCheckoutTier(tierName: string): tierName is BillingTierName {
  const normalized = normalizeTierName(tierName)
  return normalized !== null && CHECKOUT_TIER_NAMES.includes(normalized)
}

export async function createWhopCheckoutSession(
  userId: string,
  tierName: string,
  userEmail?: string | null,
  extraMetadata?: Record<string, string | undefined>
): Promise<CheckoutSessionResult> {
  const normalizedTier = normalizeTierName(tierName)
  if (!normalizedTier || !CHECKOUT_TIER_NAMES.includes(normalizedTier)) {
    throw new Error(`Invalid checkout tier: ${tierName}`)
  }

  if (normalizedTier === 'explorer') {
    const canPurchase = await SubscriptionService.canPurchaseOneTimeTier(
      userId,
      'explorer'
    )
    if (!canPurchase) {
      throw new Error('Explorer can only be purchased once per account')
    }
  }

  const planId = getWhopPlanId(normalizedTier)
  if (!planId) {
    throw new Error(`Whop plan not configured for tier: ${normalizedTier}`)
  }

  const client = getWhopClient()
  const returnUrl = getCheckoutReturnUrl('success')

  const checkoutConfig = await client.checkoutConfigurations.create({
    plan_id: planId,
    metadata: {
      user_id: userId,
      tier_name: normalizedTier,
      user_email: userEmail || undefined,
      ...extraMetadata,
    },
    redirect_url: returnUrl,
    source_url: returnUrl,
  })

  const sessionPlanId = checkoutConfig.plan?.id || planId

  return {
    sessionId: checkoutConfig.id,
    planId: sessionPlanId,
    tierName: normalizedTier,
    returnUrl,
  }
}

export async function handleDemoCheckout(
  userId: string,
  tierName: string
): Promise<{ success: true; redirectUrl: string }> {
  const normalizedTier = normalizeTierName(tierName)
  if (!normalizedTier) {
    throw new Error(`Invalid tier: ${tierName}`)
  }

  if (normalizedTier === 'explorer') {
    await SubscriptionService.grantExplorerPurchase(userId)
  } else {
    await SubscriptionService.activateSubscription(userId, normalizedTier, {
      source: 'demo_checkout',
    })
  }

  return {
    success: true,
    redirectUrl: '/dashboard/settings/billing?checkout=success',
  }
}

export function isCheckoutConfigured(): boolean {
  if (!isWhopPaymentEnabled()) return false
  return Boolean(process.env.WHOP_API_KEY && process.env.WHOP_COMPANY_ID)
}

/** Demo checkout only when Whop is not configured and demo/dev mode is explicitly enabled. */
export function shouldUseDemoCheckout(): boolean {
  if (isCheckoutConfigured()) return false
  return (
    process.env.DEMO_MODE === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.FORCE_WHOP_CHECKOUT !== 'true')
  )
}
