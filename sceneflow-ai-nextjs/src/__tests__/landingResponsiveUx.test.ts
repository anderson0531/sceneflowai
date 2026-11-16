/**
 * @vitest-environment jsdom
 *
 * Comprehensive Desktop (1280px / 1440px) & Mobile (Samsung Galaxy S23 — 360px CSS width)
 * UI / Button Label / Tooltip / 7-Language Narrated Walkthrough & Panned-Screenshot Tests.
 */

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'fs'
import path from 'path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import { VideoServicesSpotlightSection } from '@/components/landing/VideoServicesSpotlightSection'
import { MobileCompanionPwaSection } from '@/components/landing/MobileCompanionPwaSection'
import { StudioDoorWalkthroughModal } from '@/components/landing/StudioDoorWalkthroughModal'
import { FeatureScreenshotFrame } from '@/components/landing/FeatureScreenshotFrame'
import {
  DOOR_WALKTHROUGH_COPY,
  ROOM_PANNED_SLIDES,
  featureRoomIdToMilestone,
  milestoneToFeatureRoomId,
  normalizeWalkthroughDubLocale,
} from '@/config/landing/doorWalkthroughCopy'
import { FEATURE_ROOM_IDS } from '@/config/landing/featureRoomMedia'
import { FEATURE_ROOM_SCRIPTS, type HeroDubLocaleId } from '@/config/landing/featureRoomScripts'
import {
  KEY_FEATURE_SCREENSHOTS,
  getKeyFeatureScreenshot,
  keyFeatureScreenshotSrc,
} from '@/config/landing/keyFeatureScreenshots'
import {
  FEATURE_PAN_UI_COPY,
  KEY_FEATURE_NARRATED_PAN,
  getKeyFeatureNarratedPan,
  normalizeFeaturePanLocale,
} from '@/config/landing/keyFeatureNarratedPan'
import {
  FEATURE_ANIMATIC_UI_COPY,
  KEY_FEATURE_SUITES,
  getKeyFeatureAnimaticMp4Path,
  getKeyFeatureAnimaticPosterPath,
  getKeyFeatureAnimaticWebmPath,
  getKeyFeatureChapterTiming,
} from '@/config/landing/keyFeatureAnimatics'
import {
  VIDEO_SERVICES_NARRATED_PAN,
  VIDEO_SERVICE_PAN_UI_COPY,
  type VideoServiceVerticalId,
} from '@/config/landing/videoServicesNarratedPan'
import {
  VIDEO_SERVICE_AVAILABLE_PROMO_LOCALES,
  VIDEO_SERVICE_PROMO_SCRIPTS,
  VIDEO_SERVICE_PROMO_SOURCE_BLOB_URLS,
  getVideoServicePromoMp4Path,
  getVideoServicePromoPosterPath,
  getVideoServicePromoWebmPath,
  hasNativePromoVideoForLocale,
  resolveAvailablePromoVideoLocale,
} from '@/config/landing/videoServicePromoScripts'
import { cleanOmniRefScenePrompt } from '@/lib/gemini/cleanOmniRefPrompt'
import { rewriteVisualNamesToTokens } from '@/lib/vision/referenceImageBinding'
import { resolveLocalizedStudioLandingCopy } from '@/config/landing/worldClassLandingCopy'

const ROOT = path.resolve(__dirname, '../..')

const PRIORITY_LOCALES = ['en', 'es', 'pt', 'hi', 'zh-CN', 'ar', 'th'] as const
const DUB_LOCALES: readonly HeroDubLocaleId[] = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th']

function loadMessages(locale: string): Record<string, any> {
  return JSON.parse(readFileSync(path.join(ROOT, 'messages', `${locale}.json`), 'utf8'))
}

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8')
}

/**
 * Estimates single-word pixel width for font-size in px so we verify no single word
 * overflows a button's inner text box on Samsung Galaxy S23 (360px) or Desktop (1280px+).
 * CJK characters wrap between any glyph; Latin/Arabic/Devanagari/Thai wrap on spaces.
 */
function countSpacingGlyphs(str: string): number {
  // Strip Unicode non-spacing combining marks (e.g. Thai/Hindi vowel & tone marks)
  return Array.from(str.replace(/\p{Mn}/gu, '')).length
}

function estimateLongestWordPx(label: string, fontSizePx: number, locale: string): number {
  if (locale.startsWith('zh')) {
    return Math.ceil(fontSizePx * 1.1)
  }
  if (locale === 'th' && typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('th', { granularity: 'word' })
    const segments = Array.from(seg.segment(label))
      .filter((s) => s.isWordLike)
      .map((s) => countSpacingGlyphs(s.segment))
    const maxLen = segments.reduce((m, n) => Math.max(m, n), 0)
    return Math.ceil(maxLen * fontSizePx * 0.56)
  }
  const words = label.trim().split(/[\s/·—–-]+/).filter(Boolean)
  const longestLen = words.reduce((max, w) => Math.max(max, countSpacingGlyphs(w)), 0)
  const avgGlyphRatio = locale === 'hi' || locale === 'ar' || locale === 'th' ? 0.58 : 0.6
  return Math.ceil(longestLen * fontSizePx * avgGlyphRatio)
}

let container: HTMLDivElement | null = null
let reactRoot: Root | null = null

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: () => Promise.resolve(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: () => {},
  })

  if (!window.IntersectionObserver) {
    class StubIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(window as unknown as Record<string, unknown>).IntersectionObserver = StubIntersectionObserver
  }

  container = document.createElement('div')
  document.body.appendChild(container)
  reactRoot = createRoot(container)
})

afterEach(() => {
  if (reactRoot) {
    act(() => {
      reactRoot?.unmount()
    })
    reactRoot = null
  }
  if (container) {
    container.remove()
    container = null
  }
  document.body.innerHTML = ''
})

function renderElement(element: React.ReactElement) {
  act(() => {
    reactRoot?.render(element)
  })
}

