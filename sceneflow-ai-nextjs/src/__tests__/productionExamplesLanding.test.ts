import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { PRODUCTION_SHOWCASE_COPY } from '@/config/landing/productionShowcaseCopy'
import {
  VIDEO_CATEGORIES,
  buildUseCaseExampleHash,
  parseUseCaseExampleHash,
} from '@/config/landing/useCaseExamples'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'
import {
  getDefaultProductionShowcaseLocale,
  getProductionShowcaseVideoLocales,
  hasProductionShowcaseVideo,
} from '@/config/landing/productionShowcaseVideos'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Production Examples landing section', () => {
  it('renders on the landing page directly after the pre-vis section', () => {
    const source = readSource('src/app/LandingPageClient.tsx')

    expect(source).toContain("import('@/components/landing/ProductionExamplesSection')")
    expect(source).not.toContain('<UseCasesSection />')
    expect(source.indexOf('<ProductionExamplesSection />')).toBeLessThan(
      source.indexOf('<KeyFeaturesSection />')
    )
    expect(source).not.toContain('<PipelinePillarsSection />')
  })

  it('uses the production-examples anchor that the nav scrolls to', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).toContain("PRODUCTION_EXAMPLES_SECTION_ID = 'production-examples'")

    for (const relativePath of [
      'src/components/landing/FloatingNav.tsx',
      'src/app/components/Header.tsx',
    ]) {
      expect(readSource(relativePath)).toContain('production-examples')
    }
  })

  it('reads every string from the productionShowcase namespace', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')

    expect(section).toContain("useTranslations('productionShowcase')")
    expect(section).not.toContain("useTranslations('useCases')")
    expect(section).not.toContain("useTranslations('useCases.ui')")
  })

  it('no longer mounts the retired sector browser', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).not.toContain('ProductionComparisonVisual')
  })

  it('drops the header narration control', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).not.toContain('SectionNarrationButton')
    expect(section).not.toContain('SECTION_NARRATION_AUDIO')
  })

  it('renders the tagline under the subtitle', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).toContain("t('subtitleTagline')")
    expect(section).toContain("t('languagesBanner')")
    expect(section).toContain("t('explorePipelineCta')")
    expect(section).toContain('production-showcase-drama')
  })

  it('uses a desktop grid and mobile accordion layout', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).toContain('hidden md:block')
    expect(section).toContain('md:hidden')
    expect(section).toContain('grid grid-cols-1 gap-6 md:grid-cols-2')
    expect(section).toContain('MobileAccordion')
    expect(section).toContain('CardGrid')
  })
})

