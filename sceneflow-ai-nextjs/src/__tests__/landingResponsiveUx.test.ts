/**
 * @vitest-environment jsdom
 *
 * Comprehensive Desktop (1280px / 1440px) & Mobile (Samsung Galaxy S23 — 360px CSS width)
 * UI / Button Label / Tooltip / 7-Language Narrated Walkthrough & Panned-Screenshot Tests.
 */

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextIntlClientProvider } from 'next-intl'
import { VideoServicesSpotlightSection } from '@/components/landing/VideoServicesSpotlightSection'
import { StudioDoorWalkthroughModal } from '@/components/landing/StudioDoorWalkthroughModal'
import {
  DOOR_WALKTHROUGH_COPY,
  ROOM_PANNED_SLIDES,
  featureRoomIdToMilestone,
  milestoneToFeatureRoomId,
  normalizeWalkthroughDubLocale,
} from '@/config/landing/doorWalkthroughCopy'
import { FEATURE_ROOM_IDS } from '@/config/landing/featureRoomMedia'
import { FEATURE_ROOM_SCRIPTS, type HeroDubLocaleId } from '@/config/landing/featureRoomScripts'
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

  it('keeps Desktop Header (1280px / 1440px) single-row with tooltips across all 7 languages and falls back cleanly below xl', () => {
    const headerSrc = readSource('src/app/components/Header.tsx')
    expect(headerSrc).toContain('hidden xl:flex')
    expect(headerSrc).toContain('xl:hidden')
    expect(headerSrc).toContain('whitespace-nowrap')

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
      // At 1280px (`xl`), nav uses compact `text-xs` (12px), `px-2` (16px total horizontal pad), and hides decorative icons until `2xl` (1536px+)
      const estimatedNavWidthAt1280 = labels.reduce((sum, label) => {
        const charWidth = locale.startsWith('zh') ? 12 : 6.4
        return sum + Math.ceil(countSpacingGlyphs(String(label)) * charWidth) + 18
      }, 0)
      expect(
        estimatedNavWidthAt1280,
        `[${locale}] desktop nav width (${estimatedNavWidthAt1280}px) fits 1280px header`
      ).toBeLessThanOrEqual(840)
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
})
