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
import ShowcaseStorefrontPage from '@/app/showcase/page'
import { isPublicRoute } from '@/constants/publicRoutes'
import {
  SHOWCASE_LOCALE_COPY,
  getLocalizedShowcaseVideoUrl,
} from '@/config/showcase/showcaseLocaleCopy'
import { SHOWCASE_CONVERSION_COPY } from '@/config/showcase/showcaseConversionCopy'
import { LONGFORM_CRAFT_COPY } from '@/config/showcase/longformCraftCopy'
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
      expect(offer.sampleVideoUrl).toMatch(/^(?:\/landing\/video-services)?\/videos\/.+\.mp4$/)
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
    expect(text).toContain('14 native UI portals · Culturally localized 4K masters in 70+ languages')
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
    ).toBe('/videos/video-memoir-trailer-4k.mp4')
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

  it('supports all 14 base UI languages with localized currency, videos, and Arabic RTL', () => {
    const expectedCodes = [
      'en',
      'es',
      'pt',
      'hi',
      'zh-CN',
      'ar',
      'th',
      'ja',
      'ko',
      'de',
      'fr',
      'it',
      'nl',
      'ru',
    ]
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
      '/videos/video-memoir-trailer-4k-zh.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('realestate', 'ar')).toBe(
      '/landing/video-services/videos/express-realestate-ar.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('brand', 'th')).toBe(
      '/landing/video-services/videos/express-brand-th.mp4'
    )
    // New base UI locales fall back cleanly to English master demo videos until dubbed
    expect(getLocalizedShowcaseVideoUrl('memoir', 'ja')).toBe('/videos/video-memoir-trailer-4k.mp4')
    expect(getLocalizedShowcaseVideoUrl('realestate', 'de')).toBe(
      '/landing/video-services/videos/express-realestate-en.mp4'
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
      '/videos/video-memoir-trailer-4k-ar.mp4'
    )

    pickLang('ไทย')
    expect(container.textContent).toContain(formatLandingCurrency(149, 'th'))
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/videos/video-memoir-trailer-4k-th.mp4'
    )

    pickLang('日本語')
    expect(container.textContent).toContain(formatLandingCurrency(149, 'ja'))
    expect(container.querySelector('[lang="ja"]')?.getAttribute('dir')).toBe('ltr')
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/videos/video-memoir-trailer-4k.mp4'
    )

    pickLang('Deutsch')
    expect(container.textContent).toContain(formatLandingCurrency(149, 'de'))
    expect(container.querySelector('[lang="de"]')?.getAttribute('dir')).toBe('ltr')
  })

  it('toggles 4K Cinema and Full-Motion videos in the Hero and Milestone cards, and renders high-contrast Start $29 Blueprint buttons', () => {
    expect(getLocalizedShowcaseVideoUrl('memoir', 'en', 'express4k')).toBe(
      '/videos/video-memoir-trailer-4k.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('memoir', 'en', 'fullMotion')).toBe(
      '/videos/video-memoir-trailer.mp4'
    )
    expect(getLocalizedShowcaseVideoUrl('brand', 'zh-CN', 'fullMotion')).toBe(
      '/landing/video-services/videos/brand-zh.mp4'
    )

    act(() => {
      root.render(React.createElement(KeepsakeCinemaStorefront))
    })

    // Hero video starts in Express 4K Cinema mode (Harbor Books)
    const heroVideo = container.querySelector('video')
    expect(heroVideo?.getAttribute('src')).toBe('/videos/video-memoir-trailer-4k.mp4')

    // Every Milestone card renders a <video> plus a static SSR poster <img> and a high-contrast "Start a film like this" button
    const legacyCard = container.querySelector('[data-testid="offer-card-family_legacy"]')
    expect(legacyCard).toBeTruthy()
    expect(legacyCard?.querySelector('img')?.getAttribute('src')).toBe(
      '/images/trailers/video-memoir-poster.webp'
    )
    expect(legacyCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/videos/video-memoir-trailer-4k.mp4'
    )

    const cardCta = Array.from(legacyCard!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start a film like this')
    )
    expect(cardCta).toBeTruthy()
    expect(cardCta!.className).toContain('!text-[#090B12]')
    expect(cardCta!.className).not.toContain('bg-white')

    // Per-card toggle switches just that card to Full-Motion while Hero stays 4K Cinema
    const cardFullMotionBtn = Array.from(legacyCard!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Full Motion · PM Directed')
    )
    expect(cardFullMotionBtn).toBeTruthy()
    act(() => {
      cardFullMotionBtn!.click()
    })
    expect(legacyCard?.querySelector('video')?.getAttribute('src')).toBe(
      '/videos/video-memoir-trailer.mp4'
    )
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/videos/video-memoir-trailer-4k.mp4'
    )

    // Global Hero format toggle uses Tiered Studio Ladder labels & helper microcopy
    const heroToggle = container.querySelector('[data-testid="hero-format-toggle"]')
    expect(heroToggle?.textContent).toContain('Express 4K Cinema · Automated ($149–$249)')
    expect(heroToggle?.textContent).toContain('Full-Motion Cinema · Studio PM Directed (Preview)')
    expect(container.querySelector('[data-testid="studio-ladder-helper"]')?.textContent).toContain(
      '100% Automated Same-Day Master'
    )

    const heroFullMotionBtn = Array.from(heroToggle!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Full-Motion Cinema')
    )
    expect(heroFullMotionBtn).toBeTruthy()
    act(() => {
      heroFullMotionBtn!.click()
    })
    expect(container.querySelector('[data-testid="studio-ladder-helper"]')?.textContent).toContain(
      'Studio Director Tier (Preview)'
    )
    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      '/videos/video-memoir-trailer.mp4'
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

  it('renders interactive Longform 4K Craft, Cultural World-Building Tiles, Immediate-Lift Engines & 14-Portal Positioning across all 14 languages', () => {
    for (const loc of SUPPORTED_CLIENT_PORTAL_LOCALES) {
      const pack = LONGFORM_CRAFT_COPY[loc.code]
      expect(pack, `craft pack for ${loc.code}`).toBeDefined()
      expect(pack.pillars).toHaveLength(6)
      expect(pack.comparisonRows).toHaveLength(6)
      expect(pack.trailerSpotlight.headline.length).toBeGreaterThan(10)
      expect(pack.immediateLift.cards).toHaveLength(3)
      expect(pack.immediateLift.cards.map((c) => c.id)).toEqual([
        'multi_perspective_audio',
        'qr_print_companion',
        'living_continuity_vault',
      ])
      expect(pack.immediateLift.cards[2].accessNote?.trim().length).toBeGreaterThan(10)

      const storefrontPack = SHOWCASE_LOCALE_COPY[loc.code]
      expect(storefrontPack.faq.items.length).toBeGreaterThanOrEqual(7)
      expect(storefrontPack.hero.trustLanguages).not.toMatch(/7 portal|7-language/i)
      expect(storefrontPack.hero.trustLanguages).toContain('14')

      const convPack = SHOWCASE_CONVERSION_COPY[loc.code]
      expect(convPack.operatorFooter.heading).toContain('14')
      expect(convPack.operatorFooter.body).toContain('70')
    }

    act(() => {
      root.render(React.createElement(KeepsakeCinemaStorefront))
    })

    const showcaseSection = container.querySelector(
      '[data-testid="longform-craft-showcase-storefront"]'
    )
    expect(showcaseSection).toBeTruthy()
    expect(showcaseSection?.textContent).toContain('Theatrical Trailer')
    expect(showcaseSection?.textContent).toContain('90%+ Target Audience Resonance')
    expect(showcaseSection?.textContent).toContain('Shortform AI Clip Generators')

    // Click Character Continuity pillar (28-year-old Grandfather)
    const agingTab = Array.from(showcaseSection!.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Age-28')
    ) as HTMLButtonElement | undefined
    expect(agingTab).toBeTruthy()
    act(() => agingTab!.click())
    expect(
      showcaseSection?.querySelector('[data-testid="active-craft-pillar-panel"]')?.textContent
    ).toContain('28-Year-Old Grandfather')

    // Click Tile B: Continuity-Locked Active Scenes & Cultural Staging
    const stagingTab = Array.from(showcaseSection!.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Active Scenes & Cultural Staging')
    ) as HTMLButtonElement | undefined
    expect(stagingTab).toBeTruthy()
    act(() => stagingTab!.click())
    expect(
      showcaseSection?.querySelector('[data-testid="active-craft-pillar-panel"]')?.textContent
    ).toContain('Unphotographed Moments, Staged With Cultural Authenticity')

    // Click Tile A: Localized Era & Cultural Time-Capsule Engine
    const timeCapsuleTab = Array.from(showcaseSection!.querySelectorAll('[role="tab"]')).find(
      (el) => el.textContent?.includes('Era & Cultural Time-Capsule')
    ) as HTMLButtonElement | undefined
    expect(timeCapsuleTab).toBeTruthy()
    act(() => timeCapsuleTab!.click())
    expect(
      showcaseSection?.querySelector('[data-testid="active-craft-pillar-panel"]')?.textContent
    ).toContain('Period & Regional Context That Brings History Alive')

    // Verify 3 Immediate-Lift Consumer & Operator Engine cards render with Continuity Library Code note
    const liftGrid = showcaseSection?.querySelector('[data-testid="showcase-immediate-lift-grid"]')
    expect(liftGrid).toBeTruthy()
    expect(liftGrid?.textContent).toContain('Multi-Perspective Audio Tracks')
    expect(liftGrid?.textContent).toContain('QR-Linked Print Companion PDF')
    expect(liftGrid?.textContent).toContain('Living Continuity Vault')
    expect(liftGrid?.textContent).toContain('Continuity Library Code')

    // Verify Localized Intelligence Edge bullets appear on all 4 vertical cards
    expect(container.querySelector('[data-testid="offer-card-family_legacy"]')?.textContent).toContain(
      'regional & decade-specific cultural/economic context'
    )
    expect(
      container.querySelector('[data-testid="offer-card-real_estate_express"]')?.textContent
    ).toContain('virtual furniture updates, active neighborhood lifestyle staging')
    expect(container.querySelector('[data-testid="offer-card-brand_express"]')?.textContent).toContain(
      'local founding-era historical context & active patient/client care scene staging'
    )
    expect(
      container.querySelector('[data-testid="offer-card-training_express"]')?.textContent
    ).toContain('localized workplace safety/equipment scenario staging adapted to regional compliance')

    // Verify 14 Native Portals × 70+ Culturally Localized Masters copy in FAQ and Operator Footer
    expect(container.textContent).toContain(
      'Operate in 14 Native Portals. Produce Culturally Authentic Films in 70+ Languages.'
    )

    // Click Heirloom Props pillar (family Bible)
    const propTab = Array.from(showcaseSection!.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes('Signature Props')
    ) as HTMLButtonElement | undefined
    expect(propTab).toBeTruthy()
    act(() => propTab!.click())
    expect(
      showcaseSection?.querySelector('[data-testid="active-craft-pillar-panel"]')?.textContent
    ).toContain('Family Bible')
  })

  it('implements all 4 high-impact conversion optimizations (brand framing, SSR pre-render without spinner, reel anchors, and same-day delivery window)', async () => {
    // 1. All 7 locales have complete conversion, Studio Ladder, and white-label operator copy
    for (const loc of SUPPORTED_CLIENT_PORTAL_LOCALES) {
      const c = SHOWCASE_CONVERSION_COPY[loc.code]
      expect(c, `conversion copy for ${loc.code}`).toBeDefined()
      expect(c.operatorBar.badge.length).toBeGreaterThan(10)
      expect(c.studioLadder.expressTabLabel.length).toBeGreaterThan(8)
      expect(c.studioLadder.fullMotionTabLabel.length).toBeGreaterThan(8)
      expect(c.nichePresetCallout.length).toBeGreaterThan(20)
      expect(c.fullMotionUpgrade.heading.length).toBeGreaterThan(10)
      expect(c.operatorFooter.heading.length).toBeGreaterThan(10)
      expect(c.artisanSuperpower.length).toBeGreaterThan(20)
      expect(c.startLikeThisCta.length).toBeGreaterThan(4)
      expect(c.deliveryWindow.requirements.length).toBeGreaterThan(10)
      expect(c.reelAnchors.memoir.occasion.length).toBeGreaterThan(5)
      expect(c.reelAnchors.realestate.inputRequired.length).toBeGreaterThan(5)
      expect(c.reelAnchors.brand.occasion.length).toBeGreaterThan(5)
      expect(c.reelAnchors.training.inputRequired.length).toBeGreaterThan(5)
    }

    // 2. Server page resolves locale without wrapping in a Suspense loading spinner
    const pageEl = await ShowcaseStorefrontPage({
      searchParams: Promise.resolve({ lang: 'en' }),
    })
    act(() => {
      root.render(pageEl)
    })

    expect(container.textContent).not.toContain('Loading Keepsake Cinema')

    // Dismissible Top Operator Demo Bar sits cleanly above <header> and dismisses to leave pure Keepsake Cinema
    const operatorBar = container.querySelector('[data-testid="operator-demo-bar"]')
    expect(operatorBar).toBeTruthy()
    expect(operatorBar?.textContent).toContain(
      'Live White-Label Reference Storefront · Powered by SceneFlow Studio'
    )
    expect(operatorBar?.textContent).toContain('Launch Under Your Brand')

    const header = container.querySelector('header')
    expect(header).toBeTruthy()
    expect(header?.previousElementSibling).toBe(operatorBar)
    expect(header?.textContent).toContain('Keepsake Cinema')

    const dismissBtn = operatorBar?.querySelector(
      'button[aria-label="Dismiss operator demo banner"]'
    ) as HTMLButtonElement | null
    expect(dismissBtn).toBeTruthy()
    act(() => dismissBtn!.click())
    expect(container.querySelector('[data-testid="operator-demo-bar"]')).toBeNull()
    expect(header?.previousElementSibling).toBeNull()

    // Niche Presets callout above filter tabs, Studio Ladder tiers, PM Upgrade Callout, and Operator Footer Block
    expect(container.querySelector('[data-testid="niche-preset-callout"]')?.textContent).toContain(
      'supports multiple verticals out of the box'
    )
    const ladderTiers = container.querySelector('[data-testid="studio-ladder-tiers"]')
    expect(ladderTiers?.textContent).toContain('Express 4K Cinema ($149–$249 · Self-Serve Automated)')
    expect(ladderTiers?.textContent).toContain('Full-Motion Cinema (Studio Director Tier · Custom Quote)')

    const upgradeCallout = container.querySelector('[data-testid="full-motion-upgrade-callout"]')
    expect(upgradeCallout?.textContent).toContain(
      'Start Automated Today. Upgrade to PM-Directed Full Motion Anytime.'
    )
    expect(upgradeCallout?.textContent).toContain('Start My $29 Automated Blueprint')
    expect(upgradeCallout?.textContent).toContain('Request PM Full-Motion Upgrade')

    const operatorFooter = container.querySelector('[data-testid="white-label-operator-block"]')
    expect(operatorFooter?.textContent).toContain(
      'Operate in 14 Native Portals. Produce Culturally Authentic Films in 70+ Languages.'
    )
    expect(operatorFooter?.textContent).toContain('Launch Your Branded Studio on SceneFlow')
    expect(operatorFooter?.textContent).toContain('Book an Operator Walkthrough')

    // Quick Cleanup Checklist verifications:
    // A. Duplicate sub-footer paragraph removed from <footer>
    const footerEl = container.querySelector('footer')
    expect(footerEl).toBeTruthy()
    expect(footerEl?.textContent).not.toContain('This storefront runs 100% on SceneFlow Studio')

    // B. Only ONE primary format toggle above the fold in Hero section (on the Cinema Reel player)
    const heroSection = container.querySelector('section')
    const heroFormatButtons = Array.from(heroSection!.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Express 4K Cinema · Automated')
    )
    expect(heroFormatButtons).toHaveLength(1)

    // C. Distinct CTA destinations: Pro Signup link, PM Upgrade modal, and Operator Walkthrough modal
    const launchStudioLink = container.querySelector(
      '[data-testid="cta-launch-branded-studio"]'
    ) as HTMLAnchorElement | null
    expect(launchStudioLink?.getAttribute('href')).toContain('checkoutTier=pro')

    const pmUpgradeBtn = container.querySelector(
      '[data-testid="cta-request-pm-upgrade"]'
    ) as HTMLButtonElement | null
    expect(pmUpgradeBtn).toBeTruthy()
    act(() => pmUpgradeBtn!.click())
    expect(container.querySelector('[data-testid="pm-upgrade-modal"]')).toBeTruthy()
    const closePmBtn = container.querySelector(
      '[data-testid="pm-upgrade-modal"] button[aria-label="Close inquiry modal"]'
    ) as HTMLButtonElement | null
    act(() => closePmBtn!.click())
    expect(container.querySelector('[data-testid="pm-upgrade-modal"]')).toBeNull()

    const walkthroughBtn = container.querySelector(
      '[data-testid="cta-book-operator-walkthrough"]'
    ) as HTMLButtonElement | null
    expect(walkthroughBtn).toBeTruthy()
    act(() => walkthroughBtn!.click())
    expect(container.querySelector('[data-testid="operator-walkthrough-modal"]')).toBeTruthy()
    const closeWalkthroughBtn = container.querySelector(
      '[data-testid="operator-walkthrough-modal"] button[aria-label="Close inquiry modal"]'
    ) as HTMLButtonElement | null
    act(() => closeWalkthroughBtn!.click())
    expect(container.querySelector('[data-testid="operator-walkthrough-modal"]')).toBeNull()

    // Artisan behind-the-scenes superpower copy rendered in Hero
    expect(container.textContent).toContain(
      'Director-crafted pacing, accelerated by SceneFlow Studio for same-day delivery.'
    )

    // Storefront Craft Matrix brands column as Keepsake Cinema (not SceneFlow)
    const craftSection = container.querySelector(
      '[data-testid="longform-craft-showcase-storefront"]'
    )
    expect(craftSection?.textContent).toContain('Keepsake Cinema Longform 4K Cinema')

    // Hero static poster <img> pre-renders in initial HTML above the fold
    const heroPoster = container.querySelector('img[src="/images/trailers/video-memoir-poster.webp"]')
    expect(heroPoster).toBeTruthy()

    // 3. Same-Day Delivery Window indicator near primary CTA
    const deliveryBox = container.querySelector('[data-testid="same-day-delivery-window"]')
    expect(deliveryBox).toBeTruthy()
    expect(deliveryBox?.textContent).toContain('Same-Day Delivery Window')
    expect(deliveryBox?.textContent).toContain('15–40 phone photos')

    // 4. Hero reel conversion anchors (Occasion + Input Required + "Start a film like this")
    const heroBar = container.querySelector('[data-testid="hero-reel-conversion-bar"]')
    expect(heroBar).toBeTruthy()
    expect(heroBar?.textContent).toContain('50th Anniversary & Family Legacy')
    expect(heroBar?.textContent).toContain('Created from 35 phone photos + 4 voice notes')

    // Switch Hero reel to Real Estate and verify anchors update dynamically
    const realEstateReelTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Real Estate 4K')
    ) as HTMLButtonElement | undefined
    expect(realEstateReelTab).toBeTruthy()
    act(() => realEstateReelTab!.click())
    expect(heroBar?.textContent).toContain('Luxury Estate & MLS Showcase')
    expect(heroBar?.textContent).toContain('Created from 24 MLS listing photos + 1 property sheet')

    // Clicking "Start a film like this" in Hero bar opens checkout pre-selected to Real Estate
    const startHeroLikeThisBtn = Array.from(heroBar!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start a film like this')
    ) as HTMLButtonElement | undefined
    expect(startHeroLikeThisBtn).toBeTruthy()
    expect(startHeroLikeThisBtn!.className).toContain('!text-[#090B12]')
    act(() => startHeroLikeThisBtn!.click())
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.textContent).toContain('Express 4K Property Listing Film')
    expect((dialog?.querySelector('select') as HTMLSelectElement | null)?.value).toBe(
      'real_estate_express'
    )
  })
})
