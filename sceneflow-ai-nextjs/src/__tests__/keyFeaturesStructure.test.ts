import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { FEATURE_ICONS } from '@/components/landing/keyFeatureIcons'

const ROOT = path.resolve(__dirname, '../..')

function loadKeyFeaturesCategories(): Array<{
  id: string
  label: string
  features: Array<{ icon: string; title: string }>
}> {
  const en = JSON.parse(readFileSync(path.join(ROOT, 'messages/en.json'), 'utf8'))
  return en.keyFeatures.categories
}

const EXPECTED_TITLES: Record<string, string[]> = {
  create: [
    'Bring Your Own Key (BYOK)',
    'Production Budget Management',
    'Series Studio',
    'Blueprint Studio',
  ],
  direct: [
    "Writer's Room",
    'Audience Resonance Analysis (ARA)',
    'Intelligent Reference Library',
    'Intelligent Assistant Director (IAD)',
    'Multilanguage Streams',
    'Express Generation',
    'Screening Room',
  ],
  ship: [
    'Delivery-Quality Upscale',
    'Version Control',
    'Promotion Trailers',
    'YouTube Publishing',
  ],
}

describe('keyFeatures structure', () => {
  const categories = loadKeyFeaturesCategories()

  it('has Plan, Create, and Release category labels in order', () => {
    expect(categories.map((c) => c.id)).toEqual(['create', 'direct', 'ship'])
    expect(categories.map((c) => c.label)).toEqual(['Plan', 'Create', 'Release'])
  })

  it('has 4, 7, and 4 features per category', () => {
    expect(categories.map((c) => c.features.length)).toEqual([4, 7, 4])
  })

  it('matches intended feature titles per category', () => {
    for (const category of categories) {
      const titles = category.features.map((f) => f.title)
      expect(titles).toEqual(EXPECTED_TITLES[category.id])
    }
  })

  it('maps every feature icon key to FEATURE_ICONS', () => {
    const icons = categories.flatMap((c) => c.features.map((f) => f.icon))
    for (const icon of icons) {
      expect(FEATURE_ICONS[icon]).toBeDefined()
    }
    expect(Object.keys(FEATURE_ICONS).sort()).toEqual([...new Set(icons)].sort())
  })

  it('includes learnMore on every English feature', () => {
    const en = JSON.parse(readFileSync(path.join(ROOT, 'messages/en.json'), 'utf8'))
    for (const category of en.keyFeatures.categories) {
      for (const feature of category.features) {
        expect(feature.learnMore?.problem).toBeTruthy()
        expect(feature.learnMore?.solution).toBeTruthy()
        expect(feature.learnMore?.outcome).toBeTruthy()
      }
    }
  })

  it('mounts a multi-language video player on every feature card', () => {
    const section = readFileSync(
      path.join(ROOT, 'src/components/landing/KeyFeaturesSection.tsx'),
      'utf8'
    )
    expect(section).toContain('MultiLanguageVideoPlayer')
    expect(section).toContain('getKeyFeatureVideoLocales(feature.icon)')
    expect(section).toContain("t('videoComingSoon')")
    expect(section).toContain("t('videoSoon')")
  })

  it('lists landing UI languages inside the multilanguage Learn more panel', () => {
    const section = readFileSync(
      path.join(ROOT, 'src/components/landing/KeyFeaturesSection.tsx'),
      'utf8'
    )
    const en = JSON.parse(readFileSync(path.join(ROOT, 'messages/en.json'), 'utf8'))
    expect(en.keyFeatures.landingUiLanguagesLabel).toBe(
      'UI and Productions Available in 39 Languages'
    )
    expect(section).toContain('LANDING_TRANSLATE_LANGUAGES')
    expect(section).toContain("feature.icon === 'multilanguage'")
    expect(section).toContain("t('landingUiLanguagesLabel')")
    expect(section).toContain("t('outcomeLabel')")

    const descriptionEnd = section.indexOf('{feature.description}')
    const videoStart = section.indexOf('<MultiLanguageVideoPlayer')
    const languagesBlock = section.indexOf('<LandingUiLanguagesBlock')
    expect(descriptionEnd).toBeGreaterThan(-1)
    expect(videoStart).toBeGreaterThan(descriptionEnd)
    expect(languagesBlock).toBeGreaterThan(section.indexOf("t('outcomeLabel')"))
    const betweenDescriptionAndVideo = section.slice(descriptionEnd, videoStart)
    expect(betweenDescriptionAndVideo).not.toContain('LandingUiLanguagesBlock')
  })
})
