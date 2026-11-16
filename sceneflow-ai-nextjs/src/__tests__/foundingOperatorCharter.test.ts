import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createCheckoutConfigMock = vi.fn()

vi.mock('@/lib/billing/whopClient', () => ({
  ensureWhopRuntimeConfig: vi.fn().mockResolvedValue(undefined),
  getWhopClient: () => ({
    checkoutConfigurations: {
      create: (...args: unknown[]) => createCheckoutConfigMock(...args),
    },
  }),
}))

import {
  CHARTER_OFFER_CATALOG,
  getCharterOfferFromWhopPlanId,
  getWhopCharterPlanId,
  isCharterWhopPlanConfigured,
  normalizeCharterOfferId,
} from '@/lib/billing/tierCatalog'
import {
  createWhopCharterCheckoutSession,
  isValidCharterOffer,
} from '@/lib/billing/checkoutHelper'
import { SubscriptionService } from '@/services/SubscriptionService'
import { isPublicRoute } from '@/constants/publicRoutes'
import { allowsGoogleTranslate } from '@/config/i18n/gtSurfaces'

describe('Founding Operator Charter Offer, Fulfillment & Public Route Registration', () => {
  const originalEnv = process.env.WHOP_PLAN_FOUNDING_OPERATOR

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.WHOP_PLAN_FOUNDING_OPERATOR
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WHOP_PLAN_FOUNDING_OPERATOR
    } else {
      process.env.WHOP_PLAN_FOUNDING_OPERATOR = originalEnv
    }
    vi.restoreAllMocks()
  })

  it('defines the $299 / 90-day / 18,000-credit Founding Operator charter mapped to Pro', () => {
    const offer = CHARTER_OFFER_CATALOG.founding_operator
    expect(offer.priceUsd).toBe(299)
    expect(offer.credits).toBe(18000)
    expect(offer.durationDays).toBe(90)
    expect(offer.grantsTier).toBe('pro')
    expect(offer.renewalMonthlyUsd).toBe(119)
    expect(offer.seatCap).toBe(25)

    expect(normalizeCharterOfferId('founding_operator')).toBe('founding_operator')
    expect(normalizeCharterOfferId('founding-operator')).toBe('founding_operator')
    expect(normalizeCharterOfferId('founding_operators')).toBe('founding_operator')
    expect(normalizeCharterOfferId('charter')).toBe('founding_operator')
    expect(normalizeCharterOfferId('pro')).toBeNull()
    expect(isValidCharterOffer('founding_operator')).toBe(true)
    expect(isValidCharterOffer('starter')).toBe(false)
  })

  it('detects WHOP_PLAN_FOUNDING_OPERATOR env configuration and resolves plan IDs cleanly', () => {
    expect(isCharterWhopPlanConfigured('founding_operator')).toBe(false)
    expect(getWhopCharterPlanId('founding_operator')).toBeUndefined()
    expect(getCharterOfferFromWhopPlanId('plan_charter_test')).toBeNull()

    process.env.WHOP_PLAN_FOUNDING_OPERATOR = 'plan_charter_test\n'
    expect(isCharterWhopPlanConfigured('founding_operator')).toBe(true)
    expect(getWhopCharterPlanId('founding_operator')).toBe('plan_charter_test')
    expect(getCharterOfferFromWhopPlanId('plan_charter_test')?.id).toBe('founding_operator')
  })

  it('activates a 90-day Pro subscription without 30-day credit grant and awards 18,000 12-month pack credits', async () => {
    const activateSubSpy = vi
      .spyOn(SubscriptionService, 'activateSubscription')
      .mockResolvedValue(undefined)
    const purchaseAddonSpy = vi
      .spyOn(SubscriptionService, 'purchaseAddonCredits')
      .mockResolvedValue(undefined)

    const startMs = Date.now()
    await SubscriptionService.activateCharterOffer('user-uuid-1', 'founding_operator', {
      whopMembershipId: 'mem_charter_99',
      whopUserId: 'usr_whop_99',
      source: 'whop_webhook',
    })

    expect(activateSubSpy).toHaveBeenCalledTimes(1)
    const [calledUser, calledTier, calledOpts] = activateSubSpy.mock.calls[0]
    expect(calledUser).toBe('user-uuid-1')
    expect(calledTier).toBe('pro')
    expect(calledOpts?.whopMembershipId).toBe('mem_charter_99')
    expect(calledOpts?.whopUserId).toBe('usr_whop_99')
    expect(calledOpts?.grantCredits).toBe(false)

    const durationDays =
      ((calledOpts?.billingPeriodEnd as Date).getTime() - startMs) / (24 * 60 * 60 * 1000)
    expect(durationDays).toBeGreaterThan(89.9)
    expect(durationDays).toBeLessThan(90.1)

    expect(purchaseAddonSpy).toHaveBeenCalledWith('user-uuid-1', 18000, 299)
  })

  it('creates a Whop charter checkout session routing post-checkout to Producer Onboarding', async () => {
    process.env.WHOP_PLAN_FOUNDING_OPERATOR = 'plan_founding_299'
    createCheckoutConfigMock.mockResolvedValue({
      id: 'ch_cfg_123',
      plan: { id: 'plan_founding_299' },
      purchase_url: 'https://whop.com/checkout/plan_founding_299',
    })

    const session = await createWhopCharterCheckoutSession(
      'user-uuid-1',
      'founding_operator',
      'founder@example.com'
    )

    expect(session.sessionId).toBe('ch_cfg_123')
    expect(session.planId).toBe('plan_founding_299')
    expect(session.tierName).toBe('founding_operator')
    expect(session.returnUrl).toContain('/dashboard/settings/producer?onboarding=1&checkout=success')

    expect(createCheckoutConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_id: 'plan_founding_299',
        metadata: expect.objectContaining({
          user_id: 'user-uuid-1',
          charter_offer: 'founding_operator',
          tier_name: 'pro',
          charter_credits: '18000',
          charter_duration_days: '90',
          user_email: 'founder@example.com',
        }),
      })
    )
  })

  it('registers /founding-operators as a public route with Google Translate enabled', () => {
    expect(isPublicRoute('/founding-operators')).toBe(true)
    expect(allowsGoogleTranslate('/founding-operators')).toBe(true)
  })
})
