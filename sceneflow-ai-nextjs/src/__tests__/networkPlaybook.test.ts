import { describe, it, expect } from 'vitest'
import {
  getDistributionDestinations,
  interpolateDestinations,
  normalizeDistributionLocale,
} from '@/lib/network/destinations'
import { qualifyWatchHeartbeat, QUALIFIED_WATCH_THRESHOLD_SECONDS } from '@/lib/network/qualifiedWatch'
import {
  CREATOR_POOL_RATIO,
  referralBountyForMonth,
  settleMonthlyWatchPool,
} from '@/lib/network/poolSettlement'
import type { WatchHeartbeat } from '@/lib/network/types'

function beat(overrides: Partial<WatchHeartbeat> = {}): WatchHeartbeat {
  return {
    titleId: 'title-1',
    accountId: 'viewer-1',
    creatorUserId: 'creator-1',
    atMs: Date.now(),
    deltaSeconds: 15,
    isSubscriber: true,
    isTrailer: false,
    isVisible: true,
    titleElapsedSeconds: QUALIFIED_WATCH_THRESHOLD_SECONDS + 10,
    ...overrides,
  }
}

describe('distribution destinations', () => {
  it('uses YouTube and TikTok/Shorts outside mainland China', () => {
    expect(getDistributionDestinations('en')).toEqual({
      longForm: 'YouTube',
      shorts: 'TikTok and Shorts',
    })
    expect(getDistributionDestinations('zh-TW')).toEqual({
      longForm: 'YouTube',
      shorts: 'TikTok and Shorts',
    })
  })

  it('uses Bilibili and Douyin for mainland Chinese locales', () => {
    expect(normalizeDistributionLocale('zh')).toBe('zh-CN')
    expect(getDistributionDestinations('zh-CN')).toEqual({
      longForm: '哔哩哔哩',
      shorts: '抖音',
    })
    expect(interpolateDestinations('Ship to {longForm} or {shorts}.', 'zh')).toBe(
      'Ship to 哔哩哔哩 or 抖音.'
    )
  })
})

describe('qualified watch time', () => {
  it('counts authenticated subscriber heartbeats after the threshold', () => {
    expect(qualifyWatchHeartbeat(beat(), 0)).toEqual({ ok: true, seconds: 15 })
  })

  it('excludes trailers, self-watch, hidden tabs, and early seconds', () => {
    expect(qualifyWatchHeartbeat(beat({ isTrailer: true }), 0).ok).toBe(false)
    expect(qualifyWatchHeartbeat(beat({ accountId: 'creator-1', creatorUserId: 'creator-1' }), 0).ok).toBe(
      false
    )
    expect(qualifyWatchHeartbeat(beat({ isVisible: false }), 0).ok).toBe(false)
    expect(qualifyWatchHeartbeat(beat({ titleElapsedSeconds: 10 }), 0).ok).toBe(false)
    expect(qualifyWatchHeartbeat(beat({ isSubscriber: false }), 0).ok).toBe(false)
  })
})

describe('watch-time pool settlement', () => {
  it('splits 50/50 net by qualified minutes and pays referral bounties outside the pool', () => {
    const result = settleMonthlyWatchPool({
      grossWatchRevenue: 1000,
      paymentGatewayFees: 50,
      hostingAndCdnCost: 100,
      transcodeCost: 50,
      qualifiedMinutesByTitle: { a: 30, b: 10 },
    })
    expect(CREATOR_POOL_RATIO).toBe(0.5)
    expect(result.netRevenue).toBe(800)
    expect(result.creatorPool).toBe(400)
    expect(result.platformShare).toBe(400)
    expect(result.shares).toEqual([
      { titleId: 'a', qualifiedMinutes: 30, poolShare: 300 },
      { titleId: 'b', qualifiedMinutes: 10, poolShare: 100 },
    ])
    expect(referralBountyForMonth(3)).toBe(3)
  })
})
