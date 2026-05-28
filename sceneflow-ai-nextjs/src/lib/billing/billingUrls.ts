import { CHECKOUT_TIER_NAMES, type BillingTierName } from './tierCatalog'

export interface BillingUrlOptions {
  tier?: string
  checkout?: 'success' | 'error' | 'cancel'
  anchor?: string
  isAuthenticated?: boolean
}

export function isCheckoutTierName(tier: string): tier is BillingTierName {
  return CHECKOUT_TIER_NAMES.includes(tier as BillingTierName)
}

/** Shared billing/pricing URLs for CTAs across landing, dashboard, and API responses. */
export function getBillingUrl(options: BillingUrlOptions = {}): string {
  const { tier, checkout, anchor, isAuthenticated } = options

  if (isAuthenticated === false) {
    if (tier && isCheckoutTierName(tier)) {
      if (tier === 'explorer') {
        return '/?signup=explorer'
      }
      return `/?signup=1&checkoutTier=${tier}`
    }
    return anchor ? `/#${anchor}` : '/#pricing'
  }

  const params = new URLSearchParams()
  if (tier && isCheckoutTierName(tier)) {
    params.set('checkoutTier', tier)
  }
  if (checkout) {
    params.set('checkout', checkout)
  }

  const query = params.toString()
  const base = '/dashboard/settings/billing'
  return query ? `${base}?${query}` : base
}

export function getPricingUrl(isAuthenticated?: boolean): string {
  return getBillingUrl({ isAuthenticated, anchor: 'pricing' })
}
