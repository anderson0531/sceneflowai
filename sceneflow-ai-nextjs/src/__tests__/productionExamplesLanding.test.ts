import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import {
  USE_CASE_CATEGORY_IDS,
  VIDEO_CATEGORIES,
  buildUseCaseExampleHash,
  parseUseCaseExampleHash,
} from '@/config/landing/useCaseExamples'
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia'

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
})

describe('Production Examples i18n contract', () => {
  it('provides the section header copy the component reads', () => {
    for (const key of ['badge', 'title', 'titleAccent', 'subtitle', 'qualifyingStatement'] as const) {
      expect(enMessages.useCases[key]).toBeTruthy()
    }
  })

  it('provides narration labels under the useCases namespace', () => {
    const { ui } = enMessages.useCases
    expect(ui.playNarration).toBeTruthy()
    expect(ui.pauseNarration).toBeTruthy()
    expect(ui.narrationComingSoon).toBeTruthy()
  })

  it('provides nav labels for the new anchor', () => {
    expect(enMessages.nav.productionExamples).toBeTruthy()
    expect(enMessages.floatingNav.productionExamples).toBeTruthy()
  })

  it('localizes every configured category and example', () => {
    const localized = enMessages.useCases.categories

    expect(localized.map((cat) => cat.id)).toEqual([...USE_CASE_CATEGORY_IDS])

    for (const category of VIDEO_CATEGORIES) {
      const match = localized.find((cat) => cat.id === category.id)
      expect(match, `missing localized category ${category.id}`).toBeDefined()
      expect(match!.examples.map((ex) => ex.id)).toEqual(category.examples.map((ex) => ex.id))

      for (const example of match!.examples) {
        expect(example.label, `${category.id}/${example.id} label`).toBeTruthy()
        expect(example.description, `${category.id}/${example.id} description`).toBeTruthy()
      }
    }
  })
})

describe('Production Examples deep links', () => {
  it('round-trips every example hash', () => {
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
