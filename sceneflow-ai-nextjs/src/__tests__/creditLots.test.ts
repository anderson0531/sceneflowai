import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  ADDON_CREDIT_SHELF_LIFE_DAYS,
  EXPLORER_CREDIT_SHELF_LIFE_DAYS,
  applyCreditSpend,
  applyPackGrant,
  applySubscriptionGrant,
  createLot,
  evaluatePackRefund,
  evaluateSubscriptionRefund,
  expireDueLots,
  materializeLegacyLots,
  shelfLifeExpiresAt,
} from '@/lib/credits/creditLots'
import { passModelSavingsToNewPurchases } from '@/lib/credits/creditSchedulePolicy'
import { VIDEO_CREDIT_SCHEDULE_POLICY } from '@/lib/credits/videoEnginePricing'
import { PRICING_LANDING_COPY } from '@/config/landing/pricingLandingCopy'
import { TIER_CATALOG } from '@/lib/billing/tierCatalog'

const NOW = new Date('2026-10-06T00:00:00.000Z')

function daysFrom(days: number): Date {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000)
}

describe('credit lot shelf life', () => {
  it('expires Explorer in 90 days and each add-on pack in 12 months', () => {
    expect(EXPLORER_CREDIT_SHELF_LIFE_DAYS).toBe(90)
    expect(ADDON_CREDIT_SHELF_LIFE_DAYS).toBe(365)
    const explorer = shelfLifeExpiresAt('explorer', NOW)
    const addon = shelfLifeExpiresAt('addon', NOW)
    expect(explorer.toISOString()).toBe(daysFrom(90).toISOString())
    expect(addon.toISOString()).toBe(daysFrom(365).toISOString())
  })

  it('does not extend an older pack when a new pack is purchased', () => {
    const first = applyPackGrant({
      lots: [],
      source: 'addon',
      credits: 2000,
      now: NOW,
      ref: 'pack-a',
    })
    const later = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000)
    const second = applyPackGrant({
      lots: first.lots,
      source: 'addon',
      credits: 9000,
      now: later,
      ref: 'pack-b',
    })
    const older = second.lots.find((lot) => lot.ref === 'pack-a')
    const newer = second.lots.find((lot) => lot.ref === 'pack-b')
    expect(older?.expiresAt).toBe(first.expiresAt)
    expect(newer?.expiresAt).not.toBe(older?.expiresAt)
    expect(new Date(newer!.expiresAt).getTime()).toBeGreaterThan(new Date(older!.expiresAt).getTime())
  })

  it('spends the soonest expiry first, then the older pack', () => {
    const subscription = createLot({
      source: 'subscription',
      credits: 100,
      purchasedAt: NOW,
      expiresAt: daysFrom(10),
      id: 'sub',
    })
    const olderPack = createLot({
      source: 'addon',
      credits: 50,
      purchasedAt: daysFrom(-20),
      expiresAt: daysFrom(40),
      id: 'old-pack',
    })
    const newerPack = createLot({
      source: 'explorer',
      credits: 80,
      purchasedAt: NOW,
      expiresAt: daysFrom(40),
      id: 'new-pack',
    })
    const spent = applyCreditSpend({
      lots: [newerPack, olderPack, subscription],
      amount: 120,
      now: NOW,
      reason: 'ai_usage',
    })
    expect(spent.ok).toBe(true)
    expect(spent.usedSubscription).toBe(100)
    expect(spent.usedAddon).toBe(20)
    expect(spent.endingBalance).toBe(110)
    const oldRemaining = spent.lots.find((lot) => lot.id === 'old-pack')?.remaining
    const newRemaining = spent.lots.find((lot) => lot.id === 'new-pack')?.remaining
    expect(oldRemaining).toBe(30)
    expect(newRemaining).toBe(80)
  })

  it('drops unused subscription credits on renewal instead of rolling them over', () => {
    const current = createLot({
      source: 'subscription',
      credits: 4500,
      purchasedAt: daysFrom(-20),
      expiresAt: daysFrom(10),
      id: 'month-1',
    })
    current.remaining = 1200
    const pack = createLot({
      source: 'addon',
      credits: 2000,
      purchasedAt: daysFrom(-5),
      expiresAt: daysFrom(300),
      id: 'pack',
    })
    const renewal = applySubscriptionGrant({
      lots: [current, pack],
      credits: 4500,
      now: NOW,
      expiresAt: daysFrom(30),
      ref: 'renewal',
    })
    expect(renewal.duplicate).toBe(false)
    expect(renewal.droppedSubscription).toBe(1200)
    expect(renewal.granted).toBe(4500)
    expect(renewal.endingBalance).toBe(6500)
    expect(renewal.lots.filter((lot) => lot.source === 'subscription')).toHaveLength(1)
    expect(renewal.lots.find((lot) => lot.source === 'subscription')?.remaining).toBe(4500)
    expect(renewal.intents.some((intent) => intent.meta.kind === 'no_rollover')).toBe(true)
    expect(renewal.intents.some((intent) => intent.meta.rollover === false)).toBe(true)
  })

  it('ignores a duplicate subscription webhook inside the grant window', () => {
    const first = applySubscriptionGrant({
      lots: [],
      credits: 4500,
      now: NOW,
      expiresAt: daysFrom(30),
    })
    const second = applySubscriptionGrant({
      lots: first.lots,
      credits: 4500,
      now: new Date(NOW.getTime() + 60 * 1000),
      expiresAt: daysFrom(30),
    })
    expect(second.duplicate).toBe(true)
    expect(second.granted).toBe(0)
    expect(second.endingBalance).toBe(4500)
  })

  it('expires cancelled subscription credits and aged packs on their own dates', () => {
    const subscription = createLot({
      source: 'subscription',
      credits: 500,
      purchasedAt: daysFrom(-40),
      expiresAt: daysFrom(-1),
      id: 'ended',
    })
    const pack = createLot({
      source: 'addon',
      credits: 300,
      purchasedAt: daysFrom(-400),
      expiresAt: daysFrom(-1),
      id: 'old',
    })
    const kept = createLot({
      source: 'explorer',
      credits: 100,
      purchasedAt: daysFrom(-10),
      expiresAt: daysFrom(80),
      id: 'explorer',
    })
    const expired = expireDueLots([subscription, pack, kept], NOW)
    expect(expired.expiredSubscription).toBe(500)
    expect(expired.expiredPack).toBe(300)
    expect(expired.lots.map((lot) => lot.id)).toEqual(['explorer'])
  })

  it('starts a shelf-life clock for legacy balances that had no lot', () => {
    const lots = materializeLegacyLots({
      addonCredits: 750,
      subscriptionCredits: 4500,
      subscriptionExpiresAt: daysFrom(12),
      now: NOW,
    })
    expect(lots).toHaveLength(2)
    const addon = lots.find((lot) => lot.source === 'addon')
    expect(addon?.expiresAt).toBe(daysFrom(365).toISOString())
    expect(lots.find((lot) => lot.source === 'subscription')?.expiresAt).toBe(daysFrom(12).toISOString())
  })

  it('refunds a subscription only inside 7 days when the grant is untouched', () => {
    const fresh = createLot({
      source: 'subscription',
      credits: 4500,
      purchasedAt: NOW,
      expiresAt: daysFrom(30),
    })
    expect(evaluateSubscriptionRefund({ lots: [fresh], now: daysFrom(3) }).eligible).toBe(true)
    fresh.remaining = 4400
    expect(evaluateSubscriptionRefund({ lots: [fresh], now: daysFrom(3) }).reason).toBe('credits_used')
    fresh.remaining = 4500
    expect(evaluateSubscriptionRefund({ lots: [fresh], now: daysFrom(8) }).reason).toBe('window_closed')

    const pack = createLot({
      source: 'explorer',
      credits: 750,
      purchasedAt: NOW,
      expiresAt: daysFrom(90),
    })
    expect(evaluatePackRefund({ lot: pack, now: daysFrom(2) }).eligible).toBe(true)
    pack.remaining = 700
    expect(evaluatePackRefund({ lot: pack, now: daysFrom(2) }).reason).toBe('credits_used')
  })
})