describe('Production Examples i18n contract', () => {
  it('provides the section header and CTA copy the component reads', () => {
    for (const key of [
      'badge',
      'title',
      'titleAccent',
      'subtitle',
      'subtitleTagline',
      'languagesBanner',
      'explorePipelineCta',
      'explorePipelineHint',
      'workflowLabel',
      'startProduction',
      'cta',
      'continuityNote',
      'resonanceNote',
      'screeningRoomInstruction',
      'frictionLabel',
      'solutionPillarLabel',
      'showSolutionsSection',
      'hideSolutionsSection',
    ] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
    }
  })

  it('brands the section as Production Examples', () => {
    expect(enMessages.productionShowcase.badge).toBe('Production Examples')
  })

  it('leads with the pipeline-in-action headline', () => {
    expect(enMessages.productionShowcase.title).toBe('See the Full Pipeline')
    expect(enMessages.productionShowcase.titleAccent).toBe('in Action')
  })

  it('closes the intro with the long-form tagline', () => {
    expect(enMessages.productionShowcase.subtitleTagline).toBe(
      'Long-form productions. Not clips.'
    )
    expect(enMessages.productionShowcase.subtitle).toContain('complete production')
  })

  it('ships exactly four focused production cards', () => {
    const { cards } = enMessages.productionShowcase

    expect(cards).toHaveLength(4)

    for (const card of cards) {
      for (const key of [
        'id',
        'title',
        'subtitle',
        'badge',
        'screeningRoomPreview',
      ] as const) {
        expect(card[key], `${card.id} ${key}`).toBeTruthy()
      }
      if ('solutionPillars' in card && card.solutionPillars) {
        expect(
          card.solutionPillars.length,
          `${card.id} solutionPillars`
        ).toBeGreaterThanOrEqual(3)
        for (const pillar of card.solutionPillars) {
          for (const key of [
            'title',
            'frictionHeadline',
            'friction',
            'solutionHeadline',
            'solution',
          ] as const) {
            expect(pillar[key], `${card.id} pillar ${key}`).toBeTruthy()
          }
        }
      }
    }
  })

  it('uses problem-vs-solution pillars on the Cinematic Drama card', () => {
    const drama = enMessages.productionShowcase.cards.find((card) => card.id === 'drama')!
    expect(drama.title).toContain('Feature-Length')
    expect(drama.solutionPillars).toHaveLength(4)
    expect(drama.solutionPillars?.[0]?.title).toBe('Visual & Character Consistency')
  })

  it('uses problem-vs-solution pillars on the Animated Comedy card', () => {
    const animation = enMessages.productionShowcase.cards.find((card) => card.id === 'animation')!
    expect(animation.title).toContain('Full-Season')
    expect(animation.solutionPillars).toHaveLength(4)
    expect(animation.solutionPillars?.[0]?.title).toBe('Stylistic Consistency')
  })

  it('uses problem-vs-solution pillars on the Documentary card', () => {
    const documentary = enMessages.productionShowcase.cards.find((card) => card.id === 'documentary')!
    expect(documentary.title).toContain('Long-Form Documentaries')
    expect(documentary.solutionPillars).toHaveLength(4)
    expect(documentary.solutionPillars?.[0]?.title).toBe('Era-Specific Visual Accuracy')
  })

  it('includes a localization comparison card with locale toggle', () => {
    const localization = enMessages.productionShowcase.cards.find((card) => card.id === 'localization')!
    expect(localization.title).toContain('Beyond Dubbing')
    expect(localization.subtitle).toContain('Houston')
    expect(localization.subtitle).toContain('Paulo')
    expect(localization.badge).toBe('Localized')
    expect((localization as Record<string, unknown>).localeToggle).toBe(true)
    expect((localization as Record<string, unknown>).locales).toHaveLength(2)
    expect(localization.solutionPillars).toHaveLength(3)
  })

  it('keeps card ids stable', () => {
    expect(enMessages.productionShowcase.cards.map((card) => card.id)).toEqual([
      'drama',
      'animation',
      'documentary',
      'localization',
    ])
  })

  it('matches the generated English base, so i18n:build-en is a no-op here', () => {
    expect(enMessages.productionShowcase).toEqual(
      JSON.parse(JSON.stringify(PRODUCTION_SHOWCASE_COPY))
    )
  })

  it('provides screening room instruction copy', () => {
    expect(enMessages.productionShowcase.screeningRoomInstruction).toContain('Pre-Vis')
    expect(enMessages.productionShowcase.screeningRoomInstruction).toContain('language')
  })
})

