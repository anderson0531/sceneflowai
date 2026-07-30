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
  it('renders on the landing page directly after the persona use-cases section', () => {
    const source = readSource('src/app/LandingPageClient.tsx')

    expect(source).toContain("import('@/components/landing/ProductionExamplesSection')")
    expect(source.indexOf('<UseCasesSection />')).toBeLessThan(
      source.indexOf('<ProductionExamplesSection />')
    )
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
    // The legacy `useCases` copy is what made this section read as the old
    // use-case block; it must not leak back in.
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

  it('renders the tagline as its own paragraph under the subtitle', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).toContain("t('subtitleTagline')")
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
      'workflowLabel',
      'startProduction',
      'cta',
      'continuityNote',
      'resonanceNote',
      'introVideoLabel',
      'screeningRoomLabel',
      'frictionLabel',
      'solutionPillarLabel',
    ] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
    }
  })

  it('brands the section as Production Examples rather than use cases', () => {
    expect(enMessages.productionShowcase.badge).toBe('Production Examples')
  })

  it('leads with the concept-to-screen headline, accent half last', () => {
    expect(enMessages.productionShowcase.title).toBe('From Concept to Screen:')
    expect(enMessages.productionShowcase.titleAccent).toBe('Infinite Possibilities')
  })

  it('closes the intro with the one-platform tagline', () => {
    expect(enMessages.productionShowcase.subtitleTagline).toBe(
      'One platform. Infinite possibilities.'
    )
    expect(enMessages.productionShowcase.subtitle).toContain('SceneFlow AI Studio')
  })

  it('ships exactly four fully populated production cards', () => {
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
      if (card.benefit) {
        expect(card.benefit, `${card.id} benefit`).toBeTruthy()
      }
      if ('solutionPillars' in card && card.solutionPillars) {
        expect(card.solutionPillars.length, `${card.id} solutionPillars`).toBe(4)
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
      } else {
        // Cards run four steps; the animated comedy adds a fifth for the
        // Screening Room, matching its showcase script.
        expect(card.workflow?.length, `${card.id} workflow`).toBeGreaterThanOrEqual(4)
        expect(card.workflow?.length, `${card.id} workflow`).toBeLessThanOrEqual(5)
        for (const step of card.workflow ?? []) {
          expect(step, `${card.id} workflow step`).toBeTruthy()
        }
      }
    }
  })

  it('uses problem-vs-solution pillars on the Cinematic Drama card', () => {
    const drama = enMessages.productionShowcase.cards.find((card) => card.id === 'drama')!
    expect(drama.title).toBe('Cinematic AI Drama. Zero Character Drift.')
    expect(drama.subtitle).toBe(
      'Eliminate the morphing characters, broken dialogue, and endless rerolls. Build seamless, multi-character long-form stories with complete visual continuity.'
    )
    expect(drama.solutionPillars).toHaveLength(4)
    expect(drama.solutionPillars?.[0]?.title).toBe('Visual & Character Consistency')
    expect(drama.solutionPillars?.[1]?.frictionHeadline).toBe('The 10-Second Clip Trap.')
    expect(drama).not.toHaveProperty('workflow')
    expect(drama).not.toHaveProperty('benefit')
  })

  it('uses problem-vs-solution pillars on the Animated Comedy card', () => {
    const animation = enMessages.productionShowcase.cards.find((card) => card.id === 'animation')!
    expect(animation.title).toBe('You Write the Joke. SceneFlow Animates the Punchline.')
    expect(animation.subtitle).toBe(
      'Eliminate style drift, stiff movement, and broken timing. Turn hilarious scripts into fully animated, voice-synced comedy episodes in one seamless studio.'
    )
    expect(animation.solutionPillars).toHaveLength(4)
    expect(animation.solutionPillars?.[0]?.title).toBe('Stylistic Consistency')
    expect(animation.solutionPillars?.[2]?.frictionHeadline).toBe('Ruined Punchlines.')
    expect(animation).not.toHaveProperty('workflow')
    expect(animation).not.toHaveProperty('benefit')
  })

  it('uses problem-vs-solution pillars on the AI-First Podcast card', () => {
    const podcast = enMessages.productionShowcase.cards.find((card) => card.id === 'podcast')!
    expect(podcast.title).toBe('You Host the Conversation. SceneFlow Produces the Show.')
    expect(podcast.subtitle).toBe(
      'Eliminate static avatars and manual video editing. Transform scripts or raw audio into multi-angle, broadcast-ready video podcasts in one automated pipeline.'
    )
    expect(podcast.solutionPillars).toHaveLength(4)
    expect(podcast.solutionPillars?.[0]?.title).toBe('Multi-Speaker & Avatar Identity')
    expect(podcast.solutionPillars?.[0]?.frictionHeadline).toBe('Robotic Avatars & Lost Identity')
    expect(podcast.solutionPillars?.[0]?.solutionHeadline).toBe('Locked Host & Guest Profiles')
    expect(podcast.solutionPillars?.[3]?.title).toBe('Long-Form Audio & Video Sync')
    expect(podcast.solutionPillars?.[3]?.solutionHeadline).toBe('End-to-End Podcast Pipeline')
    expect(podcast).not.toHaveProperty('workflow')
    expect(podcast).not.toHaveProperty('benefit')
  })

  it('keeps card ids stable so ?production= values do not silently change', () => {
    expect(enMessages.productionShowcase.cards.map((card) => card.id)).toEqual([
      'drama',
      'animation',
      'podcast',
      'training',
    ])
  })

  it('matches the generated English base, so i18n:build-en is a no-op here', () => {
    expect(enMessages.productionShowcase).toEqual(
      JSON.parse(JSON.stringify(PRODUCTION_SHOWCASE_COPY))
    )
  })

  it('uses Solutions and Screening Room as media tab labels', () => {
    expect(enMessages.productionShowcase.introVideoLabel).toBe('Solutions')
    expect(enMessages.productionShowcase.screeningRoomLabel).toBe('Screening Room')
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
    // Narration outruns the generated clip, so each block has to say which
    // frame it settles into and when.
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
      // A line without a count is a line nobody can time.
      expect(claimed, `${kind} line is missing its word count`).toBeTruthy()

      const spoken = body
        .replace(/\*\([^)]*\)\*/g, '')
        .replace(/<br>/g, ' ')
        .replace(/\*\*[A-Z0-9-]+:\*\*/g, '')
        .replace(/[*_]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        // Standalone dashes are punctuation, not spoken words.
        .filter((token) => !/^[—–·-]+$/.test(token))

      expect(spoken.length, `${kind} "${spoken.slice(0, 4).join(' ')}…" count drifted`).toBe(
        Number(claimed![1])
      )

      // Default to the full block; segmented lines declare their own window.
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
    expect(card).not.toContain('md:hidden')
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

    // Placeholders must carry no src, so the player shows "coming soon"
    // rather than requesting a 404.
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

  it('leaves podcast and training without a player until dubs exist', () => {
    for (const cardId of ['podcast', 'training']) {
      expect(hasProductionShowcaseVideo(cardId), `${cardId} should have no video`).toBe(false)
      expect(getProductionShowcaseVideoLocales(cardId)).toHaveLength(7)
    }
  })

  it('renders the multi-language player and passes locale labels through', () => {
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')
    expect(section).toContain('getProductionShowcaseVideoLocales(card.id)')
    expect(section).toContain('getDefaultProductionShowcaseLocale(card.id)')

    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    expect(card).toContain('MultiLanguageVideoPlayer')
  })

  it('uses a compact overlay language control instead of marketing pills', () => {
    const picker = readSource('src/components/landing/VideoLanguagePicker.tsx')
    const player = readSource('src/components/landing/MultiLanguageVideoPlayer.tsx')
    const hero = readSource('src/app/components/HeroSection.tsx')

    expect(picker).toContain('export function VideoLanguageControl')
    expect(picker).toContain('DropdownMenuTrigger')
    expect(picker).toContain('disabled={!locale.available}')
    expect(picker).not.toContain('flex-wrap')
    expect(picker).not.toContain('flex-nowrap')
    expect(picker).not.toContain('videoLanguageCount')
    expect(picker).toContain('onOpenChange')
    expect(picker).toContain('onCloseAutoFocus')

    expect(player).toContain('VideoLanguageControl')
    expect(player).toContain('variant="overlay"')
    expect(player).not.toContain('languagePromptLabel')
    expect(player).not.toContain('compactPickerUpTo')

    expect(hero).toContain('VideoLanguageControl')
    expect(hero).not.toContain('HeroLanguagePills')
    expect(hero).not.toContain('multilangHint')
    expect(hero).not.toContain('languagePrompt')
    expect(hero).toContain('suppressTheaterOpenUntilRef')
    expect(hero).toContain('handleLanguageMenuOpenChange')
    expect(hero).toContain('tryOpenTheater')
  })

  it('mounts the language control on the video frame for production cards', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    const player = readSource('src/components/landing/MultiLanguageVideoPlayer.tsx')

    expect(card).not.toContain('compactPickerUpTo')
    expect(card).not.toContain('videoLanguagePromptLabel')
    expect(player).toContain('relative aspect-video')
    expect(player).toContain('variant="overlay"')
  })

  it('letterboxes rather than crops, whatever ratio a future dub ships at', () => {
    const player = readSource('src/components/landing/MultiLanguageVideoPlayer.tsx')
    expect(player).toContain('object-contain')
    expect(player).not.toContain('object-cover')
  })

  it('lets the frame escape the card padding on phones', () => {
    const player = readSource('src/components/landing/MultiLanguageVideoPlayer.tsx')
    expect(player).toContain('fullBleedOnMobile')

    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    expect(card).toContain('fullBleedOnMobile')
    // Grid items default to min-width:auto, so a wide child could otherwise
    // widen the whole column.
    expect(card).toContain('min-w-0')
  })

  it('provides the video player copy the section reads', () => {
    for (const key of ['videoComingSoon', 'videoSoon'] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
    }
  })

  it('mounts Solutions and Screening Room tabs on every production card', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')
    const section = readSource('src/components/landing/ProductionExamplesSection.tsx')

    expect(card).toContain('TabsTrigger')
    expect(card).toContain('TabsContent')
    expect(card).toContain('MultiLanguageVideoPlayer')
    expect(card).toContain('ScreeningRoomPreview')
    expect(card).toContain('screeningRoomPreview')
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
    expect(section).toContain('getProductionShowcaseScreeningSlug')
  })
})