function clickElement(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

describe('Interim 7-Language Narrated Studio Door Walkthroughs & Panned 5K Screenshots', () => {
  it('aligns ROOM_PANNED_SLIDES 1:1 with FEATURE_ROOM_SCRIPTS beats and verifies all 5K screenshots exist on disk', () => {
    for (const roomId of FEATURE_ROOM_IDS) {
      const script = FEATURE_ROOM_SCRIPTS[roomId]
      const slides = ROOM_PANNED_SLIDES[roomId]
      expect(slides.length, `${roomId} slide count`).toBe(script.beatStartSeconds.length)

      for (const slide of slides) {
        const cleanRelPath = slide.imageUrl.split('?')[0]
        const diskPath = path.join(ROOT, 'public', cleanRelPath)
        expect(existsSync(diskPath), `missing screenshot ${diskPath}`).toBe(true)
        expect(slide.fromScale).toBeGreaterThanOrEqual(1)
        expect(slide.toScale).toBeGreaterThanOrEqual(1)
      }

      for (const dubLocale of DUB_LOCALES) {
        expect(script.beatsByLocale[dubLocale].length).toBe(slides.length)
        expect(DOOR_WALKTHROUGH_COPY[dubLocale].rooms[roomId].length).toBeGreaterThan(2)
      }
    }
  })

  it('maps ReviewerMilestoneId <-> FeatureRoomId and normalizes all 7 locale codes', () => {
    expect(milestoneToFeatureRoomId('series')).toBe('series-desk')
    expect(milestoneToFeatureRoomId('blueprint')).toBe('blueprint-board')
    expect(milestoneToFeatureRoomId('script-ar')).toBe('production-stage')
    expect(milestoneToFeatureRoomId('screening')).toBe('screening-room')

    expect(featureRoomIdToMilestone('series-desk')).toBe('series')
    expect(featureRoomIdToMilestone('blueprint-board')).toBe('blueprint')
    expect(featureRoomIdToMilestone('production-stage')).toBe('script-ar')
    expect(featureRoomIdToMilestone('screening-room')).toBe('screening')

    expect(normalizeWalkthroughDubLocale('zh-CN')).toBe('zh')
    expect(normalizeWalkthroughDubLocale('zh-TW')).toBe('zh')
    expect(normalizeWalkthroughDubLocale('pt-BR')).toBe('pt')
    expect(normalizeWalkthroughDubLocale('es-MX')).toBe('es')
    expect(normalizeWalkthroughDubLocale('ar')).toBe('ar')
    expect(normalizeWalkthroughDubLocale('hi')).toBe('hi')
    expect(normalizeWalkthroughDubLocale('th')).toBe('th')
    expect(normalizeWalkthroughDubLocale('fr')).toBe('en')
  })

  it('renders StudioDoorWalkthroughModal across rooms, switches video <-> panned 5K screens, and supports all 7 languages', () => {
    let closed = false

    renderElement(
      React.createElement(
        NextIntlClientProvider,
        { locale: 'en', messages: loadMessages('en') },
        React.createElement(StudioDoorWalkthroughModal, {
          open: true,
          onClose: () => {
            closed = true
          },
          initialRoomId: 'screening-room',
          initialLocale: 'en',
          initialMode: 'video',
          productionTitle: 'The Glass Ledger',
        })
      )
    )

    const dialog = document.querySelector('[data-testid="studio-door-walkthrough-modal"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.textContent).toContain('The Glass Ledger')

    // All 4 Studio Room tabs are present with tooltips
    const roomTabs = Array.from(dialog?.querySelectorAll('[role="tab"]') ?? [])
    expect(roomTabs).toHaveLength(4)
    for (const tab of roomTabs) {
      expect(tab.getAttribute('title')).toBeTruthy()
    }

    // Switch to Panned 5K Screens mode and verify the 5K screenshot stage renders with live caption
    const pannedBtn = Array.from(dialog?.querySelectorAll('button') ?? []).find(
      (btn) => btn.getAttribute('title') === DOOR_WALKTHROUGH_COPY.en.modePannedScreens
    )
    expect(pannedBtn).toBeTruthy()
    clickElement(pannedBtn!)

    const pannedStage = document.querySelector('[data-testid="panned-screenshot-stage"]')
    expect(pannedStage).toBeTruthy()
    expect(pannedStage?.textContent).toContain(
      FEATURE_ROOM_SCRIPTS['screening-room'].beatsByLocale.en[0]
    )

    // Switch room to Blueprint Room and verify beats update
    const blueprintTab = roomTabs.find((t) =>
      t.getAttribute('title')?.includes('Blueprint Room')
    )
    expect(blueprintTab).toBeTruthy()
    clickElement(blueprintTab!)
    expect(dialog?.textContent).toContain(
      FEATURE_ROOM_SCRIPTS['blueprint-board'].beatsByLocale.en[0]
    )

    // Verify all 7 locales render localized walkthrough UI + RTL for Arabic
    for (const loc of PRIORITY_LOCALES) {
      const dubId = normalizeWalkthroughDubLocale(loc)
      renderElement(
        React.createElement(
          NextIntlClientProvider,
          { locale: loc, messages: loadMessages(loc) },
          React.createElement(StudioDoorWalkthroughModal, {
            open: true,
            onClose: () => {
              closed = true
            },
            initialRoomId: 'series-desk',
            initialLocale: loc,
            initialMode: 'panned',
          })
        )
      )
      const activeDialog = document.querySelector('[data-testid="studio-door-walkthrough-modal"]')
      expect(activeDialog?.getAttribute('dir')).toBe(dubId === 'ar' ? 'rtl' : 'ltr')
      expect(activeDialog?.textContent).toContain(DOOR_WALKTHROUGH_COPY[dubId].interimBadge)
    }

    // Close button works
    const closeBtn = document.querySelector(
      `[aria-label="${DOOR_WALKTHROUGH_COPY.th.closeLabel}"]`
    )
    expect(closeBtn).toBeTruthy()
    clickElement(closeBtn!)
    expect(closed).toBe(true)
  })
})

describe('Desktop (1280px/1440px) & Samsung Galaxy S23 (360px) UI, Button Fit & Tooltip Audit', () => {
  it('renders VideoServicesSpotlightSection cleanly across all 7 languages with tooltips, stacked volume cards, and net profit clarity', () => {
    for (const locale of PRIORITY_LOCALES) {
      const messages = loadMessages(locale)
      const copy = resolveLocalizedStudioLandingCopy(locale).videoServices

      renderElement(
        React.createElement(
          NextIntlClientProvider,
          { locale, messages },
          React.createElement(VideoServicesSpotlightSection)
        )
      )

      // 1. All 4 Service Vertical tabs fit without `truncate` and carry `title` tooltips
      const tabs = Array.from(container?.querySelectorAll('[role="tab"]') ?? [])
      expect(tabs).toHaveLength(4)

      // Samsung Galaxy S23 (360px): full-width horizontal row (296px card - 24px pad - 32px icon - 68px price pill - 20px gaps = 152px pure text box)
      // At >=420px: 2-column tile ((420 - 32 - 32 - 8)/2 - 24 = 150px pure text box)
      // Desktop 1280px: 4-column tile => 257px pure text box
      const s23ServiceCardInnerPx = 150
      const desktopServiceCardInnerPx = 257

      tabs.forEach((tab, idx) => {
        const vertical = copy.verticals[idx]
        expect(tab.getAttribute('title'), `${locale} tab ${vertical.id} tooltip`).toContain(
          vertical.tabLabel
        )
        expect(tab.innerHTML).not.toContain('truncate')

        const longestWordS23 = estimateLongestWordPx(vertical.tabLabel, 14, locale)
        expect(
          longestWordS23,
          `[${locale}] "${vertical.tabLabel}" longest word (${longestWordS23}px) must fit S23 360px card (${s23ServiceCardInnerPx}px)`
        ).toBeLessThanOrEqual(s23ServiceCardInnerPx)
        expect(longestWordS23).toBeLessThanOrEqual(desktopServiceCardInnerPx)
      })

      // 2. Volume selector buttons use clean 2-line stacked numbers + short unit (no cramped '4 projects/mo') and have tooltips
      const allButtons = Array.from(container?.querySelectorAll('button') ?? [])
      for (const count of [4, 8, 15]) {
        const volButton = allButtons.find((btn) =>
          btn.getAttribute('title')?.startsWith(`${count} ${copy.projectsPerMonthSuffix}`)
        )
        expect(volButton, `[${locale}] volume button ${count} tooltip`).toBeTruthy()

        // S23 360px volume button inner width: 77px
        const unitWordPx = estimateLongestWordPx(copy.projectsUnitLabel, 11, locale)
        expect(
          unitWordPx,
          `[${locale}] unit "${copy.projectsUnitLabel}" (${unitWordPx}px) fits 77px S23 volume button`
        ).toBeLessThanOrEqual(77)
      }

      // 3. 'true margin' jargon is gone; clear per-project net profit + net margin formula tooltip is present
      expect(container?.textContent).not.toContain('true margin')
      expect(container?.textContent).toContain(copy.perProjectProfitLabel)
      expect(container?.textContent).toContain(`80% ${copy.marginBadgeSuffix}`)
    }
  })

  it('keeps Desktop Header (1280px xl & 1536px 2xl) single-row with zero CTA overlap across all 7 languages and falls back cleanly below xl', () => {
    const headerSrc = readSource('src/app/components/Header.tsx')
    expect(headerSrc).toContain('hidden xl:flex')
    expect(headerSrc).toContain('xl:hidden')
    expect(headerSrc).toContain('whitespace-nowrap')
    expect(headerSrc).toContain('xl:max-w-[90rem]')
    expect(headerSrc).toContain('2xl:max-w-[96rem]')
    expect(headerSrc).toContain('overflow-x-auto')
    expect(headerSrc).toContain('relative z-10 flex shrink-0')
    expect(headerSrc).not.toContain('hidden 2xl:inline-block')

    for (const locale of PRIORITY_LOCALES) {
      const nav = loadMessages(locale).nav
      const labels = [
        nav.overview,
        nav.videoServices ?? 'Video Business',
        nav.studioTour ?? 'Studio Tour',
        nav.productionExamples,
        nav.keyFeatures,
        nav.plansPricing,
        nav.trustSafety,
      ]
      const signInLabel = String(nav.signIn)
      const startProjectLabel = String(nav.startProject)

      // 1440px laptop (`xl:max-w-[90rem]` = 1392px inner container after `xl:px-6`)
      const charWidthXl = locale.startsWith('zh') ? 12 : 6.2
      const ctaWidthXl =
        36 +
        (Math.ceil(countSpacingGlyphs(signInLabel) * charWidthXl) + 22) +
        (Math.ceil(countSpacingGlyphs(startProjectLabel) * charWidthXl) + 26) +
        14
      const availableNavAt1440 = 1392 - 178 - ctaWidthXl - 20
      const estimatedNavAtXl = labels.reduce(
        (sum, label) => sum + Math.ceil(countSpacingGlyphs(String(label)) * charWidthXl) + 12,
        12
      )
      expect(
        estimatedNavAtXl,
        `[${locale}] xl nav (${estimatedNavAtXl}px) fits inside 1440px laptop header (${availableNavAt1440}px)`
      ).toBeLessThanOrEqual(availableNavAt1440)

      // 1536px (`2xl:max-w-[96rem]` = 1472px inner container after `2xl:px-8`)
      const charWidth2xl = locale.startsWith('zh') ? 13 : 6.8
      const ctaWidth2xl =
        36 +
        (Math.ceil(countSpacingGlyphs(signInLabel) * charWidth2xl) + 26) +
        (Math.ceil(countSpacingGlyphs(startProjectLabel) * charWidth2xl) + 30) +
        20
      const availableNavAt1536 = 1472 - 178 - ctaWidth2xl - 32
      const estimatedNavAt1536 = labels.reduce(
        (sum, label) => sum + Math.ceil(countSpacingGlyphs(String(label)) * charWidth2xl) + 20,
        24
      )
      expect(
        estimatedNavAt1536,
        `[${locale}] 2xl nav (${estimatedNavAt1536}px) fits inside ${availableNavAt1536}px without touching Sign In / Start a Project`
      ).toBeLessThanOrEqual(availableNavAt1536)
    }
  })

  it('eliminates un-tooltipped button truncation and cramped mobile grids across FloatingNav, StudioGuidedTour, ProductionStyleCard, KeyFeatures, FloatingCTA, SeriesInputPanel & Pricing', () => {
    const floatingNav = readSource('src/components/landing/FloatingNav.tsx')
    expect(floatingNav).not.toContain("'w-16 ")
    expect(floatingNav).toContain('max-w-[11rem]')
    expect(floatingNav).toContain('title={label}')

    const guidedTour = readSource('src/components/landing/StudioGuidedTourSection.tsx')
    expect(guidedTour).not.toContain('truncate')
    expect(guidedTour).toContain('StudioDoorWalkthroughModal')
    expect(guidedTour).toContain('VideoControlTooltip')

    const styleCard = readSource('src/components/landing/ProductionStyleCard.tsx')
    expect(styleCard).not.toContain('aria-disabled="true"')
    expect(styleCard).toContain('min-[420px]:grid-cols-3')
    expect(styleCard).toContain('StudioDoorWalkthroughModal')

    const seriesPanel = readSource('src/components/landing/SeriesInputPanel.tsx')
    expect(seriesPanel).toContain('grid-cols-3 gap-1.5 min-[440px]:grid-cols-5')

    const keyFeatures = readSource('src/components/landing/KeyFeaturesSection.tsx')
    expect(keyFeatures).not.toContain('block truncate font-medium')
    expect(keyFeatures).toContain('title={feature.title}')

    const floatingCta = readSource('src/components/landing/FloatingCTA.tsx')
    expect(floatingCta).not.toContain('truncate')
    expect(floatingCta).toContain("title={t('seePricing')}")
    expect(floatingCta).toContain("title={t('tryNine')}")

    const pricingGrid = readSource('src/components/landing/PricingTierGrid.tsx')
    expect(pricingGrid).not.toContain('truncate')
  })

  it('renders MobileCompanionPwaSection cleanly across all 7 languages for Samsung Galaxy S23 (360px) and Desktop (1280px+) with interactive Customer-PM & Team modes', () => {
    const mobileSectionSrc = readSource('src/components/landing/MobileCompanionPwaSection.tsx')
    expect(mobileSectionSrc).not.toContain('truncate')

    for (const locale of PRIORITY_LOCALES) {
      const messages = loadMessages(locale)
      const copy = resolveLocalizedStudioLandingCopy(locale).mobileCompanion

      renderElement(
        React.createElement(
          NextIntlClientProvider,
          { key: locale, locale, messages },
          React.createElement(MobileCompanionPwaSection)
        )
      )

      const sectionEl = container?.querySelector('#mobile-app')
      expect(sectionEl, `[${locale}] #mobile-app section`).toBeTruthy()

      // 1. Mode switcher tabs stack at 360px (272px text box) and 2-col at >=420px (142px text box), with tooltips
      const tabs = Array.from(container?.querySelectorAll('[role="tab"]') ?? [])
      expect(tabs).toHaveLength(2)
      for (const tab of tabs) {
        expect(tab.getAttribute('title')?.length ?? 0).toBeGreaterThan(4)
        expect(tab.innerHTML).not.toContain('truncate')
      }

      const customerTabWordPx = estimateLongestWordPx(copy.modeCustomerTab, 14, locale)
      const teamTabWordPx = estimateLongestWordPx(copy.modeTeamTab, 14, locale)
      expect(customerTabWordPx).toBeLessThanOrEqual(142)
      expect(teamTabWordPx).toBeLessThanOrEqual(142)

      // 2. Every interactive button inside #mobile-app has a native `title` tooltip
      const buttons = Array.from(container?.querySelectorAll('button') ?? [])
      for (const btn of buttons) {
        expect(
          (btn.getAttribute('title') ?? '').trim().length,
          `[${locale}] button missing title: "${btn.textContent}"`
        ).toBeGreaterThan(1)
      }

      // 3. Clicking Step 03 (Shared Continuity & Mobile Photo Uploads) updates the live phone preview
      const step3Btn = buttons.find((btn) =>
        btn.getAttribute('title')?.startsWith(`03 · ${copy.customerSteps[2].title}`)
      )
      expect(step3Btn, `[${locale}] step 03 button`).toBeTruthy()
      if (step3Btn) {
        clickElement(step3Btn)
        expect(container?.textContent).toContain(copy.customerSteps[2].phoneHeadline)
        expect(container?.textContent).toContain(copy.customerSteps[2].phoneStatus)
      }

      // 4. Switching to Team & Budget Hub mode renders push notification + credit budget guardrails
      clickElement(tabs[1])
      expect(container?.textContent).toContain(copy.teamHeading)
      expect(container?.textContent).toContain(copy.phoneTeamAlertTitle)
      expect(container?.textContent).toContain(copy.phoneTeamBudgetValue)
    }
  })

  it('ships 7-language Studio Narrated WebM + MP4 Animatics across all 39 capabilities with unobstructed mobile controls', () => {
    const readHeaderBytes = (filePath: string, length: number): Buffer => {
      const fd = openSync(filePath, 'r')
      try {
        const buf = Buffer.alloc(length)
        readSync(fd, buf, 0, length, 0)
        return buf
      } finally {
        closeSync(fd)
      }
    }

    for (const newShot of [
      'script-supervisor.webp',
      'client-intake-portal.webp',
      'blueprint-share-estimator.webp',
      'character-selfie-studio.webp',
      'producer-whitelabel-launchpad.webp',
      'streams-inventory-explorer.webp',
    ]) {
      const disk = path.join(ROOT, 'public/landing/key-features/screenshots', newShot)
      expect(existsSync(disk), `missing screenshot ${newShot}`).toBe(true)
      expect(statSync(disk).size).toBeGreaterThan(50_000)
      const head = readHeaderBytes(disk, 12)
      expect(head.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(head.subarray(8, 12).toString('ascii')).toBe('WEBP')
    }

    // Every single one of the 39 KEY_FEATURE_SCREENSHOTS has complete 7-language narration + Suite Animatic chapter timing
    const screenshotIcons = Object.keys(KEY_FEATURE_SCREENSHOTS)
    expect(screenshotIcons.length).toBe(39)
    expect(Object.keys(KEY_FEATURE_NARRATED_PAN).sort()).toEqual(screenshotIcons.sort())
    expect(KEY_FEATURE_SUITES.flatMap((s) => s.featureIcons).sort()).toEqual(
      screenshotIcons.sort()
    )

    for (const icon of screenshotIcons) {
      const tour = getKeyFeatureNarratedPan(icon)
      expect(tour, `missing narration spec for ${icon}`).toBeTruthy()
      expect(tour!.beats.length, `${icon} beat count`).toBeGreaterThanOrEqual(3)

      for (const beat of tour!.beats) {
        for (const loc of DUB_LOCALES) {
          expect(beat.narration[loc].trim().length, `${icon} ${loc}`).toBeGreaterThan(25)
        }
        expect(beat.narration.es).not.toBe(beat.narration.en)
        expect(beat.narration.zh).not.toBe(beat.narration.en)
        expect(beat.narration.ar).not.toBe(beat.narration.en)
      }

      for (const loc of DUB_LOCALES) {
        const chapter = getKeyFeatureChapterTiming(icon, loc)
        expect(chapter, `missing animatic chapter timing for ${icon} [${loc}]`).toBeTruthy()
        expect(chapter!.timing.endSec).toBeGreaterThan(chapter!.timing.startSec + 6)
        expect(chapter!.timing.beatStartsSec).toHaveLength(tour!.beats.length)
      }
    }

    // Verify all 8 Suites × 7 locales (56 .webm + 56 .mp4 + 8 -poster.webp) exist on disk with valid headers
    for (const suite of KEY_FEATURE_SUITES) {
      const posterDisk = path.join(ROOT, 'public', getKeyFeatureAnimaticPosterPath(suite.id))
      expect(existsSync(posterDisk), `missing ${suite.id}-poster.webp`).toBe(true)
      const posterHead = readHeaderBytes(posterDisk, 12)
      expect(posterHead.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(posterHead.subarray(8, 12).toString('ascii')).toBe('WEBP')

      for (const loc of DUB_LOCALES) {
        const webmDisk = path.join(
          ROOT,
          'public',
          getKeyFeatureAnimaticWebmPath(suite.id, loc)
        )
        const mp4Disk = path.join(ROOT, 'public', getKeyFeatureAnimaticMp4Path(suite.id, loc))
        expect(existsSync(webmDisk), `missing ${suite.id}-${loc}.webm`).toBe(true)
        expect(existsSync(mp4Disk), `missing ${suite.id}-${loc}.mp4`).toBe(true)
        expect(statSync(webmDisk).size).toBeGreaterThan(80_000)
        expect(statSync(mp4Disk).size).toBeGreaterThan(80_000)

        const webmHead = readHeaderBytes(webmDisk, 4)
        expect(Array.from(webmHead)).toEqual([0x1a, 0x45, 0xdf, 0xa3])
        const mp4Head = readHeaderBytes(mp4Disk, 8).subarray(4, 8).toString('ascii')
        expect(mp4Head).toBe('ftyp')
      }
    }

    // FlowDirector (scriptSupervisor) has 4 beats
    const fdTour = getKeyFeatureNarratedPan('scriptSupervisor')!
    expect(fdTour.beats).toHaveLength(4)

    // Verify FeatureScreenshotFrame uses clean WebM/MP4 video player with zero Edge TTS, zero speechSynthesis, and zero truncate
    const frameSrc = readSource('src/components/landing/FeatureScreenshotFrame.tsx')
    const drawerSrc = readSource('src/components/landing/FullStudioDirectoryDrawer.tsx')
    expect(frameSrc).not.toContain('truncate')
    expect(frameSrc).not.toContain('/api/tts/edge')
    expect(frameSrc).not.toContain('speechSynthesis')
    expect(frameSrc).not.toContain('SpeechSynthesisUtterance')
    expect(frameSrc).toContain('video/webm')
    expect(frameSrc).toContain('video/mp4')
    expect(drawerSrc).not.toContain('truncate')

    const fdMeta = getKeyFeatureScreenshot('scriptSupervisor')!
    renderElement(
      React.createElement(FeatureScreenshotFrame, {
        src: keyFeatureScreenshotSrc(fdMeta),
        variants: fdMeta.variants,
        label: 'FlowDirector',
        enterFullscreenLabel: 'Enter fullscreen',
        exitFullscreenLabel: 'Exit fullscreen',
        featureIcon: 'scriptSupervisor',
        locale: 'en',
      })
    )

    const animaticStage = container?.querySelector('[data-testid="feature-animatic-stage"]')
    const videoEl = animaticStage?.querySelector('video') as HTMLVideoElement | null
    expect(videoEl).toBeTruthy()
    expect(
      Array.from(videoEl?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/key-features/animatics/keyframes-clips-flowdirector-en.webm',
      '/landing/key-features/animatics/keyframes-clips-flowdirector-en.mp4',
    ])

    // Controls sit cleanly at bottom-2 left-2 with icon-only buttons so mobile viewports are never blocked
    const audioBtn = Array.from(animaticStage?.querySelectorAll('button') ?? []).find(
      (btn) =>
        btn.getAttribute('title') === FEATURE_ANIMATIC_UI_COPY.en.hearNarrationLabel ||
        btn.getAttribute('title') === FEATURE_ANIMATIC_UI_COPY.en.muteLabel
    )
    expect(audioBtn).toBeTruthy()
    expect(audioBtn?.textContent?.trim()).toBe('')
    const controlsOverlay = audioBtn?.closest('[dir="ltr"]')
    expect(controlsOverlay?.className).toContain('bottom-2')
    expect(controlsOverlay?.className).toContain('left-2')
    expect(controlsOverlay?.textContent?.trim()).toBe('')

    // Clicking video surface unmutes studio narration
    expect(videoEl?.muted).toBe(true)
    clickElement(videoEl!)
    expect(videoEl?.muted).toBe(false)

    const narratorBar = container?.querySelector('[data-testid="feature-pan-narrator-bar"]')
    const captionEl = container?.querySelector('[data-testid="feature-pan-caption"]')
    expect(narratorBar).toBeTruthy()
    expect(captionEl?.textContent).toContain(fdTour.beats[0].narration.en)

    // Switch to Arabic ('ar') and verify RTL caption + native Arabic WebM/MP4 animatic sources
    const arBtn = Array.from(narratorBar?.querySelectorAll('button') ?? []).find((btn) =>
      btn.getAttribute('title')?.includes('العربية')
    )
    expect(arBtn).toBeTruthy()
    clickElement(arBtn!)
    expect(captionEl?.getAttribute('dir')).toBe('rtl')
    expect(captionEl?.textContent).toContain(fdTour.beats[0].narration.ar)
    const arVideoEl = container?.querySelector('[data-testid="feature-animatic-stage"] video')
    expect(
      Array.from(arVideoEl?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/key-features/animatics/keyframes-clips-flowdirector-ar.webm',
      '/landing/key-features/animatics/keyframes-clips-flowdirector-ar.mp4',
    ])

    // Click Part 04 and verify caption advances to Beat 4 narration
    const beat4Btn = Array.from(container?.querySelectorAll('button') ?? []).find(
      (btn) => btn.textContent?.trim() === '04'
    )
    expect(beat4Btn).toBeTruthy()
    clickElement(beat4Btn!)
    expect(captionEl?.textContent).toContain(fdTour.beats[3].narration.ar)

    expect(normalizeFeaturePanLocale('zh-CN')).toBe('zh')
    expect(normalizeFeaturePanLocale('pt-BR')).toBe('pt')
    expect(normalizeFeaturePanLocale('th')).toBe('th')
  })

  it('ships realistic 5120x2880 5K WebP output images, 7-language business narration, and Global Market Opportunity copy across all 4 Video Business verticals', () => {
    const verticalIds: VideoServiceVerticalId[] = ['memoir', 'realestate', 'training', 'brand']
    const expectedImages = [
      'memoir-1.webp',
      'memoir-2.webp',
      'realestate-1.webp',
      'realestate-2.webp',
      'training-1.webp',
      'training-2.webp',
      'brand-1.webp',
      'brand-2.webp',
    ]

    const readHeaderBytes = (filePath: string, length: number): Buffer => {
      const fd = openSync(filePath, 'r')
      try {
        const buf = Buffer.alloc(length)
        readSync(fd, buf, 0, length, 0)
        return buf
      } finally {
        closeSync(fd)
      }
    }

    for (const imgName of expectedImages) {
      const diskPath = path.join(ROOT, 'public/landing/video-services', imgName)
      expect(existsSync(diskPath), `missing ${imgName}`).toBe(true)
      expect(statSync(diskPath).size, `${imgName} size`).toBeGreaterThan(300_000)
      const buf = readHeaderBytes(diskPath, 12)
      expect(buf.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(buf.subarray(8, 12).toString('ascii')).toBe('WEBP')
    }

    const showcaseSrc = readSource('src/components/landing/VideoServiceOutputShowcase.tsx')
    const sectionSrc = readSource('src/components/landing/VideoServicesSpotlightSection.tsx')
    expect(showcaseSrc).not.toContain('truncate')
    expect(showcaseSrc).not.toContain('role="tab"')
    // Never fall back to robotic computer speechSynthesis or consumer Edge TTS on Client Services
    expect(showcaseSrc).not.toContain('speechSynthesis')
    expect(showcaseSrc).not.toContain('SpeechSynthesisUtterance')
    expect(showcaseSrc).not.toContain('/api/tts/edge')
    expect(showcaseSrc).toContain('video/webm')
    expect(sectionSrc).not.toContain('truncate')

    // Verify Google Omni 1.2 Flash (10s blocks · 10–12 blocks · up to 2:00) Promo Demonstration Scripts + native cleanOmniRefPrompt compatibility
    expect(existsSync(path.join(ROOT, 'scripts/encode-video-services-webm.mjs'))).toBe(true)
    const expectedBlockCounts: Record<VideoServiceVerticalId, number> = {
      memoir: 12,
      realestate: 10,
      training: 11,
      brand: 11,
    }
    for (const vid of verticalIds) {
      const promo = VIDEO_SERVICE_PROMO_SCRIPTS[vid]
      expect(promo.blocks).toHaveLength(expectedBlockCounts[vid])
      expect(promo.blocks.length).toBeGreaterThanOrEqual(10)
      expect(promo.blocks.length).toBeLessThanOrEqual(12)
      expect(promo.durationSeconds).toBe(promo.blocks.length * 10)
      expect(promo.durationSeconds).toBeLessThanOrEqual(120)
      expect(promo.referenceLocks.length).toBeGreaterThanOrEqual(6)
      expect(promo.backgroundMusic.mixLevel).toContain('25%')
      expect(getVideoServicePromoWebmPath(vid, 'en')).toBe(
        `/landing/video-services/videos/${vid}-en.webm`
      )
      expect(getVideoServicePromoMp4Path(vid, 'ar')).toBe(
        `/landing/video-services/videos/${vid}-ar.mp4`
      )
      const lockNames = promo.referenceLocks.map((r) => r.name)
      for (const block of promo.blocks) {
        expect(block.durationSeconds).toBe(10)
        expect(block.videoModel).toBe('Google Omni 1.2 Flash (10s)')
        expect(block.videoPrompt).toContain('0s–2s (Start frame):')
        expect(block.videoPrompt).toContain('2s–8s (Action):')
        expect(block.videoPrompt).toContain('8s–10s (End frame):')
        expect(block.videoPrompt).toContain('Camera:')
        expect(block.videoPrompt).toMatch(/No spoken dialogue\.|The only spoken line is:/)
        expect(
          lockNames.some((n) => block.videoPrompt.includes(n)),
          `${vid} block ${block.blockNumber} must include at least one exact Continuity Library item name for rewriteVisualNamesToTokens`
        ).toBe(true)

        // Verify SceneFlow's Google Omni 1.2 Flash REF preprocessor preserves 100% of phases & binds tokens
        const cleaned = cleanOmniRefScenePrompt(block.videoPrompt)
        expect(cleaned).toContain('0s–2s (Start frame):')
        expect(cleaned).toContain('2s–8s (Action):')
        expect(cleaned).toContain('8s–10s (End frame):')
        expect(cleaned).toContain('Camera:')
        const tokenized = rewriteVisualNamesToTokens(
          cleaned,
          promo.referenceLocks.map((r) => ({ name: r.name, token: r.token }))
        )
        expect(tokenized).toMatch(/\b(?:person|location|prop) \[\d+\]/)
        for (const loc of DUB_LOCALES) {
          expect(block.localizedCues[loc].narrationVo.trim().length).toBeGreaterThan(30)
        }
        expect(block.localizedCues.es.narrationVo).not.toBe(
          block.localizedCues.en.narrationVo
        )
        expect(block.localizedCues.zh.narrationVo).not.toBe(
          block.localizedCues.en.narrationVo
        )
      }
    }

    for (const vid of verticalIds) {
      const beats = VIDEO_SERVICES_NARRATED_PAN[vid]
      expect(beats).toHaveLength(3)
      for (const beat of beats) {
        expect(beat.width).toBe(5120)
        expect(beat.height).toBe(2880)
        expect(beat.fromScale).toBeGreaterThan(1)
        expect(beat.toScale).toBeGreaterThan(1)
        for (const loc of DUB_LOCALES) {
          expect(beat.sceneTag[loc].trim().length).toBeGreaterThan(6)
          expect(beat.narration[loc].trim().length).toBeGreaterThan(40)
        }
        expect(beat.narration.es).not.toBe(beat.narration.en)
        expect(beat.narration.zh).not.toBe(beat.narration.en)
        expect(beat.narration.ar).not.toBe(beat.narration.en)
      }
    }

    // Render VideoServicesSpotlightSection across all 7 languages and verify 5K stage + Global Market Demand + tooltips
    for (const locale of PRIORITY_LOCALES) {
      const messages = loadMessages(locale)
      const copy = resolveLocalizedStudioLandingCopy(locale).videoServices
      const panLoc = normalizeFeaturePanLocale(locale)

      renderElement(
        React.createElement(
          NextIntlClientProvider,
          { key: `vs-${locale}`, locale, messages },
          React.createElement(VideoServicesSpotlightSection)
        )
      )

      const stageEl = container?.querySelector('[data-testid="video-service-pan-stage"]')
      const captionEl = container?.querySelector('[data-testid="video-service-pan-caption"]')
      expect(stageEl, `[${locale}] Video Memoir promo stage`).toBeTruthy()
      expect(stageEl?.getAttribute('dir')).toBe(panLoc === 'ar' ? 'rtl' : 'ltr')
      // Video Memoirs now renders the live .webm + .mp4 film replacing the 5K Output Showcase
      const videoEl = stageEl?.querySelector('video')
      expect(videoEl, `[${locale}] Video Memoir HTML5 <video>`).toBeTruthy()
      const expectedVideoLoc = hasNativePromoVideoForLocale('memoir', panLoc) ? panLoc : 'en'
      const sources = Array.from(videoEl?.querySelectorAll('source') ?? [])
      expect(sources.map((s) => s.getAttribute('src'))).toEqual([
        `/landing/video-services/videos/memoir-${expectedVideoLoc}.webm`,
        `/landing/video-services/videos/memoir-${expectedVideoLoc}.mp4`,
      ])
      expect(videoEl?.getAttribute('poster')).toBe('/landing/video-services/videos/memoir-poster.webp')
      // Keep mobile/desktop video view unobstructed: no top-left badge, icon-only audio button,
      // bottom-left control bar, and zero numeric time-tracking text on the player
      expect(stageEl?.textContent).not.toContain(VIDEO_SERVICE_PAN_UI_COPY[panLoc].promoVideoBadge)
      expect(stageEl?.textContent).not.toContain(VIDEO_SERVICE_PAN_UI_COPY[panLoc].outputBadge)
      expect(stageEl?.textContent).not.toContain('0:00')
      const audioBtn = Array.from(stageEl?.querySelectorAll('button') ?? []).find(
        (btn) =>
          btn.getAttribute('title') === VIDEO_SERVICE_PAN_UI_COPY[panLoc].hearPitchLabel ||
          btn.getAttribute('title') === VIDEO_SERVICE_PAN_UI_COPY[panLoc].muteLabel
      )
      expect(audioBtn, `[${locale}] icon-only audio button`).toBeTruthy()
      expect(audioBtn?.textContent?.trim()).toBe('')
      const controlsOverlay = audioBtn?.closest('[dir="ltr"]')
      expect(controlsOverlay?.className).toContain('bottom-2')
      expect(controlsOverlay?.className).toContain('left-2')
      expect(controlsOverlay?.textContent?.trim()).toBe('')
      if (!hasNativePromoVideoForLocale('memoir', panLoc)) {
        expect(stageEl?.textContent).toContain(
          VIDEO_SERVICE_PAN_UI_COPY[panLoc].englishAudioPreviewNote
        )
      } else {
        expect(stageEl?.textContent).not.toContain(
          VIDEO_SERVICE_PAN_UI_COPY[panLoc].englishAudioPreviewNote
        )
      }
      expect(captionEl?.textContent).toContain(VIDEO_SERVICES_NARRATED_PAN.memoir[0].narration[panLoc])
      expect(container?.textContent).toContain(copy.globalDemandLabel)
      expect(container?.textContent).toContain(copy.verticals[0].globalMarketNeed)

      // Every button inside VideoServicesSpotlightSection has a title tooltip and zero truncate
      const allBtns = Array.from(container?.querySelectorAll('button') ?? [])
      for (const btn of allBtns) {
        expect(
          (btn.getAttribute('title') ?? '').trim().length,
          `[${locale}] button missing title: "${btn.textContent}"`
        ).toBeGreaterThan(1)
        expect(btn.innerHTML).not.toContain('truncate')
      }
    }

    // Verify all 7 localized Video Memoir, Real Estate, Training & Brand ('en', 'es', 'pt', 'hi', 'zh', 'ar', 'th') .webm + .mp4 + .webp poster exist on disk with valid headers
    const ALL_PROMO_LOCALES = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'] as const
    for (const completedVertical of ['memoir', 'realestate', 'training', 'brand'] as const) {
      expect(VIDEO_SERVICE_AVAILABLE_PROMO_LOCALES[completedVertical]).toEqual(ALL_PROMO_LOCALES)
      for (const loc of ALL_PROMO_LOCALES) {
        expect(hasNativePromoVideoForLocale(completedVertical, loc)).toBe(true)
        expect(resolveAvailablePromoVideoLocale(completedVertical, loc)).toBe(loc)
      }

      for (const encodedLoc of ALL_PROMO_LOCALES) {
        const webmDisk = path.join(ROOT, 'public', getVideoServicePromoWebmPath(completedVertical, encodedLoc))
        const mp4Disk = path.join(ROOT, 'public', getVideoServicePromoMp4Path(completedVertical, encodedLoc))
        expect(existsSync(webmDisk), `${completedVertical}-${encodedLoc}.webm exists`).toBe(true)
        expect(existsSync(mp4Disk), `${completedVertical}-${encodedLoc}.mp4 exists`).toBe(true)
        expect(statSync(webmDisk).size).toBeGreaterThan(5_000_000)
        expect(statSync(mp4Disk).size).toBeGreaterThan(5_000_000)

        // EBML magic bytes for WebM: 0x1A 0x45 0xDF 0xA3
        const webmHead = readHeaderBytes(webmDisk, 4)
        expect(Array.from(webmHead)).toEqual([0x1a, 0x45, 0xdf, 0xa3])
        // ISO BMFF 'ftyp' box for MP4
        const mp4Head = readHeaderBytes(mp4Disk, 8).subarray(4, 8).toString('ascii')
        expect(mp4Head).toBe('ftyp')
      }

      const posterDisk = path.join(ROOT, 'public', getVideoServicePromoPosterPath(completedVertical))
      expect(existsSync(posterDisk), `${completedVertical}-poster.webp exists`).toBe(true)
      expect(statSync(posterDisk).size).toBeGreaterThan(10_000)
      // RIFF/WEBP header for poster
      const posterHead = readHeaderBytes(posterDisk, 12)
      expect(posterHead.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(posterHead.subarray(8, 12).toString('ascii')).toBe('WEBP')
    }
    expect(VIDEO_SERVICE_PROMO_SOURCE_BLOB_URLS.memoir?.en).toContain('vercel-storage.com')
    expect(VIDEO_SERVICE_PROMO_SOURCE_BLOB_URLS.memoir?.es).toContain('vercel-storage.com')
    expect(VIDEO_SERVICE_PROMO_SOURCE_BLOB_URLS.memoir?.pt).toContain('vercel-storage.com')

    // Interactive check in English: Video Memoir unmute & replay -> Spanish WebM switch -> switch vertical -> beat -> language (Arabic RTL)
    const enMessages = loadMessages('en')
    renderElement(
      React.createElement(
        NextIntlClientProvider,
        { key: 'vs-interactive', locale: 'en', messages: enMessages },
        React.createElement(VideoServicesSpotlightSection)
      )
    )

    const memoirStage = container?.querySelector('[data-testid="video-service-pan-stage"]')
    const memoirVideo = memoirStage?.querySelector('video') as HTMLVideoElement | null
    expect(memoirVideo).toBeTruthy()
    // Clicking the muted video surface immediately unmutes studio pitch audio
    expect(memoirVideo?.muted).toBe(true)
    clickElement(memoirVideo!)
    expect(memoirVideo?.muted).toBe(false)

    // Replay button resets video to 0:00 with studio audio active
    const replayBtn = Array.from(memoirStage?.querySelectorAll('button') ?? []).find(
      (btn) => btn.getAttribute('title') === VIDEO_SERVICE_PAN_UI_COPY.en.restartLabel
    )
    expect(replayBtn).toBeTruthy()
    clickElement(replayBtn!)
    expect(memoirVideo?.muted).toBe(false)

    // Clicking 'ES' switches Video Memoir <video> to the native Spanish WebM + MP4 pitch
    const esLangBtn = Array.from(memoirStage?.querySelectorAll('button') ?? []).find(
      (btn) => btn.textContent?.trim() === 'ES'
    )
    expect(esLangBtn).toBeTruthy()
    clickElement(esLangBtn!)
    const esVideo = container?.querySelector('[data-testid="video-service-pan-stage"] video')
    expect(
      Array.from(esVideo?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/video-services/videos/memoir-es.webm',
      '/landing/video-services/videos/memoir-es.mp4',
    ])

    // Clicking 'PT' switches Video Memoir <video> to the native Portuguese WebM + MP4 pitch
    const ptLangBtn = Array.from(
      container?.querySelectorAll('[data-testid="video-service-pan-stage"] button') ?? []
    ).find((btn) => btn.textContent?.trim() === 'PT')
    expect(ptLangBtn).toBeTruthy()
    clickElement(ptLangBtn!)
    const ptVideo = container?.querySelector('[data-testid="video-service-pan-stage"] video')
    expect(
      Array.from(ptVideo?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/video-services/videos/memoir-pt.webm',
      '/landing/video-services/videos/memoir-pt.mp4',
    ])

    // Return to 'EN' before testing Real Estate Tours vertical switch
    const enLangBtn = Array.from(
      container?.querySelectorAll('[data-testid="video-service-pan-stage"] button') ?? []
    ).find((btn) => btn.textContent?.trim() === 'EN')
    expect(enLangBtn).toBeTruthy()
    clickElement(enLangBtn!)

    const tabs = Array.from(container?.querySelectorAll('[role="tab"]') ?? [])
    expect(tabs).toHaveLength(4)

    // Switch to Real Estate Tours (tab index 1) -> verifies native Real Estate <video> player
    clickElement(tabs[1])
    const stageRealEstate = container?.querySelector('[data-testid="video-service-pan-stage"]')
    const reVideo = stageRealEstate?.querySelector('video')
    expect(reVideo).toBeTruthy()
    expect(reVideo?.getAttribute('poster')).toBe('/landing/video-services/videos/realestate-poster.webp')
    expect(
      Array.from(reVideo?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/video-services/videos/realestate-en.webm',
      '/landing/video-services/videos/realestate-en.mp4',
    ])

    // Switch to Training & Onboarding (tab index 2) -> verifies native Training <video> player
    clickElement(tabs[2])
    const stageTraining = container?.querySelector('[data-testid="video-service-pan-stage"]')
    const trVideo = stageTraining?.querySelector('video')
    expect(trVideo).toBeTruthy()
    expect(trVideo?.getAttribute('poster')).toBe('/landing/video-services/videos/training-poster.webp')
    expect(
      Array.from(trVideo?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/video-services/videos/training-en.webm',
      '/landing/video-services/videos/training-en.mp4',
    ])

    // Switch to Local Brand Stories (tab index 3) -> verifies native Brand Story <video> player
    clickElement(tabs[3])
    const stageAfterVertical = container?.querySelector('[data-testid="video-service-pan-stage"]')
    const captionAfterVertical = container?.querySelector('[data-testid="video-service-pan-caption"]')
    expect(captionAfterVertical?.textContent).toContain(
      VIDEO_SERVICES_NARRATED_PAN.brand[0].narration.en
    )
    const brandVideo = stageAfterVertical?.querySelector('video')
    expect(brandVideo).toBeTruthy()
    expect(brandVideo?.getAttribute('poster')).toBe('/landing/video-services/videos/brand-poster.webp')
    expect(
      Array.from(brandVideo?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/video-services/videos/brand-en.webm',
      '/landing/video-services/videos/brand-en.mp4',
    ])

    // Step to Beat 02
    const beat2Btn = Array.from(stageAfterVertical?.querySelectorAll('button') ?? []).find(
      (btn) => btn.textContent?.trim() === '02'
    )
    expect(beat2Btn).toBeTruthy()
    clickElement(beat2Btn!)
    expect(captionAfterVertical?.textContent).toContain(
      VIDEO_SERVICES_NARRATED_PAN.brand[1].narration.en
    )

    // Switch narration language to Arabic ('AR') and verify RTL + native Arabic Brand WebM/MP4 pitch
    const arLangBtn = Array.from(stageAfterVertical?.querySelectorAll('button') ?? []).find(
      (btn) => btn.textContent?.trim() === 'AR'
    )
    expect(arLangBtn).toBeTruthy()
    clickElement(arLangBtn!)
    expect(stageAfterVertical?.getAttribute('dir')).toBe('rtl')
    const brandArVideo = container?.querySelector('[data-testid="video-service-pan-stage"] video')
    expect(
      Array.from(brandArVideo?.querySelectorAll('source') ?? []).map((s) => s.getAttribute('src'))
    ).toEqual([
      '/landing/video-services/videos/brand-ar.webm',
      '/landing/video-services/videos/brand-ar.mp4',
    ])
    expect(captionAfterVertical?.textContent).toContain(
      VIDEO_SERVICES_NARRATED_PAN.brand[1].narration.ar
    )
  })
})
