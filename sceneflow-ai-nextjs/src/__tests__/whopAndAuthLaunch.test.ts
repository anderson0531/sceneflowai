import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  ADDON_PACK_CATALOG,
  CHECKOUT_TIER_NAMES,
  DEFAULT_WHOP_PLAN_IDS,
  getAddonPackFromWhopPlanId,
  getTierNameFromWhopPlanId,
  getWhopAddonPlanId,
  getWhopPlanId,
  normalizeAddonPackId,
  TIER_CATALOG,
} from '@/lib/billing/tierCatalog'
import {
  buildWhopPurchaseUrl,
  isValidAddonPack,
  isValidCheckoutTier,
} from '@/lib/billing/checkoutHelper'

vi.mock('@/lib/env', () => ({
  isDemoMode: vi.fn(() => false),
  allowDemoFallback: vi.fn(() => false),
}))

vi.mock('@/services/AuthService', () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
  },
}))

describe('Whop Catalog & Launch Tier Configuration', () => {
  it('maps all 5 launch checkout tiers to live Whop plan IDs', () => {
    expect(CHECKOUT_TIER_NAMES).toEqual([
      'explorer',
      'hobbyist',
      'starter',
      'pro',
      'studio',
    ])

    expect(getWhopPlanId('explorer')).toBe(DEFAULT_WHOP_PLAN_IDS.explorer)
    expect(getWhopPlanId('hobbyist')).toBe(DEFAULT_WHOP_PLAN_IDS.hobbyist)
    expect(getWhopPlanId('starter')).toBe(DEFAULT_WHOP_PLAN_IDS.starter)
    expect(getWhopPlanId('pro')).toBe(DEFAULT_WHOP_PLAN_IDS.pro)
    expect(getWhopPlanId('studio')).toBe(DEFAULT_WHOP_PLAN_IDS.studio)

    for (const tier of CHECKOUT_TIER_NAMES) {
      expect(isValidCheckoutTier(tier)).toBe(true)
      const planId = getWhopPlanId(tier)
      expect(planId).toMatch(/^plan_/)
      expect(getTierNameFromWhopPlanId(planId!)).toBe(tier)
    }
  })

  it('verifies launch pricing and credit allocations across all tiers', () => {
    expect(TIER_CATALOG.explorer.priceUsd).toBe(9)
    expect(TIER_CATALOG.explorer.credits).toBe(750)
    expect(TIER_CATALOG.explorer.isOneTime).toBe(true)

    expect(TIER_CATALOG.hobbyist.priceUsd).toBe(19)
    expect(TIER_CATALOG.hobbyist.credits).toBe(1500)

    expect(TIER_CATALOG.starter.priceUsd).toBe(49)
    expect(TIER_CATALOG.starter.credits).toBe(4500)

    expect(TIER_CATALOG.pro.priceUsd).toBe(149)
    expect(TIER_CATALOG.pro.credits).toBe(15000)

    expect(TIER_CATALOG.studio.priceUsd).toBe(599)
    expect(TIER_CATALOG.studio.credits).toBe(75000)
  })

  it('maps all 3 Subscriber Add-On Credit Packs ($25 / $100 / $250) to live Whop plan IDs', () => {
    expect(normalizeAddonPackId('addon_25')).toBe('addon_25')
    expect(normalizeAddonPackId('$100')).toBe('addon_100')
    expect(normalizeAddonPackId('250')).toBe('addon_250')
    expect(normalizeAddonPackId('invalid')).toBeNull()

    expect(isValidAddonPack('addon_25')).toBe(true)
    expect(isValidAddonPack('addon_100')).toBe(true)
    expect(isValidAddonPack('addon_250')).toBe(true)

    expect(ADDON_PACK_CATALOG.addon_25.priceUsd).toBe(25)
    expect(ADDON_PACK_CATALOG.addon_25.credits).toBe(2000)
    expect(ADDON_PACK_CATALOG.addon_100.priceUsd).toBe(100)
    expect(ADDON_PACK_CATALOG.addon_100.credits).toBe(9000)
    expect(ADDON_PACK_CATALOG.addon_250.priceUsd).toBe(250)
    expect(ADDON_PACK_CATALOG.addon_250.credits).toBe(25000)

    for (const pack of Object.values(ADDON_PACK_CATALOG)) {
      const planId = getWhopAddonPlanId(pack.id)
      expect(planId).toMatch(/^plan_/)
      expect(getAddonPackFromWhopPlanId(planId!)?.id).toBe(pack.id)
    }
  })

  it('builds Whop Checkout V2 purchase URLs with prefilled buyer email', () => {
    const url = buildWhopPurchaseUrl(
      'https://whop.com/checkout/ch_l2x9jlCatzeVEqR/',
      'ch_l2x9jlCatzeVEqR',
      'alex@sceneflowai.studio'
    )
    expect(url).toBe(
      'https://whop.com/checkout/ch_l2x9jlCatzeVEqR/?email=alex%40sceneflowai.studio'
    )

    const fallbackUrl = buildWhopPurchaseUrl(null, 'ch_test123', null)
    expect(fallbackUrl).toBe('https://whop.com/checkout/ch_test123/')
  })
})

describe('POST /api/auth/register — Production Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a new user in production, derives username from name, and sets auth_token cookie', async () => {
    const { AuthService } = await import('@/services/AuthService')
    const { POST } = await import('@/app/api/auth/register/route')

    vi.mocked(AuthService.register).mockResolvedValueOnce({
      success: true,
      user: {
        id: 'user-uuid-123',
        email: 'alex@sceneflowai.studio',
        username: 'alex',
        first_name: 'Alex',
        last_name: 'Rivera',
      },
      token: 'jwt-token-xyz',
    })

    const req = new NextRequest('https://sceneflowai.studio/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Rivera',
        email: 'Alex@SceneFlowAI.studio',
        password: 'securePassword123',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user.email).toBe('alex@sceneflowai.studio')
    expect(json.user.name).toBe('Alex Rivera')
    expect(json.token).toBe('jwt-token-xyz')
    expect(res.headers.get('Set-Cookie')).toContain('auth_token=jwt-token-xyz')

    expect(AuthService.register).toHaveBeenCalledWith({
      email: 'alex@sceneflowai.studio',
      username: 'Alex',
      password: 'securePassword123',
      first_name: 'Alex',
      last_name: 'Rivera',
    })
  })

  it('returns 409 when email is already registered', async () => {
    const { AuthService } = await import('@/services/AuthService')
    const { POST } = await import('@/app/api/auth/register/route')

    vi.mocked(AuthService.register).mockResolvedValueOnce({
      success: false,
      error: 'Email already registered',
    })

    const req = new NextRequest('https://sceneflowai.studio/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Rivera',
        email: 'alex@sceneflowai.studio',
        password: 'securePassword123',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Email already registered')
  })
})

