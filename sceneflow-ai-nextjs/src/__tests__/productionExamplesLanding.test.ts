import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { PRODUCTION_SHOWCASE_COPY } from '@/config/landing/productionShowcaseCopy'
import {
  EXAMPLE_SERIES_INPUTS,
  formatSeriesInput,
} from '@/config/landing/exampleSeriesInputs'
import { HERO_SECTION_SCRIPTS, formatHeroVideoScript } from '@/config/landing/heroSectionScripts'
import { formatFrontPageCopyPack } from '@/config/landing/frontPageCopyPack'
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
import { PRODUCTION_SHOWCASE_SCREENING_SLUGS } from '@/config/landing/productionShowcaseScreening'
import { LANDING_SAMPLE } from '@/config/landingSamples'
import {
  PRODUCTION_PIPELINE_DEMO,
  PRODUCTION_WALK_IDS,
  buildProductionExampleMedia,
  getPipelineDemoBlueprintHref,
  getPipelineDemoScriptARHref,
  getPipelineDemoScreeningHref,
  getProductionExampleMedia,
  matchPipelineDemoStage,
  type ProductionPipelineWalk,
  type ProductionWalkId,
} from '@/config/landing/productionPipelineDemo'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Production Examples landing section', () => {
  it('renders on the landing page after Key Features', () => {
    const source = readSource('src/app/LandingPageClient.tsx')

    expect(source).toContain("import('@/components/landing/ProductionExamplesSection')")
    expect(source).not.toContain('<UseCasesSection />')
    expect(source.indexOf('<KeyFeaturesSection />')).toBeLessThan(
      source.indexOf('<ProductionExamplesSection />')
    )
    expect(source).not.toContain('<PipelinePillarsSection />')

    for (const relativePath of [
      'src/components/landing/FloatingNav.tsx',
      'src/app/components/Header.tsx',
    ]) {
      const nav = readSource(relativePath)
      expect(nav.indexOf('key-features')).toBeLessThan(nav.indexOf('production-examples'))
    }
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
    expect(section).not.toContain('PipelineReviewWalk')
    expect(section).not.toContain("t('explorePipelineCta')")
    expect(section).not.toContain("t('moreProductionsLabel')")
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
    expect(enMessages.productionShowcase.subtitle).toContain('Screening Room')
    expect(enMessages.productionShowcase.subtitle).not.toContain('three review surfaces')
  })

  it('does not ship the review walk', () => {
    expect(enMessages.productionShowcase).not.toHaveProperty('pipelineSteps')
    expect(enMessages.productionShowcase).not.toHaveProperty('explorePipelineCta')
    expect(enMessages.productionShowcase).not.toHaveProperty('pipelineComingSoon')
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

  it('uses a training series card in place of a localization comparison', () => {
    const training = enMessages.productionShowcase.cards.find((card) => card.id === 'training')!
    expect(training.title).toContain('Training Series')
    expect(training.subtitle).toContain('chef')
    expect(training.badge).toBe('Curriculum-Ready')
    expect(training).not.toHaveProperty('localeToggle')
    expect(training.solutionPillars).toHaveLength(4)
    expect(enMessages.productionShowcase.cards.some((card) => card.id === 'localization')).toBe(false)
  })

  it('shows a series input on the examples without copy controls', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    const backdrop = readSource('src/components/landing/PrimaryValueBackdrop.tsx')
    const seriesPanel = readSource('src/components/landing/SeriesInputPanel.tsx')
    expect(section).not.toContain('Copy all')
    expect(section).not.toContain('CopyTextButton')
    expect(card).toContain('SeriesInputPanel')
    expect(seriesPanel).not.toContain('CopyTextButton')
    expect(backdrop).not.toContain('HeroScriptDialog')
    expect(backdrop).not.toContain('Copy script')
  })

  it('gives all four examples structured specs, a storyline, breakdown beats/episodes, and a copyable pack', () => {
    expect(EXAMPLE_SERIES_INPUTS.map((series) => series.cardId)).toEqual([
      'drama',
      'animation',
      'documentary',
      'training',
    ])
    for (const series of EXAMPLE_SERIES_INPUTS) {
      expect(series.format.length).toBeGreaterThan(5)
      expect(series.genre.length).toBeGreaterThan(5)
      expect(series.artStyle.length).toBeGreaterThan(10)
      expect(series.duration.length).toBeGreaterThan(5)
      expect(series.continuityLock.length).toBeGreaterThan(10)
      expect(series.unitLabel.length).toBeGreaterThan(5)
      expect(series.logline.length).toBeGreaterThan(20)
      expect(series.storyline.length).toBeGreaterThan(40)
      expect(series.episodes.length).toBeGreaterThanOrEqual(5)
      for (const ep of series.episodes) {
        expect(ep.duration.length).toBeGreaterThan(2)
      }
      const text = formatSeriesInput(series)
      expect(text).toContain('Format: ')
      expect(text).toContain('Art Style: ')
      expect(text).toContain('Duration: ')
      expect(text).toContain('Create Series input')
      expect(text).toContain('Storyline')
      expect(text).toContain('1. ')
      expect(text).toContain('5. ')
    }
    expect(EXAMPLE_SERIES_INPUTS[0].episodes).toHaveLength(8)
    const drama = formatSeriesInput(EXAMPLE_SERIES_INPUTS[0])
    expect(drama).toContain('The White City Current')
    expect(drama).toContain('1893 atmospheric energy artifact')
    expect(drama).toContain('8. The Harmonic Grid Transmission and Vindication (6 min)')
    const animation = formatSeriesInput(EXAMPLE_SERIES_INPUTS[1])
    expect(animation).toContain('Hart House')
    expect(animation).toContain('Millwick')
    expect(animation).not.toMatch(/Cosmic Roommates|Springfield|Homer|Bart Simpson|Marge|Lisa Simpson/)
    const documentary = formatSeriesInput(EXAMPLE_SERIES_INPUTS[2])
    expect(documentary).toContain('superintelligence')
    expect(documentary).toContain('The Long Thought')
    const training = formatSeriesInput(EXAMPLE_SERIES_INPUTS[3])
    expect(training).toContain('Five Plates')
    expect(training).toContain('Chef Lila Mensah')

    for (const script of HERO_SECTION_SCRIPTS) {
      const text = formatHeroVideoScript(script).toLowerCase()
      expect(text).toContain('clip prompt')
      expect(text).toContain('music')
      expect(text).toContain('narration')
    }
    const pack = formatFrontPageCopyPack()
    expect(pack).toContain('SERIES INPUTS')
    expect(pack).toContain('HERO VIDEO SCRIPTS')
    expect(pack).toContain('Hart House')
    expect(pack).toContain('The friction we remove')
    expect(pack).toContain('The control you keep')
    expect(pack).toContain('The cut you publish')
  })

  it('keeps card ids stable', () => {
    expect(enMessages.productionShowcase.cards.map((card) => card.id)).toEqual([
      'drama',
      'animation',
      'documentary',
      'training',
    ])
  })

  it('matches the generated English base, so i18n:build-en is a no-op here', () => {
    expect(enMessages.productionShowcase).toEqual(
      JSON.parse(JSON.stringify(PRODUCTION_SHOWCASE_COPY))
    )
  })

  it('provides screening room instruction copy', () => {
    expect(enMessages.productionShowcase.screeningRoomInstruction).toContain('reviewer')
    expect(enMessages.productionShowcase.screeningRoomInstruction).toContain('Screening Room')
    expect(enMessages.productionShowcase.seriesDoor).toBe('Series Room')
    expect(enMessages.productionShowcase.blueprintDoor).toBe('Blueprint Room')
    expect(enMessages.productionShowcase.scriptArDoor).toBe('Production Stage')
    expect(enMessages.productionShowcase.screeningDoor).toBe('Screening Room')
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
  it('offers all four dub languages for the Cinematic Drama card', () => {
    const locales = getProductionShowcaseVideoLocales('drama')

    expect(locales.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
    expect(locales.map((locale) => locale.id)).toEqual(['en', 'es', 'zh', 'ar'])
  })

  it('marks all four dubs produced for the Cinematic Drama card', () => {
    const locales = getProductionShowcaseVideoLocales('drama')
    const available = locales.filter((locale) => locale.available).map((locale) => locale.id)
    const placeholders = locales.filter((locale) => !locale.available).map((locale) => locale.id)

    expect(available).toEqual(['en', 'es', 'zh', 'ar'])
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
    expect(byId.zh).toContain('The%20Cinematic%20Drama%20(Chinese).mp4')
    expect(byId.ar).toContain('The%20Cinematic%20Drama%20(Arabic).mp4')
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
    expect(placeholders).toEqual(['zh', 'ar'])

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

  it('opens the flagship card on a trailer and keeps the longform out of the grid', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')

    expect(card).not.toContain('TabsTrigger')
    expect(card).not.toContain('TabsContent')
    expect(card).not.toContain('ScreeningRoomPreview')
    expect(card).not.toContain('getProductionShowcaseVideoLocales')
    expect(card).toContain('TrailerPlayer')
    expect(card).toContain('mode="background"')
    expect(card).toContain('media.longformHref')
    expect(card).toContain('screeningRoomInstruction')
    expect(card).not.toContain('aria-label="Play preview"')
  })

  it('provides the video player copy the section reads', () => {
    for (const key of ['videoComingSoon', 'videoSoon'] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
    }
  })

  it('shows the trailer, fullscreen control, and pipeline links without a solutions dropdown', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    const player = readSource('src/components/landing/TrailerPlayer.tsx')

    expect(card).not.toContain('solutionsSectionOpen')
    expect(card).not.toContain('showSolutionsSectionLabel')
    expect(card).not.toContain('localeToggle')
    expect(card).not.toContain('SolutionPillarBody')
    expect(card).toContain('TrailerPlayer')
    expect(card).toContain('enterFullscreenLabel')
    expect(card).toContain('PipelineReviewDialog')
    expect(card).toContain('aria-label="Production review"')
    expect(card).not.toContain('roughDoorLabel')
    expect(card).not.toContain('previsDoorLabel')
    expect(card).toContain('SCREENING_ROOM_FEATURE_MODES')
    for (const modeLabel of ['Pre-Vis', 'Clips', 'Scenes', 'Chapters', 'Master', 'Promo']) {
      expect(card).toContain(`'${modeLabel}'`)
    }
    expect(card).toContain('Featured Player')
    expect(card).toContain('grid-cols-3')
    expect(card).not.toContain('Rough Cut')
    expect(card).not.toContain('>Draft<')
    expect(card).toContain('explorerHandoff')
    expect(player).toContain("aria-label={isMuted ? 'Unmute' : 'Mute'}")
    expect(player).toContain('video.muted = isMuted')
    expect(player).toContain('muted={isMuted}')
    expect(player).not.toContain('muted={background || isMuted}')
    expect(player).not.toContain('video.muted = true')
    expect(player).toContain('enterPhoneVideoFullscreen')
    expect(player).toContain('isCoarsePointer')
    expect(player).toContain('isNativeVideoFullscreen')
    expect(player).toContain('webkitbeginfullscreen')
    expect(player).toContain('mode === \'background\'')
    expect(player).not.toContain('nofullscreen')
    expect(player).not.toContain('containerRef')
    expect(player).toContain('type="video/webm"')
    expect(player).toContain('type="video/mp4"')
    const dialog = readSource('src/components/landing/PipelineReviewDialog.tsx')
    expect(dialog).toContain('<iframe')
    expect(dialog).toContain('className="h-full w-full border-0 bg-black"')
    expect(dialog).not.toContain('<nav')
    expect(dialog).not.toContain('onSelect')
    expect(dialog).not.toContain('Pre-Vis')
    expect(dialog).not.toContain('Rough Cut')
    expect(section).not.toContain("t('showSolutionsSection')")
    expect(section).not.toContain("t('hideSolutionsSection')")
    expect(section).not.toContain("t('roughDoor')")
    expect(section).toContain("t('explorerHandoff')")
    expect(section).toContain("t('watchLongform')")
    expect(section).toContain("t('trailerLabel')")
    expect(section).toContain("t('seriesDoor')")
    expect(section).toContain("t('screeningDoor')")
    expect(section).toContain("t('enterFullscreen')")
    expect(section).toContain('MobileAccordion')
    expect(section).toContain('isPhoneHandset')
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

describe('Production showcase screening embeds', () => {
  it('does not fetch the expired White House Waltz share', () => {
    expect(PRODUCTION_SHOWCASE_SCREENING_SLUGS.drama).toBe('')
    expect(LANDING_SAMPLE.storyboardShareSlug).toBe('')
  })

  it('ships a trailer and pipeline doors on every example before the longform master exists', () => {
    expect(getProductionExampleMedia('drama').isFlagship).toBe(true)
    expect(getProductionExampleMedia('drama').trailerSrc).toBe(
      '/videos/cinematic-drama-trailer.webm?v=20261011'
    )
    expect(getProductionExampleMedia('drama').trailerMp4Src).toContain(
      '25467ce3-606a-4e07-98ba-a91cf2be7ff2.mp4'
    )
    expect(getProductionExampleMedia('drama').longformHref).toBeNull()
    expect(getProductionExampleMedia('animation').isFlagship).toBe(false)
    expect(getProductionExampleMedia('animation').trailerSrc).toBeNull()
    expect(getProductionExampleMedia('documentary').longformHref).toBeNull()
    expect(getProductionExampleMedia('training').longformHref).toBeNull()
    expect(getProductionExampleMedia('drama').milestones.map((milestone) => milestone.href)).toEqual([
      '/s/series/cb7cc9e663a87a074e37c62636ef8c00',
      '/blueprint/share/5GDScu72NC7SWo1ioPMwzUxTg9KM2joz',
      '/share/script-resonance/_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s',
      '/TheWhiteCityCurrent',
    ])
    expect(getProductionExampleMedia('drama').milestones.every((milestone) => !milestone.placeholder)).toBe(
      true
    )
    expect(getProductionExampleMedia('training').milestones.map((milestone) => milestone.href)).toEqual([
      '/s/series/example-training-series',
      '/blueprint/share/example-training-blueprint',
      '/share/script-resonance/example-training-script',
      '/share/screening-room/example-training',
    ])
    expect(getProductionExampleMedia('training').milestones.every((milestone) => milestone.placeholder)).toBe(
      true
    )
    expect([...PRODUCTION_WALK_IDS]).toEqual(['drama', 'animation', 'documentary', 'training'])

    const empty: ProductionPipelineWalk = {
      seriesShareToken: '',
      blueprintShareToken: '',
      scriptResonanceShareToken: '',
      screeningRoomSlug: '',
      screeningPath: '',
      trailerSrc: '',
      trailerMp4Src: '',
      longformRuntimeLabel: '',
      longformPublished: false,
    }
    const walks = Object.fromEntries(
      PRODUCTION_WALK_IDS.map((id) => [id, { ...empty }])
    ) as Record<ProductionWalkId, ProductionPipelineWalk>
    walks.animation = {
      ...empty,
      trailerSrc: 'https://example.com/animation-trailer.webm',
      trailerMp4Src: 'https://example.com/animation-trailer.mp4',
      screeningRoomSlug: 'animation-master',
      longformRuntimeLabel: '22 min',
      longformPublished: false,
      seriesShareToken: 'animation-series',
      blueprintShareToken: 'animation-blueprint',
      scriptResonanceShareToken: 'animation-script',
    }
    const animationBeforeMaster = buildProductionExampleMedia(walks, 'animation')
    expect(animationBeforeMaster.trailerSrc).toBe('https://example.com/animation-trailer.webm')
    expect(animationBeforeMaster.trailerMp4Src).toBe('https://example.com/animation-trailer.mp4')
    expect(animationBeforeMaster.longformHref).toBeNull()
    expect(animationBeforeMaster.milestones.map((milestone) => milestone.id)).toEqual([
      'series',
      'blueprint',
      'script-ar',
      'screening',
    ])

    walks.drama = {
      ...empty,
      trailerSrc: 'https://example.com/drama-trailer.mp4',
      screeningRoomSlug: 'drama-master',
      longformRuntimeLabel: '38 min',
      longformPublished: true,
      seriesShareToken: 'series-token',
      blueprintShareToken: 'blueprint-token',
      scriptResonanceShareToken: 'script-token',
    }
    const drama = buildProductionExampleMedia(walks, 'drama')
    expect(drama.trailerSrc).toBe('https://example.com/drama-trailer.mp4')
    expect(drama.longformHref).toBe('/share/screening-room/drama-master')
    expect(drama.longformRuntimeLabel).toBe('38 min')
    expect(drama.milestones.map((milestone) => milestone.id)).toEqual([
      'series',
      'blueprint',
      'script-ar',
      'screening',
    ])

    walks.animation = { ...walks.animation, longformPublished: true }
    const animation = buildProductionExampleMedia(walks, 'animation')
    expect(animation.trailerSrc).toBe('https://example.com/animation-trailer.webm')
    expect(animation.longformHref).toBe('/share/screening-room/animation-master')
  })

  it('uses the cinematic drama review links and placeholders for the other examples', () => {
    expect(PRODUCTION_PIPELINE_DEMO.blueprintShareToken).toBe('5GDScu72NC7SWo1ioPMwzUxTg9KM2joz')
    expect(PRODUCTION_PIPELINE_DEMO.scriptResonanceShareToken).toBe('_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s')
    expect(PRODUCTION_PIPELINE_DEMO.screeningRoomSlug).toBe('TheWhiteCityCurrent')
    expect(getPipelineDemoBlueprintHref()).toBe('/blueprint/share/5GDScu72NC7SWo1ioPMwzUxTg9KM2joz')
    expect(getPipelineDemoScriptARHref()).toBe(
      '/share/script-resonance/_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s'
    )
    expect(getPipelineDemoScreeningHref()).toBeNull()
    expect(matchPipelineDemoStage('')).toBeNull()
    expect(matchPipelineDemoStage('50IuESZwELvHkNd4bTaULp1pli56zXWg')).toBeNull()
    expect(matchPipelineDemoStage('5GDScu72NC7SWo1ioPMwzUxTg9KM2joz')).toBe('blueprint')
    expect(matchPipelineDemoStage('_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s')).toBe('script-ar')
    expect(matchPipelineDemoStage('TheWhiteCityCurrent')).toBe('screening-room')
    expect(matchPipelineDemoStage('cb7cc9e663a87a074e37c62636ef8c00')).toBe('series')
    expect(matchPipelineDemoStage('example-training-series')).toBe('series')
  })

  it('renders a prepared stage for example share tokens instead of fetching a project', () => {
    for (const relativePath of [
      'src/components/blueprint/BlueprintShareViewer.tsx',
      'src/components/vision/ScriptResonanceShareViewer.tsx',
      'src/app/share/screening-room/[shareToken]/page.tsx',
      'src/app/s/series/[token]/page.tsx',
    ]) {
      const source = readSource(relativePath)
      expect(source, relativePath).toContain('isPipelinePlaceholderToken')
      expect(source, relativePath).toContain('PipelinePlaceholderStage')
    }

    const page = readSource('src/app/share/screening-room/[shareToken]/page.tsx')
    expect(page).toContain("value === 'rough'")
    expect(page).toContain('TrailerPlayer')
    expect(page).toContain('getPipelineTrailerMp4Src')
  })

  it('falls back to the placeholder when a configured share is gone', () => {
    const preview = readSource('src/components/landing/ScreeningRoomPreview.tsx')
    expect(preview).toContain('onNotFound')
    expect(preview).toContain('shareMissing')
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
