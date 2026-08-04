import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  getLocaleDirection,
  LOCALES,
  matchAcceptLanguage,
  normalizeLocale,
  RTL_LOCALES,
} from '@/i18n/locale'
import { PLATFORM_LANGUAGES } from '@/config/landingTranslateLanguages'

const ROOT = join(__dirname, '..', '..')

describe('getLocaleDirection', () => {
  it('marks the four RTL locales', () => {
    expect([...RTL_LOCALES].sort()).toEqual(['ar', 'fa', 'he', 'ur'])
    for (const locale of RTL_LOCALES) {
      expect(getLocaleDirection(locale)).toBe('rtl')
    }
  })

  it('leaves every other locale LTR', () => {
    for (const locale of LOCALES) {
      if (RTL_LOCALES.has(locale)) continue
      expect(getLocaleDirection(locale)).toBe('ltr')
    }
  })
})

describe('normalizeLocale', () => {
  it('accepts exact matches', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh-CN')
    expect(normalizeLocale('pt')).toBe('pt')
  })

  it('is case insensitive', () => {
    expect(normalizeLocale('ZH-cn')).toBe('zh-CN')
  })

  it('resolves regional variants to their base locale', () => {
    expect(normalizeLocale('es-419')).toBe('es')
    expect(normalizeLocale('pt-BR')).toBe('pt')
    expect(normalizeLocale('en-GB')).toBe('en')
  })

  it('routes script-qualified Chinese to the right variant', () => {
    expect(normalizeLocale('zh-Hans-CN')).toBe('zh-CN')
    expect(normalizeLocale('zh-Hant-TW')).toBe('zh-TW')
    expect(normalizeLocale('zh-HK')).toBe('zh-TW')
    expect(normalizeLocale('zh')).toBe('zh-CN')
  })

  it('returns undefined for unsupported tags', () => {
    expect(normalizeLocale('xh')).toBeUndefined()
    expect(normalizeLocale('')).toBeUndefined()
    expect(normalizeLocale(undefined)).toBeUndefined()
  })
})

describe('matchAcceptLanguage', () => {
  it('honours quality weights rather than header order', () => {
    expect(matchAcceptLanguage('de;q=0.5, ja;q=0.9')).toBe('ja')
  })

  it('skips unsupported languages to find a supported one', () => {
    expect(matchAcceptLanguage('xh, mi;q=0.9, fr;q=0.8')).toBe('fr')
  })

  it('ignores zero-weighted and wildcard entries', () => {
    expect(matchAcceptLanguage('fr;q=0, *')).toBeUndefined()
  })

  it('returns undefined when nothing matches, so callers can fall back', () => {
    expect(matchAcceptLanguage('xh, mi')).toBeUndefined()
    expect(matchAcceptLanguage(null)).toBeUndefined()
  })
})

describe('language registry', () => {
  it('ships at least the 30 languages the reach goal calls for', () => {
    expect(PLATFORM_LANGUAGES.length).toBeGreaterThanOrEqual(30)
  })

  it('gives every language an endonym and an English exonym', () => {
    const incomplete = PLATFORM_LANGUAGES.filter(
      (language) => !language.name?.trim() || !language.englishName?.trim()
    )
    expect(incomplete).toEqual([])
  })

  it('has no duplicate codes', () => {
    const codes = PLATFORM_LANGUAGES.map((language) => language.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

/**
 * next/font loads only the Latin subset, so any locale whose script is not Latin
 * needs an explicit `:lang()` font stack or it renders as fallback boxes.
 */
describe('script coverage', () => {
  const css = readFileSync(join(ROOT, 'src', 'app', 'globals.css'), 'utf8')

  const NON_LATIN_LOCALES = [
    'th',
    'hi',
    'bn',
    'am',
    'ar',
    'he',
    'fa',
    'ur',
    'zh-CN',
    'zh-TW',
    'ja',
    'ko',
  ]

  it.each(NON_LATIN_LOCALES)('%s has a font stack', (locale) => {
    expect(css).toContain(`html:lang(${locale})`)
  })

  it('raises line height for the scripts that need it', () => {
    for (const locale of ['th', 'hi', 'bn', 'am']) {
      const block = css.slice(css.indexOf(`html:lang(${locale})`))
      expect(block.slice(0, 400)).toMatch(/line-height:\s*1\.[78]/)
    }
  })

  it('keeps timelines visually left-to-right in RTL', () => {
    // A timeline represents time, not reading order; mirroring it would reverse
    // the meaning of the panel.
    expect(css).toContain('[data-timeline]')
    expect(css).toMatch(/html\[dir="rtl"\][^{]*\[data-ltr-layout\]/)
  })

  it('keeps prompt fields left-to-right, since their content is English', () => {
    expect(css).toContain('html[dir="rtl"] textarea[translate="no"]')
  })
})
