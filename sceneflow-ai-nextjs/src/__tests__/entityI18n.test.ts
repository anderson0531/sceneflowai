import { describe, expect, it } from 'vitest'
import {
  getEntitySourceLocale,
  getOverride,
  mergeEntityI18nIntoMetadata,
  readEntityI18n,
  withOverride,
  withPromotedSourceLocale,
  withoutOverride,
  type EntityI18n,
} from '@/i18n/content/entityI18n'

describe('readEntityI18n', () => {
  it('defaults to English when the entity has no i18n block', () => {
    expect(readEntityI18n({ metadata: {} })).toEqual({ sourceLocale: 'en' })
    expect(readEntityI18n(null)).toEqual({ sourceLocale: 'en' })
    expect(getEntitySourceLocale(undefined)).toBe('en')
  })

  it('reads a stored source locale and overrides', () => {
    const entity = {
      metadata: {
        i18n: {
          sourceLocale: 'ja',
          overrides: { es: { 'treatmentVariants[A].logline': 'Un gancho' } },
        },
      },
    }
    const i18n = readEntityI18n(entity)
    expect(i18n.sourceLocale).toBe('ja')
    expect(getOverride(i18n, 'es', 'treatmentVariants[A].logline')).toBe('Un gancho')
  })

  it('rejects an unsupported stored locale rather than propagating it', () => {
    expect(readEntityI18n({ metadata: { i18n: { sourceLocale: 'xx' } } }).sourceLocale).toBe(
      'en'
    )
  })
})

describe('overrides', () => {
  const base: EntityI18n = { sourceLocale: 'en' }

  it('records a human wording without touching the source', () => {
    const next = withOverride(base, 'de', 'treatmentVariants[A].logline', 'Ein Haken')
    expect(next.sourceLocale).toBe('en')
    expect(getOverride(next, 'de', 'treatmentVariants[A].logline')).toBe('Ein Haken')
  })

  it('does not mutate the input', () => {
    withOverride(base, 'de', 'a.b', 'x')
    expect(base.overrides).toBeUndefined()
  })

  it('keeps overrides for different locales separate', () => {
    const withDe = withOverride(base, 'de', 'a.b', 'Ein Haken')
    const withBoth = withOverride(withDe, 'fr', 'a.b', 'Un crochet')
    expect(getOverride(withBoth, 'de', 'a.b')).toBe('Ein Haken')
    expect(getOverride(withBoth, 'fr', 'a.b')).toBe('Un crochet')
  })

  it('treats an empty override as absent', () => {
    const next = withOverride(base, 'de', 'a.b', '')
    expect(getOverride(next, 'de', 'a.b')).toBeUndefined()
  })

  it('prunes the locale entry when its last override is removed', () => {
    const withDe = withOverride(base, 'de', 'a.b', 'Ein Haken')
    const removed = withoutOverride(withDe, 'de', 'a.b')
    expect(removed.overrides?.de).toBeUndefined()
  })
})

describe('withPromotedSourceLocale', () => {
  it('drops every derived translation when the creator takes over a language', () => {
    const start = withOverride({ sourceLocale: 'en' }, 'ja', 'a.b', '手がかり')
    const promoted = withPromotedSourceLocale(start, 'ja')
    expect(promoted.sourceLocale).toBe('ja')
    // Overrides for the promoted locale are now the content itself, and every
    // other locale's translation is stale.
    expect(promoted.overrides).toBeUndefined()
  })
})

describe('mergeEntityI18nIntoMetadata', () => {
  it('replaces only the i18n key so sibling metadata survives', () => {
    const merged = mergeEntityI18nIntoMetadata(
      { visionPhase: { script: 'keep me' }, i18n: { sourceLocale: 'en' } },
      { sourceLocale: 'pt' }
    )
    expect(merged.visionPhase).toEqual({ script: 'keep me' })
    expect(merged.i18n).toEqual({ sourceLocale: 'pt' })
  })
})