describe('Animated Comedy showcase script', () => {
  const script = readSource('scripts/use-case-scripts/cosmic-roommates-animated-comedy.md')

  it('still covers the core comedy production stages in the script', () => {
    for (const stage of [
      "Writer's Room",
      'Art style',
      'Reference Library',
      'Audience Resonance',
      'Screening Room',
    ]) {
      expect(script, `script is missing the ${stage} stage`).toContain(stage)
    }
  })

  it('budgets eight ten-second blocks', () => {
    const blocks = script.match(/^### \d\d — /gm) ?? []
    expect(blocks).toHaveLength(8)
    expect(script).toContain('8 × 10s = **1:20**')
  })

  it('declares where motion ends and the hold begins in every block', () => {
    const timings = script.match(/\*\*Timing\*\*/g) ?? []
    expect(timings).toHaveLength(8)

    const settles = script.match(/\*\*Settle on:\*\*/g) ?? []
    expect(settles).toHaveLength(8)
  })

  it('keeps every spoken line inside the time it is given', () => {
    const WORDS_PER_SECOND = 160 / 60
    expect(script).toContain('160 words per minute')

    const rows = [
      ...script.matchAll(/\|\s\*\*(Narration|In-scene)\*\*(?:\s\(([^)]+)\))?\s\|\s(.+?)\s\|\s*$/gm),
    ]
    expect(rows.length).toBeGreaterThanOrEqual(8)

    for (const [, kind, window, body] of rows) {
      const claimed = body.match(/\*\((\d+) words/)
      expect(claimed, `${kind} line is missing its word count`).toBeTruthy()

      const spoken = body
        .replace(/\*\([^)]*\)\*/g, '')
        .replace(/<br>/g, ' ')
        .replace(/\*\*[A-Z0-9-]+:\*\*/g, '')
        .replace(/[*_]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => !/^[—–·-]+$/.test(token))

      expect(spoken.length, `${kind} "${spoken.slice(0, 4).join(' ')}…" count drifted`).toBe(
        Number(claimed![1])
      )

      let seconds = 10
      if (window?.includes('–')) {
        const [start, end] = window.split('–').map((stamp) => {
          const [minutes, secs] = stamp.trim().split(':').map(Number)
          return minutes * 60 + secs
        })
        seconds = end - start
      }

      expect(
        spoken.length,
        `${kind} "${spoken.slice(0, 4).join(' ')}…" overruns its ${seconds}s window`
      ).toBeLessThanOrEqual(Math.round(seconds * WORDS_PER_SECOND) + 2)
    }
  })

  it('keeps character sheets rendering-agnostic so they survive every style module', () => {
    for (const token of ['CHAR_DEZ', 'CHAR_VORP']) {
      expect(script).toContain(`REF: ${token}`)
    }
    for (const module of ['STYLE_ANIME_90S', 'STYLE_GHIBLI', 'STYLE_COMIC']) {
      expect(script, `missing style module ${module}`).toContain(module)
    }
  })

  it('styles every card id the config declares', () => {
    const cardStyles = readSource('src/components/landing/ProductionStyleCard.tsx')

    for (const card of PRODUCTION_SHOWCASE_COPY.cards) {
      expect(cardStyles, `missing style for ${card.id}`).toContain(`${card.id}: {`)
    }
  })

  it('provides nav labels for the anchor', () => {
    expect(enMessages.nav.productionExamples).toBeTruthy()
    expect(enMessages.floatingNav.productionExamples).toBeTruthy()
  })
})

describe('Production style CTAs', () => {
  it('sends every card into the explorer checkout funnel with its production id', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')

    expect(card).toContain("checkoutTier: 'explorer'")
    expect(card).toContain('extra: { production: card.id }')
  })

  it('keeps the card CTA in flow on every card (no hover overlay)', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')

    expect(card).toContain('mt-4 w-full bg-gradient-to-r text-white')
    expect(card).not.toContain('md:group-hover:opacity-100')
  })
})

