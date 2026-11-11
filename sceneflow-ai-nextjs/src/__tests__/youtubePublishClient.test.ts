import { describe, expect, it } from 'vitest'
import {
  sanitizeYouTubeDescription,
  sanitizeYouTubeTags,
  sanitizeYouTubeTitle,
  toYouTubeLocalizationCode,
} from '@/lib/publish/youtubeClient'
import {
  buildFallbackMetadata,
  stripKnownSceneFlowCta,
} from '@/lib/publish/youtubeMetadataGenerator'

describe('YouTube publish sanitization & localization helpers', () => {
  it('sanitizes angle brackets and enforces YouTube 100-char title limit', () => {
    expect(sanitizeYouTubeTitle('  Scene <1> & >2<\nDirector Cut  ')).toBe(
      'Scene ‹1› & ›2‹ Director Cut'
    )
    const longTitle = 'A'.repeat(120)
    const truncated = sanitizeYouTubeTitle(longTitle)
    expect(Array.from(truncated).length).toBeLessThanOrEqual(100)
    expect(truncated.endsWith('…')).toBe(true)
    expect(sanitizeYouTubeTitle('   ', 'Fallback Title')).toBe('Fallback Title')
  })

  it('sanitizes angle brackets and enforces YouTube 5000-char description limit', () => {
    expect(sanitizeYouTubeDescription('Watch <Northline> now -> https://sceneflowai.studio')).toBe(
      'Watch ‹Northline› now -› https://sceneflowai.studio'
    )
    const longDesc = 'B'.repeat(5200)
    const truncated = sanitizeYouTubeDescription(longDesc)
    expect(Array.from(truncated).length).toBeLessThanOrEqual(5000)
  })

  it('deduplicates tags, strips invalid characters, and respects YouTube tag budget', () => {
    const tags = sanitizeYouTubeTags([
      'Sci-Fi',
      'sci-fi',
      'Short <Film>',
      '"SceneFlow"',
      '',
      ...Array.from({ length: 50 }, (_, idx) => `Keyword Phrase Number ${idx + 1}`),
    ])
    expect(tags).toBeDefined()
    expect(tags?.[0]).toBe('Sci-Fi')
    expect(tags).toContain('Short Film')
    expect(tags).toContain('SceneFlow')
    const joinedBudget = (tags || []).reduce(
      (sum, tag) => sum + (tag.includes(' ') ? tag.length + 3 : tag.length + 1),
      0
    )
    expect(joinedBudget).toBeLessThanOrEqual(460)
  })

  it('maps SceneFlow language codes to YouTube localization codes', () => {
    expect(toYouTubeLocalizationCode('en')).toBe('en')
    expect(toYouTubeLocalizationCode('es')).toBe('es')
    expect(toYouTubeLocalizationCode('pt')).toBe('pt-BR')
    expect(toYouTubeLocalizationCode('zh')).toBe('zh-CN')
    expect(toYouTubeLocalizationCode('he')).toBe('iw')
    expect(toYouTubeLocalizationCode('th')).toBe('th')
  })

  it('strips existing localized SceneFlow CTA footers and appends target locale CTA cleanly', () => {
    const enMeta = buildFallbackMetadata({
      projectTitle: 'Northline',
      synopsis: 'A lone navigator crosses the ice wall.',
      genre: 'Sci-Fi, Thriller',
      unitKind: 'previs',
      locale: 'en',
    })
    expect(enMeta.title).toContain('Northline')
    expect(enMeta.title).toContain('Pre-Vis')
    expect(enMeta.description).toContain('Created with SceneFlow Studio')

    const stripped = stripKnownSceneFlowCta(enMeta.description)
    expect(stripped).not.toContain('Created with SceneFlow Studio')
    expect(stripped).toContain('A lone navigator crosses the ice wall.')

    const esMeta = buildFallbackMetadata({
      projectTitle: 'Northline',
      synopsis: stripped,
      unitKind: 'previs',
      locale: 'es',
    })
    expect(esMeta.description).toContain('Creado con SceneFlow Studio')
    expect(esMeta.description).not.toContain('Created with SceneFlow Studio')
  })
})
