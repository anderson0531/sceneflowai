import type { MonthlyPoolInput, MonthlyPoolResult, TitlePoolShare } from './types'

/** Share of net Watch revenue that goes to the creator pool. */
export const CREATOR_POOL_RATIO = 0.5

/** Recurring bounty per active referred Watch subscriber, paid outside the pool. */
export const REFERRAL_BOUNTY_USD_PER_MONTH = 1

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * 50/50 net split by qualified minutes. Referral bounties are not deducted here.
 */
export function settleMonthlyWatchPool(input: MonthlyPoolInput): MonthlyPoolResult {
  const netRevenue = Math.max(
    0,
    input.grossWatchRevenue -
      input.paymentGatewayFees -
      input.hostingAndCdnCost -
      input.transcodeCost
  )
  const creatorPool = roundUsd(netRevenue * CREATOR_POOL_RATIO)
  const platformShare = roundUsd(netRevenue - creatorPool)

  const entries = Object.entries(input.qualifiedMinutesByTitle).filter(([, minutes]) => minutes > 0)
  const totalMinutes = entries.reduce((sum, [, minutes]) => sum + minutes, 0)

  const shares: TitlePoolShare[] =
    totalMinutes <= 0
      ? entries.map(([titleId]) => ({ titleId, qualifiedMinutes: 0, poolShare: 0 }))
      : entries.map(([titleId, qualifiedMinutes]) => ({
          titleId,
          qualifiedMinutes,
          poolShare: roundUsd(creatorPool * (qualifiedMinutes / totalMinutes)),
        }))

  return { netRevenue: roundUsd(netRevenue), creatorPool, platformShare, shares }
}

export function referralBountyForMonth(activeReferredSubscribers: number): number {
  return roundUsd(Math.max(0, activeReferredSubscribers) * REFERRAL_BOUNTY_USD_PER_MONTH)
}
