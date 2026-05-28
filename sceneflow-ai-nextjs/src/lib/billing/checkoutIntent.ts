export const PENDING_CHECKOUT_TIER_KEY = 'pendingCheckoutTier'

export function setPendingCheckoutTier(tier: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_CHECKOUT_TIER_KEY, tier)
}

export function consumePendingCheckoutTier(): string | null {
  if (typeof window === 'undefined') return null
  const tier = sessionStorage.getItem(PENDING_CHECKOUT_TIER_KEY)
  if (tier) {
    sessionStorage.removeItem(PENDING_CHECKOUT_TIER_KEY)
  }
  return tier
}

export function getSignupUrlForTier(tier: string): string {
  if (tier === 'explorer') {
    return '/?signup=explorer'
  }
  return `/?signup=1&checkoutTier=${encodeURIComponent(tier)}`
}
