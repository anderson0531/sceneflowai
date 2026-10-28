import {
  ADDON_PACK_CATALOG,
  CHECKOUT_TIER_NAMES,
  getCheckoutReturnUrl,
  getWhopAddonPlanId,
  getWhopPlanId,
  isWhopPaymentEnabled,
  normalizeAddonPackId,
  normalizeTierName,
  type AddonPackId,
  type BillingTierName,
} from './tierCatalog'
import { ensureWhopRuntimeConfig, getWhopClient, getWhopCompanyId } from './whopClient'
import { SubscriptionService } from '@/services/SubscriptionService'

export interface CheckoutSessionResult {
  sessionId: string
  planId: string
  tierName: BillingTierName | AddonPackId
  returnUrl: string
  purchaseUrl: string
}

function buildCleanMetadata(
  raw: Record<string, string | undefined>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      out[k] = v.trim()
    }
  }
  return out
}

function resolveWhopApiRedirectUrl(returnUrl: string): string {
  if (returnUrl.startsWith('https://')) {
    return returnUrl.replace(/^https:\/\/sceneflowai\.studio\b/, 'https://www.sceneflowai.studio')
  }
  return 'https://www.sceneflowai.studio/dashboard/settings/billing?checkout=success'
}

export function buildWhopPurchaseUrl(
  rawPurchaseUrl: string | null | undefined,
  sessionId: string,
  userEmail?: string | null
): string {
  const base =
    rawPurchaseUrl && rawPurchaseUrl.startsWith('https://')
      ? rawPurchaseUrl
      : `https://whop.com/checkout/${sessionId}/`
  try {
    const url = new URL(base)
    if (userEmail && userEmail.trim()) {
      url.searchParams.set('email', userEmail.trim())
    }
    return url.toString()
  } catch {
    return base
  }
}

export function isValidCheckoutTier(tierName: string): tierName is BillingTierName {
  const normalized = normalizeTierName(tierName)
  return normalized !== null && CHECKOUT_TIER_NAMES.includes(normalized)
}

export function isValidAddonPack(packId: string): packId is AddonPackId {
  return normalizeAddonPackId(packId) !== null
}

export async function createWhopCheckoutSession(
  userId: string,
  tierName: string,
  userEmail?: string | null,
  extraMetadata?: Record<string, string | undefined>
): Promise<CheckoutSessionResult> {
  await ensureWhopRuntimeConfig()

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
  const whopRedirectUrl = resolveWhopApiRedirectUrl(returnUrl)

  const checkoutConfig = await client.checkoutConfigurations.create({
    plan_id: planId,
    metadata: buildCleanMetadata({
      user_id: userId,
      tier_name: normalizedTier,
      user_email: userEmail || undefined,
      ...extraMetadata,
    }),
    redirect_url: whopRedirectUrl,
    source_url: whopRedirectUrl,
  })

  const sessionPlanId = checkoutConfig.plan?.id || planId
  const purchaseUrl = buildWhopPurchaseUrl(
    checkoutConfig.purchase_url,
    checkoutConfig.id,
    userEmail
  )

  return {
    sessionId: checkoutConfig.id,
    planId: sessionPlanId,
    tierName: normalizedTier,
    returnUrl,
    purchaseUrl,
  }
}

export async function createWhopAddonCheckoutSession(
  userId: string,
  addonPackId: string,
  userEmail?: string | null,
  extraMetadata?: Record<string, string | undefined>
): Promise<CheckoutSessionResult> {
  await ensureWhopRuntimeConfig()

  const normalizedPack = normalizeAddonPackId(addonPackId)
  if (!normalizedPack) {
    throw new Error(`Invalid add-on pack: ${addonPackId}`)
  }

  const canPurchase = await SubscriptionService.canPurchaseAddonPack(userId)
  if (!canPurchase) {
    throw new Error(
      'Subscriber Add-On Credit Packs require an active monthly subscription (Hobbyist, Starter, Pro, or Studio)'
    )
  }

  const pack = ADDON_PACK_CATALOG[normalizedPack]
  const planId = getWhopAddonPlanId(normalizedPack)
  if (!planId) {
    throw new Error(`Whop plan not configured for add-on pack: ${normalizedPack}`)
  }

  const client = getWhopClient()
  const returnUrl = getCheckoutReturnUrl('success')
  const whopRedirectUrl = resolveWhopApiRedirectUrl(returnUrl)

  const checkoutConfig = await client.checkoutConfigurations.create({
    plan_id: planId,
    metadata: buildCleanMetadata({
      user_id: userId,
      addon_pack: normalizedPack,
      addon_credits: String(pack.credits),
      addon_price_usd: String(pack.priceUsd),
      user_email: userEmail || undefined,
      ...extraMetadata,
    }),
    redirect_url: whopRedirectUrl,
    source_url: whopRedirectUrl,
  })

  const sessionPlanId = checkoutConfig.plan?.id || planId
  const purchaseUrl = buildWhopPurchaseUrl(
    checkoutConfig.purchase_url,
    checkoutConfig.id,
    userEmail
  )

  return {
    sessionId: checkoutConfig.id,
    planId: sessionPlanId,
    tierName: normalizedPack,
    returnUrl,
    purchaseUrl,
  }
}

export async function handleDemoCheckout(
  userId: string,
  tierOrPackName: string
): Promise<{ success: true; redirectUrl: string }> {
  const normalizedPack = normalizeAddonPackId(tierOrPackName)
  if (normalizedPack) {
    const pack = ADDON_PACK_CATALOG[normalizedPack]
    await SubscriptionService.purchaseAddonCredits(userId, pack.credits, pack.priceUsd)
    return {
      success: true,
      redirectUrl: '/dashboard/settings/billing?checkout=success',
    }
  }

  const normalizedTier = normalizeTierName(tierOrPackName)
  if (!normalizedTier) {
    throw new Error(`Invalid tier: ${tierOrPackName}`)
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
  const apiKey = (process.env.WHOP_API_KEY || '').replace(/\\n/g, '').trim()
  const companyId = getWhopCompanyId()
  return Boolean(apiKey && companyId)
}

/** Demo checkout only when Whop is not configured and demo/dev mode is explicitly enabled. */
export function shouldUseDemoCheckout(): boolean {
  if (isCheckoutConfigured()) return false
  return (
    process.env.DEMO_MODE === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.FORCE_WHOP_CHECKOUT !== 'true')
  )
}