describe('Production showcase videos', () => {
  it('offers all seven dub languages for the Cinematic Drama card', () => {
    const locales = getProductionShowcaseVideoLocales('drama')

    expect(locales.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
    expect(locales.map((locale) => locale.id)).toEqual([
      'en',
      'es',
      'pt',
      'hi',
      'zh',
      'ar',
      'th',
    ])
  })

  it('marks all seven dubs produced for the Cinematic Drama card', () => {
    const locales = getProductionShowcaseVideoLocales('drama')
    const available = locales.filter((locale) => locale.available).map((locale) => locale.id)
    const placeholders = locales.filter((locale) => !locale.available).map((locale) => locale.id)

    expect(available).toEqual(['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'])
    expect(placeholders).toEqual([])

    for (const locale of locales) {
      if (!locale.available) expect(locale.src).toBe('')
    }
  })

  it('points the produced locales at their Blob masters', () => {
    const byId = Object.fromEntries(
      getProductionShowcaseVideoLocales('drama').map((locale) => [locale.id, locale.src])
    )

    expect(byId.en).toContain('The%20Cinematic%20Drama%20(English).mp4')
    expect(byId.es).toContain('The%20Cinematic%20Drama%20(Spanish).mp4')
    expect(byId.pt).toContain('The%20Cinematic%20Drama%20(Portuguese).mp4')
    expect(byId.hi).toContain('The%20Cinematic%20Drama%20(Hindi).mp4')
    expect(byId.zh).toContain('The%20Cinematic%20Drama%20(Chinese).mp4')
    expect(byId.ar).toContain('The%20Cinematic%20Drama%20(Arabic).mp4')
    expect(byId.th).toContain('The%20Cinematic%20Drama%20(Thai).mp4')
  })

  it('defaults to English and reports the card as having video', () => {
    expect(getDefaultProductionShowcaseLocale('drama')).toBe('en')
    expect(hasProductionShowcaseVideo('drama')).toBe(true)
  })

  it('offers English and Spanish for the Animated Comedy card with other dubs coming soon', () => {
    const locales = getProductionShowcaseVideoLocales('animation')
    const available = locales.filter((locale) => locale.available).map((locale) => locale.id)
    const placeholders = locales.filter((locale) => !locale.available).map((locale) => locale.id)

    expect(locales.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
    expect(available).toEqual(['en', 'es'])
    expect(placeholders).toEqual(['pt', 'hi', 'zh', 'ar', 'th'])

    const english = locales.find((locale) => locale.id === 'en')
    expect(english?.src).toContain('The%20Animated%20Comedy%20(English).mp4')
    const spanish = locales.find((locale) => locale.id === 'es')
    expect(spanish?.src).toContain('The%20Animated%20Comedy%20(Spanish).mp4')
    expect(getDefaultProductionShowcaseLocale('animation')).toBe('en')
    expect(hasProductionShowcaseVideo('animation')).toBe(true)

    for (const locale of locales) {
      if (!locale.available) expect(locale.src).toBe('')
    }
  })

  it('shows Screening Room player directly without tabs', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')

    expect(card).not.toContain('TabsTrigger')
    expect(card).not.toContain('TabsContent')
    expect(card).toContain('ScreeningRoomPreview')
    expect(card).toContain('screeningEmbedSlug')
    expect(card).toContain('screeningRoomInstruction')
  })

  it('provides the video player copy the section reads', () => {
    for (const key of ['videoComingSoon', 'videoSoon'] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
    }
  })

  it('shows the Screening Room player and collapsible solutions on each card', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')

    expect(card).toContain('solutionsSectionOpen')
    expect(card).toContain('aria-expanded={solutionsSectionOpen}')
    expect(card).toContain('showSolutionsSectionLabel')
    expect(card).toContain('hideSolutionsSectionLabel')
    expect(card).toContain('ScreeningRoomPreview')
    expect(card).toContain('screeningEmbedSlug')
    expect(card).toContain('Accordion')
    expect(card).toContain('type="single"')
    expect(card).toContain('collapsible')
    expect(card).toContain('SolutionPillarBody')
    expect(card).toContain('border-rose-500/20')
    expect(card).toContain('border-indigo-500/20')
    expect(card).toContain('solutionPillars')
    expect(section).toContain('frictionLabel')
    expect(section).toContain('solutionPillarLabel')
    expect(section).toContain("t('showSolutionsSection')")
    expect(section).toContain("t('hideSolutionsSection')")
    expect(section).toContain('getProductionShowcaseScreeningSlug')
  })
})

describe('Video player watermark', () => {
  it('renders no watermark overlay in the landing video players', () => {
    for (const relativePath of [
      'src/components/landing/MultiLanguageVideoPlayer.tsx',
      'src/components/landing/FeatureVideoPlayer.tsx',
      'src/components/landing/LandingSampleVideo.tsx',
      'src/components/landing/ProductionStyleCard.tsx',
    ]) {
      expect(readSource(relativePath), `${relativePath} still renders a watermark`).not.toContain(
        'StudioVideoWatermark'
      )
    }
  })
})

describe('Retired sector-browser deep links', () => {
  it('still round-trips example hashes from config for a future revival', () => {
    const examples = VIDEO_CATEGORIES.flatMap((cat) =>
      cat.examples.map((ex) => ({ categoryId: cat.id, exampleId: ex.id }))
    )

    expect(examples).toHaveLength(29)

    for (const { categoryId, exampleId } of examples) {
      const hash = buildUseCaseExampleHash(categoryId, exampleId)
      expect(hash).toBe(`use-cases-${categoryId}-${exampleId}`)
      expect(parseUseCaseExampleHash(hash)).toEqual({ categoryId, exampleId })
    }
  })

  it('ignores hashes that are not use-case examples', () => {
    for (const hash of ['production-examples', 'use-cases', 'use-cases-nope-nope', 'pricing']) {
      expect(parseUseCaseExampleHash(hash)).toBeNull()
    }
  })

  it('keeps the section narration track wired', () => {
    expect(SECTION_NARRATION_AUDIO['use-cases']).toBeTruthy()
  })
})
