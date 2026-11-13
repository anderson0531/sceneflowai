import { describe, it, expect } from 'vitest'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'
import {
  CLIENT_PORTAL_COPY,
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  resolveClientPortalLocale,
  getSpeechLangForPortalLocale,
  formatPortalCopy,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { INTAKE_PLAYBOOKS, isValidIntakeVertical } from '@/lib/intake/intakePlaybooks'

const REQUIRED_LOCALES: ClientPortalLocale[] = ['en', 'es', 'pt', 'hi', 'zh-CN', 'ar', 'th']

function extractPlaceholders(str: string): string[] {
  return Array.from(str.matchAll(/\{([a-zA-Z0-9_]+)\}/g))
    .map((m) => m[1])
    .sort()
}

describe('Client Portal 7-Locale i18n & Playbook Parity (Platform UI Locales)', () => {
  it('matches LANDING_TRANSLATE_LANGUAGES 1-for-1 (including Arabic) with valid BCP-47 speech codes', () => {
    expect(SUPPORTED_CLIENT_PORTAL_LOCALES.map((l) => l.code)).toEqual(
      LANDING_TRANSLATE_LANGUAGES.map((l) => l.code)
    )
    expect(SUPPORTED_CLIENT_PORTAL_LOCALES.map((l) => l.code)).toEqual(REQUIRED_LOCALES)
    expect(getSpeechLangForPortalLocale('en')).toBe('en-US')
    expect(getSpeechLangForPortalLocale('es')).toBe('es-ES')
    expect(getSpeechLangForPortalLocale('pt')).toBe('pt-BR')
    expect(getSpeechLangForPortalLocale('hi')).toBe('hi-IN')
    expect(getSpeechLangForPortalLocale('zh-CN')).toBe('zh-CN')
    expect(getSpeechLangForPortalLocale('ar')).toBe('ar-SA')
    expect(getSpeechLangForPortalLocale('th')).toBe('th-TH')
  })

  it('normalizes regional browser language tags cleanly', () => {
    expect(resolveClientPortalLocale('es-MX')).toBe('es')
    expect(resolveClientPortalLocale('pt-PT')).toBe('pt')
    expect(resolveClientPortalLocale('zh-Hans-CN')).toBe('zh-CN')
    expect(resolveClientPortalLocale('ar-AE')).toBe('ar')
    expect(resolveClientPortalLocale('hi-IN')).toBe('hi')
    expect(resolveClientPortalLocale('th-TH')).toBe('th')
    expect(resolveClientPortalLocale('unknown-XX')).toBe('en')
  })

  it('maintains 100% key and ICU placeholder parity across en, es, pt, hi, zh-CN, and th', () => {
    const enCopy = CLIENT_PORTAL_COPY.en
    const enKeys = Object.keys(enCopy) as Array<keyof typeof enCopy>

    for (const locale of REQUIRED_LOCALES) {
      const target = CLIENT_PORTAL_COPY[locale]
      expect(target).toBeDefined()
      expect(Object.keys(target).sort()).toEqual([...enKeys].sort())

      for (const key of enKeys) {
        expect(target[key].trim().length).toBeGreaterThan(0)
        expect(extractPlaceholders(target[key])).toEqual(extractPlaceholders(enCopy[key]))
      }
    }
  })

  it('interpolates brand and round variables safely via formatPortalCopy', () => {
    const formatted = formatPortalCopy('es', 'roundBadge', { used: 1, max: 2 })
    expect(formatted).toContain('1')
    expect(formatted).toContain('2')
    expect(formatted).not.toContain('{used}')
  })

  it('defines localized opening greetings and vertical titles for all 4 service verticals', () => {
    const verticals = [
      'video_memoir',
      'real_estate_tour',
      'education_module',
      'brand_story',
    ] as const

    for (const v of verticals) {
      expect(isValidIntakeVertical(v)).toBe(true)
      const pb = INTAKE_PLAYBOOKS[v]
      expect(pb.defaultTitlePrefix.trim().length).toBeGreaterThan(0)
      for (const locale of REQUIRED_LOCALES) {
        expect(pb.welcomeByLocale[locale]?.trim().length).toBeGreaterThan(10)
      }
    }
    expect(isValidIntakeVertical('invalid_vertical')).toBe(false)
  })
})
