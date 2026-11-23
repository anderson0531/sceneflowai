/**
 * @vitest-environment jsdom
 */

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateCheckoutConfig = vi.fn()
const mockCreateClientIntakeLink = vi.fn()
const mockCreateContinuityLink = vi.fn()
const mockSendEmail = vi.fn()
const mockNotifyUser = vi.fn()
const mockFindCollabSession = vi.fn()
const mockFindProject = vi.fn()

vi.mock('@/lib/billing/checkoutHelper', () => ({
  buildWhopPurchaseUrl: (raw: string | null | undefined, sessionId: string, email?: string | null) => {
    const base = raw && raw.startsWith('https://') ? raw : `https://whop.com/checkout/${sessionId}/`
    const url = new URL(base)
    if (email) url.searchParams.set('email', email)
    return url.toString()
  },
}))

vi.mock('@/config/database', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/models', () => ({}))

vi.mock('@/models/CollabSession', () => ({
  default: {
    findOne: (...args: unknown[]) => mockFindCollabSession(...args),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue([1]),
  },
}))

vi.mock('@/models/Project', () => ({
  default: {
    findByPk: (...args: unknown[]) => mockFindProject(...args),
    create: vi.fn(),
  },
}))

vi.mock('@/models/User', () => ({
  default: {
    findOne: vi.fn().mockResolvedValue({ id: 'owner-showcase-1' }),
  },
}))

vi.mock('@/lib/billing/whopClient', () => ({
  ensureWhopRuntimeConfig: vi.fn().mockResolvedValue(undefined),
  getWhopCompanyId: () => 'biz_test_company',
  getWhopClient: () => ({
    checkoutConfigurations: {
      create: (...args: unknown[]) => mockCreateCheckoutConfig(...args),
    },
    payments: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  }),
}))

vi.mock('@/lib/intake/intakeService', () => ({
  createClientIntakeLink: (...args: unknown[]) => mockCreateClientIntakeLink(...args),
}))

vi.mock('@/lib/continuity/continuityPortalService', () => ({
  createOrUpdateContinuityPortalLink: (...args: unknown[]) => mockCreateContinuityLink(...args),
}))

vi.mock('@/lib/intake/automatedClientBlueprint', () => ({
  sendAutomatedClientPortalEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/jobs/jobService', () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}))

vi.mock('@/lib/database/migrateProducerPlatform', () => ({
  ensureProducerPlatformSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/blueprint/shareSession', () => ({
  resolveBlueprintShareByToken: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/blueprint/shareAuth', () => ({
  sessionDbId: (s: any) => s?.id || 'sess-id',
}))

import {
  EXPRESS_BLUEPRINT_PASS_USD,
  EXPRESS_SHOWCASE_OFFERS,
  SHOWCASE_BRAND_SNAPSHOT,
  getShowcaseOfferById,
} from '@/config/showcase/expressCinemaCatalog'
import {
  createWhopExpressCheckoutSession,
  fulfillExpressBlueprintPassOrder,
  fulfillExpressFilmBalanceOrder,
} from '@/lib/showcase/expressShowcaseService'
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import { KeepsakeCinemaStorefront } from '@/components/showcase/KeepsakeCinemaStorefront'
import { isPublicRoute } from '@/constants/publicRoutes'
import {
  SHOWCASE_LOCALE_COPY,
  getLocalizedShowcaseVideoUrl,
} from '@/config/showcase/showcaseLocaleCopy'
import { SUPPORTED_CLIENT_PORTAL_LOCALES } from '@/lib/intake/clientPortalCopy'
import { formatLandingCurrency } from '@/lib/i18n/landingCurrency'

describe('Express 4K Cinema Showcase Catalog & Whop MoR Fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.WHOP_PLAN_EXPRESS_BLUEPRINT_29
    delete process.env.WHOP_PLAN_BLUEPRINT_PASS_29
    mockSendEmail.mockResolvedValue(true)
    mockNotifyUser.mockResolvedValue({ ok: true })
  })

  it('covers 4 milestone occasions (legacy, weddings, graduations, retirements) and 3 commercial Express 4K offers with clean pricing math', () => {
    const milestones = EXPRESS_SHOWCASE_OFFERS.filter((o) => o.category === 'milestones')
    const commercial = EXPRESS_SHOWCASE_OFFERS.filter((o) => o.category === 'commercial')

    expect(milestones.map((o) => o.id)).toEqual([
      'family_legacy',
      'wedding_love',
      'graduation_milestone',
      'retirement_tribute',
    ])
    expect(commercial.map((o) => o.id)).toEqual([
      'real_estate_express',
      'brand_express',
      'training_express',
    ])

    for (const offer of EXPRESS_SHOWCASE_OFFERS) {
      expect(offer.blueprintPassUsd).toBe(EXPRESS_BLUEPRINT_PASS_USD)
      expect(offer.balanceDueUsd).toBe(offer.totalPriceUsd - offer.blueprintPassUsd)
      expect(offer.sampleVideoUrl).toMatch(/^\/landing\/video-services\/videos\/.+\.mp4$/)
      expect(offer.title.toLowerCase()).not.toContain('full-motion')
    }

    // Transparently attributes SceneFlow Studio for Google-for-Startups & SaaS clarity
    expect(SHOWCASE_BRAND_SNAPSHOT.hideSceneFlowBranding).toBe(false)
    expect(getShowcaseOfferById('graduation_milestone').title).toContain('Graduation')
  })

  it('creates an inline Whop MoR one-time checkout session when no pre-configured plan ID env var is set', async () => {
    mockCreateCheckoutConfig.mockResolvedValue({
      id: 'ch_test_123',
      purchase_url: 'https://whop.com/checkout/ch_test_123/',
    })

    const res = await createWhopExpressCheckoutSession({
      orderId: 'exp_abc',
      orderKind: 'express_blueprint_pass',
      amountUsd: 29,
      title: 'Keepsake Cinema — Storyboard Blueprint Pass',
      description: 'Test blueprint pass',
      productExternalId: 'keepsake_blueprint_pass_graduation_milestone',
      customerEmail: 'buyer@example.com',
      origin: 'https://sceneflowai.studio',
      metadata: { order_kind: 'express_blueprint_pass', showcase_order_id: 'exp_abc' },
    })

    expect(res.sessionId).toBe('ch_test_123')
    expect(res.purchaseUrl).toContain('https://whop.com/checkout/ch_test_123/')
    expect(res.purchaseUrl).toContain('email=buyer%40example.com')

    const callArg = mockCreateCheckoutConfig.mock.calls[0][0]
    expect(callArg.mode).toBe('payment')
    expect(callArg.plan.company_id).toBe('biz_test_company')
    expect(callArg.plan.plan_type).toBe('one_time')
    expect(callArg.plan.initial_price).toBe(29)
    expect(callArg.redirect_url).toBe(
      'https://www.sceneflowai.studio/showcase/order/exp_abc?checkout=success'
    )
  })

  it('fulfills paid $29 Blueprint Pass order idempotently and launches Express 4K intake', async () => {
    const orderSession: any = {
      token: 'exp_order_1',
      payload: {
        type: 'express_showcase_order',
        orderId: 'exp_order_1',
        orderKind: 'express_blueprint_pass',
        status: 'pending_payment',
        offerId: 'wedding_love',
        vertical: 'video_memoir',
        locale: 'en',
        customerName: 'Claire Bennett',
        customerEmail: 'claire@example.com',
        honoreeOrTitle: 'Claire & Daniel',
        amountUsd: 29,
        totalPriceUsd: 149,
        balanceDueUsd: 120,
        projectId: 'proj-wedding-1',
        ownerUserId: 'owner-showcase-1',
        origin: 'https://sceneflowai.studio',
        createdAt: new Date().toISOString(),
      },
      update: vi.fn(async (patch: any) => {
        if (patch.payload) orderSession.payload = patch.payload
      }),
    }

    const mockProject: any = {
      id: 'proj-wedding-1',
      title: 'Claire & Daniel',
      metadata: { clientOrder: { isClientProject: true } },
      update: vi.fn(async (patch: any) => {
        if (patch.metadata) mockProject.metadata = patch.metadata
      }),
    }

    mockFindCollabSession.mockResolvedValue(orderSession)
    mockFindProject.mockResolvedValue(mockProject)
    mockCreateClientIntakeLink.mockResolvedValue({
      token: 'intake_tok_1',
      sessionId: 'sess_1',
      projectId: 'proj-wedding-1',
      hostedUrl: 'https://sceneflowai.studio/intake/intake_tok_1?lang=en',
    })

    const first = await fulfillExpressBlueprintPassOrder({
      orderId: 'exp_order_1',
      whopPaymentId: 'pay_whop_1',
    })
    expect(first.ok).toBe(true)
    expect(first.alreadyFulfilled).toBe(false)
    expect(first.intakeUrl).toBe('https://sceneflowai.studio/intake/intake_tok_1?lang=en')
    expect(mockCreateClientIntakeLink).toHaveBeenCalledTimes(1)
    expect(mockCreateClientIntakeLink.mock.calls[0][0].deliveryTier).toBe('express_cinema_4k')
    expect(mockCreateClientIntakeLink.mock.calls[0][0].expressReleaseMode).toBe(
      'supervised_pm_release'
    )
    expect(mockCreateClientIntakeLink.mock.calls[0][0].skipCommercialAddendumCheck).toBe(true)

    // Duplicate Whop webhook must be a clean no-op
    const second = await fulfillExpressBlueprintPassOrder({
      orderId: 'exp_order_1',
      whopPaymentId: 'pay_whop_1',
    })
    expect(second.ok).toBe(true)
    expect(second.alreadyFulfilled).toBe(true)
    expect(mockCreateClientIntakeLink).toHaveBeenCalledTimes(1)
  })

  it('fulfills paid $120 Express Balance order idempotently and emails Continuity Library link', async () => {
    const balanceSession: any = {
      token: 'expbal_order_2',
      payload: {
        type: 'express_showcase_order',
        orderId: 'expbal_order_2',
        orderKind: 'express_film_balance',
        status: 'pending_payment',
        offerId: 'retirement_tribute',
        vertical: 'video_memoir',
        locale: 'en',
        customerName: 'Robert Hayes',
        customerEmail: 'robert@example.com',
        amountUsd: 120,
        totalPriceUsd: 149,
        balanceDueUsd: 120,
        projectId: 'proj-retire-1',
        ownerUserId: 'owner-showcase-1',
        origin: 'https://sceneflowai.studio',
        createdAt: new Date().toISOString(),
      },
      update: vi.fn(async (patch: any) => {
        if (patch.payload) balanceSession.payload = patch.payload
      }),
    }

    const mockProject: any = {
      id: 'proj-retire-1',
      title: 'Captain Robert Hayes — 35 Years',
      metadata: { clientOrder: { isClientProject: true } },
      update: vi.fn(async (patch: any) => {
        if (patch.metadata) mockProject.metadata = patch.metadata
      }),
    }

    mockFindCollabSession.mockResolvedValue(balanceSession)
    mockFindProject.mockResolvedValue(mockProject)
    mockCreateContinuityLink.mockResolvedValue({
      token: 'cont_tok_1',
      url: 'https://sceneflowai.studio/share/continuity/cont_tok_1',
    })

    const first = await fulfillExpressFilmBalanceOrder({
      orderId: 'expbal_order_2',
      whopPaymentId: 'pay_whop_2',
    })
    expect(first.ok).toBe(true)
    expect(first.alreadyFulfilled).toBe(false)
    expect(first.continuityUrl).toBe('https://sceneflowai.studio/share/continuity/cont_tok_1')
    expect(mockCreateContinuityLink).toHaveBeenCalledTimes(1)
    expect(mockCreateContinuityLink.mock.calls[0][0].project).toBe(mockProject)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].toEmail).toBe('robert@example.com')
    expect(mockProject.metadata.clientOrder.stage).toBe('continuity_sent')

    const second = await fulfillExpressFilmBalanceOrder({
      orderId: 'expbal_order_2',
      whopPaymentId: 'pay_whop_2',
    })
    expect(second.ok).toBe(true)
    expect(second.alreadyFulfilled).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('KeepsakeCinemaStorefront UI', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    window.localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders Life Milestone occasions, switches to Business & Property, and opens Whop Checkout modal', () => {
    act(() => {
      root.render(React.createElement(KeepsakeCinemaStorefront))
    })

    const text = container.textContent || ''
    expect(text).toContain('Keepsake Cinema')
    expect(text).toContain('Live White-Label Reference Storefront')
    expect(text).toContain('Produce films in 70+ languages (7 portal UIs)')
    expect(text).toContain('100% private photos — never used to train AI')
    expect(text).toContain('Payments processed by Whop')
    expect(text).toContain('Life Stories & Family Memoirs, Weddings, Graduations, and more')
    // Redundant wedding/graduation duplicate-video cards are removed from the storefront grid
    expect(container.querySelector('[data-testid="offer-card-wedding_love"]')).toBeNull()
    expect(container.querySelector('[data-testid="offer-card-graduation_milestone"]')).toBeNull()
    expect(container.querySelector('[data-testid="offer-card-retirement_tribute"]')).toBeNull()
    // Real Estate, Brand Story, and Training examples are immediately visible in the 2x2 grid
    expect(text).toContain('Express 4K Property Listing Film')
    expect(text).toContain('Express 4K Founder & Practice Film')
    expect(text).toContain('Express 4K Narrated Training & SOP Film')
    expect(
      container.querySelector('[data-testid="offer-card-family_legacy"] video')?.getAttribute('src')
    ).toBe('/landing/video-services/videos/express-memoir-en.mp4')
    expect(
      container.querySelector('[data-testid="offer-card-real_estate_express"] video')?.getAttribute('src')
    ).toBe('/landing/video-services/videos/express-realestate-en.mp4')
    expect(
      container.querySelector('[data-testid="offer-card-brand_express"] video')?.getAttribute('src')
    ).toBe('/landing/video-services/videos/express-brand-en.mp4')
    expect(
      container.querySelector('[data-testid="offer-card-training_express"] video')?.getAttribute('src')
    ).toBe('/landing/video-services/videos/express-training-en.mp4')

    // Filter to Business & Property tab only
    const bizBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Business & Property')
    )
    expect(bizBtn).toBeTruthy()
    act(() => {
      bizBtn!.click()
    })
    expect(container.textContent).toContain('Express 4K Property Listing Film')
    expect(container.textContent).toContain('Express 4K Founder & Practice Film')
    expect(container.textContent).toContain('Express 4K Narrated Training & SOP Film')
    expect(container.querySelector('[data-testid="offer-card-family_legacy"]')).toBeNull()

    // Open Whop Checkout modal
    const startBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start My $29 Storyboard Blueprint')
    )
    expect(startBtn).toBeTruthy()
    act(() => {
      startBtn!.click()
    })
    expect(container.querySelector('[role="dialog"]')).toBeTruthy()
    expect(container.textContent).toContain('Continue to Secure Checkout — $29')
    expect(container.textContent).toContain('70+ languages')

    // Public route guard ensures /showcase and /showcase/order/* never render GlobalHeader or MobileAppGate
    expect(isPublicRoute('/showcase')).toBe(true)
    expect(isPublicRoute('/showcase/order/exp_abc123')).toBe(true)
  })

  it('supports all 7 languages (en, es, pt, hi, zh-CN, ar, th) with localized currency, videos, and Arabic RTL', () => {
    const expectedCodes = ['en', 'es', 'pt', 'hi', 'zh-CN', 'ar', 'th']
    expect(SUPPORTED_CLIENT_PORTAL_LOCALES.map((l) => l.code)).toEqual(expectedCodes)

    for (const loc of SUPPORTED_CLIENT_PORTAL_LOCALES) {
      const pack = SHOWCASE_LOCALE_COPY[loc.code]
      expect(pack, `pack for ${loc.code}`).toBeDefined()
      expect(pack.theater.tabs).toHaveLength(4)
      expect(pack.steps.items).toHaveLength(3)
      expect(pack.faq.items.length).toBeGreaterThanOrEqual(6)
      for (const offer of EXPRESS_SHOWCASE_OFFERS) {
        const offerCopy = pack.occasions.offers[offer.id]
        expect(offerCopy.title.trim().length, `${loc.code} ${offer.id} title`).toBeGreaterThan(3)
        expect(offerCopy.deliverables).toHaveLength(4)
      }
    }

    expect(getLocalizedShowcaseVideoUrl('memoir', 'zh-CN')).toBe(
      '/landing/video-services/videos/express-memoir-zh.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('realestate', 'ar')).toBe(
      '/landing/video-services/videos/express-realestate-ar.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('brand', 'th')).toBe(
      '/landing/video-services/videos/express-brand-th.mp4'
    )

    // Interactive language switcher in UI: switch to Spanish (MXN) -> Arabic (SAR + RTL) -> Thai (THB)
    act(() => {
      root.render(React.createElement(KeepsakeCinemaStorefront))
    })

    const openLangMenu = () => {
      const btn = container.querySelector('button[aria-label="Select language and currency"]') as HTMLButtonElement
      expect(btn).toBeTruthy()
      act(() => btn.click())
    }

    const pickLang = (label: string) => {
      openLangMenu()
      const item = Array.from(container.querySelectorAll('[role="menuitem"]')).find((el) =>
        el.textContent?.includes(label)
      ) as HTMLButtonElement | undefined
      expect(item, `menu item ${label}`).toBeTruthy()
      act(() => item!.click())
    }

    pickLang('Español')
    expect(container.textContent).toContain(formatLandingCurrency(29, 'es'))
    expect(container.textContent).toContain(formatLandingCurrency(149, 'es'))
    expect(container.querySelector('[lang="es"]')?.getAttribute('dir')).toBe('ltr')

    pickLang('العربية')
    expect(container.textContent).toContain(formatLandingCurrency(29, 'ar'))
    expect(container.querySelector('[lang="ar"]')?.getAttribute('dir')).toBe('rtl')
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/express-memoir-ar.mp4'
    )

    pickLang('ไทย')
    expect(container.textContent).toContain(formatLandingCurrency(149, 'th'))
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/express-memoir-th.mp4'
    )
  })

  it('toggles 4K Cinema and Full-Motion videos in the Hero and Milestone cards, and renders high-contrast Start $29 Blueprint buttons', () => {
    expect(getLocalizedShowcaseVideoUrl('memoir', 'en', 'express4k')).toBe(
      '/landing/video-services/videos/express-memoir-en.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('memoir', 'en', 'fullMotion')).toBe(
      '/landing/video-services/videos/memoir-en.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('brand', 'zh-CN', 'fullMotion')).toBe(
      '/landing/video-services/videos/brand-zh.mp4'
    )

    act(() => {
      root.render(React.createElement(KeepsakeCinemaStorefront))
    })

    // Hero video starts in Express 4K Cinema mode
    const heroVideo = container.querySelector('video')
    expect(heroVideo?.getAttribute('src')).toBe('/landing/video-services/videos/express-memoir-en.mp4')

    // Every Milestone card renders a <video> (not an <img>) and a readable gold Start $29 Blueprint button
    const legacyCard = container.querySelector('[data-testid="offer-card-family_legacy"]')
    expect(legacyCard).toBeTruthy()
    expect(legacyCard?.querySelector('img')).toBeNull()
    expect(legacyCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/express-memoir-en.mp4'
    )

    const cardCta = Array.from(legacyCard!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start $29 Blueprint')
    )
    expect(cardCta).toBeTruthy()
    expect(cardCta!.className).toContain('!text-[#090B12]')
    expect(cardCta!.className).not.toContain('bg-white')

    // Per-card toggle switches just that card to Full-Motion while Hero stays 4K Cinema
    const cardFullMotionBtn = Array.from(legacyCard!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Full Motion'
    )
    expect(cardFullMotionBtn).toBeTruthy()
    act(() => {
      cardFullMotionBtn!.click()
    })
    expect(legacyCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/memoir-en.mp4'
    )
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/express-memoir-en.mp4'
    )

    // Global Hero format toggle switches Hero & all cards to Full-Motion preview
    const heroToggle = container.querySelector('[data-testid="hero-format-toggle"]')
    const heroFullMotionBtn = Array.from(heroToggle!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Full Motion')
    )
    expect(heroFullMotionBtn).toBeTruthy()
    act(() => {
      heroFullMotionBtn!.click()
    })
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/memoir-en.mp4'
    )
    const brandCard = container.querySelector('[data-testid="offer-card-brand_express"]')
    expect(brandCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/brand-en.mp4'
    )
    const realEstateCard = container.querySelector('[data-testid="offer-card-real_estate_express"]')
    expect(realEstateCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/realestate-en.mp4'
    )
    const trainingCard = container.querySelector('[data-testid="offer-card-training_express"]')
    expect(trainingCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/landing/video-services/videos/training-en.mp4'
    )
  })
})
