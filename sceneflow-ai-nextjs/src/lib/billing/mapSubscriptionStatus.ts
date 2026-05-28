/** Normalize /api/subscription/status payload for billing UI. */

export interface MappedSubscriptionData {
  subscription: {
    tier: {
      id: string
      name: string
      display_name: string
      monthly_price_usd: number
      included_credits_monthly: number
      storage_gb: number
      features: string[]
    } | null
    status: string | null
    startDate: string | null
    endDate: string | null
  }
  credits: {
    total: number
    subscription: number
    addon: number
  }
  oneTimeTiersPurchased: string[]
}

export function mapSubscriptionStatus(raw: Record<string, unknown>): MappedSubscriptionData {
  const subscription = (raw.subscription as Record<string, unknown>) || {}
  const credits = (raw.credits as Record<string, unknown>) || {}
  const tier = subscription.tier as MappedSubscriptionData['subscription']['tier']

  return {
    subscription: {
      tier: tier || null,
      status: (subscription.status as string | null) ?? null,
      startDate: (subscription.startDate as string | null) ?? null,
      endDate: (subscription.endDate as string | null) ?? null,
    },
    credits: {
      total: Number(credits.total_credits ?? credits.total ?? 0),
      subscription: Number(credits.subscription_credits ?? credits.subscription ?? 0),
      addon: Number(credits.addon_credits ?? credits.addon ?? 0),
    },
    oneTimeTiersPurchased: Array.isArray(raw.one_time_tiers_purchased)
      ? (raw.one_time_tiers_purchased as string[])
      : [],
  }
}
