import { hasPurchasedExplorer } from '@/lib/billing/tierCatalog'

export interface SubscriptionAccessState {
  subscriptionStatus?: string | null
  tierName?: string | null
  tierId?: string | null
  oneTimeTiersPurchased?: string[] | null
}

/**
 * Returns true if the user has an active recurring subscription
 * or has purchased the one-time Explorer pass.
 */
export function hasActiveSubscriptionAccess(state: SubscriptionAccessState): boolean {
  const status = (state.subscriptionStatus || '').trim().toLowerCase()
  const hasActiveRecurring =
    (status === 'active' || status === 'trial') &&
    Boolean(state.tierName || state.tierId)

  const hasExplorer = hasPurchasedExplorer(state.oneTimeTiersPurchased ?? undefined)

  return hasActiveRecurring || hasExplorer
}

/**
 * Routes inside /dashboard that remain accessible when a user does not yet
 * have an active subscription so they can complete checkout, manage their profile, or view help.
 */
export function isSubscriptionExemptDashboardPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (
    pathname.startsWith('/dashboard/settings/billing') ||
    pathname.startsWith('/dashboard/settings/profile') ||
    pathname.startsWith('/dashboard/help')
  )
}
