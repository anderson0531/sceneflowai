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
      source.indexOf('<PipelinePillarsSection />')
    )
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
})

describe('Production Examples i18n contract', () => {
  it('provides the section header and CTA copy the component reads', () => {
    for (const key of [
      'badge',
      'title',
      'titleAccent',
      'subtitle',
      'workflowLabel',
      'toolsLabel',
      'startProduction',
      'cta',
      'continuityNote',
      'resonanceNote',
      'playNarration',
      'pauseNarration',
      'narrationComingSoon',
    ] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
    }
  })

  it('brands the section as Production Examples rather than use cases', () => {
    expect(enMessages.productionShowcase.badge).toBe('Production Examples')
  })

  it('ships exactly four fully populated production cards', () => {
    const { cards } = enMessages.productionShowcase

    expect(cards).toHaveLength(4)

    for (const card of cards) {
      for (const key of ['id', 'title', 'subtitle', 'badge', 'tools', 'benefit'] as const) {
        expect(card[key], `${card.id} ${key}`).toBeTruthy()
      }
      expect(card.workflow, `${card.id} workflow`).toHaveLength(4)
      for (const step of card.workflow) {
        expect(step, `${card.id} workflow step`).toBeTruthy()
      }
    }
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

  it('keeps the card CTA reachable without hover', () => {
    const card = readSource('src/components/landing/ProductionStyleCard.tsx')

    // The in-flow button carries the CTA on touch; the overlay is desktop-only.
    expect(card).toContain('md:hidden')
    expect(card).toContain('md:group-hover:opacity-100')
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

  it('marks English, Spanish, Portuguese, and Hindi produced and the rest as placeholders', () => {
    const locales = getProductionShowcaseVideoLocales('drama')
    const available = locales.filter((locale) => locale.available).map((locale) => locale.id)
    const placeholders = locales.filter((locale) => !locale.available).map((locale) => locale.id)

    expect(available).toEqual(['en', 'es', 'pt', 'hi'])
    expect(placeholders).toEqual(['zh', 'ar', 'th'])

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
  })

  it('defaults to English and reports the card as having video', () => {
    expect(getDefaultProductionShowcaseLocale('drama')).toBe('en')
    expect(hasProductionShowcaseVideo('drama')).toBe(true)
  })

  it('leaves the other cards without a player until dubs exist', () => {
    for (const cardId of ['animation', 'podcast', 'training']) {
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

  it('provides the video picker copy the section reads', () => {
    for (const key of ['videoLanguagePrompt', 'videoComingSoon', 'videoSoon'] as const) {
      expect(enMessages.productionShowcase[key], `missing productionShowcase.${key}`).toBeTruthy()
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