describe('Use Cases landing section layout', () => {
  it('shows persona copy above navigation and drops Solution/Screening tabs', () => {
    const section = readSource('src/components/landing/UseCasesSection.tsx')

    expect(section).toContain("active?.headline")
    expect(section).toContain("active?.intro")
    expect(section).toContain('setActivePersona')
    expect(section).not.toContain('TabsTrigger')
    expect(section).not.toContain('tabScreening')
    expect(section).not.toContain('ScreeningRoomPreview')
    expect(section).not.toContain('getLandingYoutubeCreatorScreeningSlug')
  })

  it('renders story columns as accessible bullet lists without metric badges', () => {
    const section = readSource('src/components/landing/UseCasesSection.tsx')

    expect(section).toContain('StoryBulletList')
    expect(section).toContain('role="list"')
    expect(section).toContain('active.story.problem')
    expect(section).toContain('active.story.solution')
    expect(section).toContain('active.story.outcome')
    expect(section).not.toContain('metric.before')
    expect(section).not.toContain('line-through')
  })

  it('stores three story bullets per persona column in English messages', () => {
    for (const persona of enMessages.useCasesShowcase.personas) {
      const story = persona.story
      expect(story, `${persona.id} missing story`).toBeDefined()
      expect(story?.problem, `${persona.id} problem`).toHaveLength(3)
      expect(story?.solution, `${persona.id} solution`).toHaveLength(3)
      expect(story?.outcome, `${persona.id} outcome`).toHaveLength(3)
      expect(story).not.toHaveProperty('metric')
    }
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