describe('model savings stay on new purchases', () => {
  it('raises credits per new dollar and leaves operation cost and outstanding balances alone', () => {
    const result = passModelSavingsToNewPurchases({
      previousCreditsPerDollar: 80,
      nextCreditsPerDollar: 120,
      operationCredits: 100,
      outstandingCredits: 10000,
      newPurchaseDollars: 25,
    })
    expect(result.operationCredits).toBe(100)
    expect(result.outstandingCredits).toBe(10000)
    expect(result.newPurchaseCredits).toBe(3000)
    expect(result.savingsDeliveredAs).toBe('more_credits_per_new_dollar')
    expect(VIDEO_CREDIT_SCHEDULE_POLICY).toBe('more_credits_per_new_dollar')
  })

  it('rejects a lower credits-per-dollar rate', () => {
    expect(() =>
      passModelSavingsToNewPurchases({
        previousCreditsPerDollar: 80,
        nextCreditsPerDollar: 40,
        operationCredits: 100,
        outstandingCredits: 1000,
        newPurchaseDollars: 9,
      })
    ).toThrow(/new dollar/)
  })
})

describe('published pricing copy', () => {
  it('drops the 14-day guarantee and the never-expire promise', () => {
    const copy = JSON.stringify(PRICING_LANDING_COPY)
    expect(copy).not.toContain('14-day')
    expect(copy).not.toContain('never expire')
    expect(copy).toContain('$9 Explorer to try the studio')
    expect(copy).toContain('Each pack lasts 12 months')
    expect(copy).toContain('Explorer credits last 90 days')
    expect(TIER_CATALOG.explorer.marketingFeatures.join('\n')).toContain('90 days')
    expect(TIER_CATALOG.starter.marketingFeatures.join('\n')).toContain('expire at period end')
    expect(TIER_CATALOG.pro.features.join('\n')).toContain('expire at period end')

    const refunds = readFileSync(path.join(process.cwd(), 'src/app/(legal)/refunds/page.tsx'), 'utf8')
    const terms = readFileSync(path.join(process.cwd(), 'src/app/(legal)/terms/page.tsx'), 'utf8')
    expect(refunds).not.toContain('14-day')
    expect(refunds).toContain('are not prorated')
    expect(refunds).toContain('7 days')
    expect(refunds).toContain('no subscription credits from that grant have been used')
    expect(terms).toContain('do not roll over')
    expect(terms).toContain('90 days after purchase')
    expect(terms).toContain('12 months after that purchase')
    expect(terms).toContain('more credits on purchases and renewals')
    expect(terms).not.toContain('never expire')
  })
})

describe('subscription credit cron does not mint a free month', () => {
  it('expires due lots and does not allocate a calendar-month grant', () => {
    const cron = readFileSync(
      path.join(process.cwd(), 'src/app/api/cron/subscription-credits/route.ts'),
      'utf8'
    )
    expect(cron).toContain('expireDueCredits')
    expect(cron).not.toContain('allocateMonthlyCredits')

    const service = readFileSync(
      path.join(process.cwd(), 'src/services/SubscriptionService.ts'),
      'utf8'
    )
    const start = service.indexOf('static async allocateMonthlyCredits')
    const body = service.slice(start, service.indexOf('static async expireSubscriptionCredits'))
    expect(body).toContain('expireDueCredits')
    expect(body).not.toContain('included_credits_monthly')
    expect(service).toContain('applySubscriptionGrant')
  })
})
