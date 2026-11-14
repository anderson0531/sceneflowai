/**
 * @vitest-environment jsdom
 *
 * Comprehensive Desktop (1280px / 1440px) & Mobile (Samsung Galaxy S23 — 360px CSS width)
 * UI / Button Label / Tooltip / 7-Language Narrated Walkthrough & Panned-Screenshot Tests.
 */

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { existsSync, readFileSync, statSync } from 'fs'
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

  it('ships the 5120x3967 FlowDirector 5K screenshot and 7-language 5K pan narrated tours across all 34 capabilities', () => {
    const flowDirectorDisk = path.join(
      ROOT,
      'public/landing/key-features/screenshots/script-supervisor.webp'
    )
    expect(existsSync(flowDirectorDisk)).toBe(true)
    expect(statSync(flowDirectorDisk).size).toBeGreaterThan(800_000)

    const buf = readFileSync(flowDirectorDisk)
    expect(buf.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(buf.subarray(8, 12).toString('ascii')).toBe('WEBP')

    // Every single one of the 34 KEY_FEATURE_SCREENSHOTS has a 5K Pan Narrated tour in all 7 languages
    const screenshotIcons = Object.keys(KEY_FEATURE_SCREENSHOTS)
    expect(screenshotIcons.length).toBe(34)
    expect(Object.keys(KEY_FEATURE_NARRATED_PAN).sort()).toEqual(screenshotIcons.sort())

    for (const icon of screenshotIcons) {
      const tour = getKeyFeatureNarratedPan(icon)
      expect(tour, `missing 5K pan tour for ${icon}`).toBeTruthy()
      expect(tour!.beats.length, `${icon} beat count`).toBeGreaterThanOrEqual(3)

      for (const beat of tour!.beats) {
        expect(beat.fromZoom).toBeGreaterThanOrEqual(1)
        expect(beat.toZoom).toBeGreaterThanOrEqual(1)
        expect(beat.durationSec).toBeGreaterThanOrEqual(4)
        for (const loc of DUB_LOCALES) {
          expect(beat.narration[loc].trim().length, `${icon} ${beat.id} ${loc}`).toBeGreaterThan(25)
        }
        expect(beat.narration.es).not.toBe(beat.narration.en)
        expect(beat.narration.zh).not.toBe(beat.narration.en)
        expect(beat.narration.ar).not.toBe(beat.narration.en)
      }
    }

    // FlowDirector (scriptSupervisor) has 4 beats spanning overview -> pickups
    const fdTour = getKeyFeatureNarratedPan('scriptSupervisor')!
    expect(fdTour.beats).toHaveLength(4)
    expect(fdTour.beats[0].variantId).toBe('overview')
    expect(fdTour.beats[3].variantId).toBe('pickups')

    // Render FeatureScreenshotFrame for FlowDirector and verify 7-language switching + variant sync + zero truncate
    const frameSrc = readSource('src/components/landing/FeatureScreenshotFrame.tsx')
    const drawerSrc = readSource('src/components/landing/FullStudioDirectoryDrawer.tsx')
    expect(frameSrc).not.toContain('truncate')
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

    const narratorBar = container?.querySelector('[data-testid="feature-pan-narrator-bar"]')
    const captionEl = container?.querySelector('[data-testid="feature-pan-caption"]')
    expect(narratorBar).toBeTruthy()
    expect(captionEl?.textContent).toContain(fdTour.beats[0].narration.en)

    // Switch to Arabic ('ar') and verify RTL caption + Arabic script
    const arBtn = Array.from(narratorBar?.querySelectorAll('button') ?? []).find((btn) =>
      btn.getAttribute('title')?.includes('العربية')
    )
    expect(arBtn).toBeTruthy()
    clickElement(arBtn!)
    expect(captionEl?.getAttribute('dir')).toBe('rtl')
    expect(captionEl?.textContent).toContain(fdTour.beats[0].narration.ar)

    // Click beat 04 ('pickups' variant) and verify active image transitions to script-supervisor-pickups.webp
    const beat4Btn = Array.from(container?.querySelectorAll('button') ?? []).find(
      (btn) => btn.textContent?.trim() === '04'
    )
    expect(beat4Btn).toBeTruthy()
    clickElement(beat4Btn!)
    expect(captionEl?.textContent).toContain(fdTour.beats[3].narration.ar)
    const imgEl = container?.querySelector('img')
    expect(imgEl?.getAttribute('src')).toContain('script-supervisor-pickups.webp')

    expect(normalizeFeaturePanLocale('zh-CN')).toBe('zh')
    expect(normalizeFeaturePanLocale('pt-BR')).toBe('pt')
    expect(normalizeFeaturePanLocale('th')).toBe('th')
  })
})
