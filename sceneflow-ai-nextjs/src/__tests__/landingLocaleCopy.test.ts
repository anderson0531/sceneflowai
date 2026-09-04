import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'

const ROOT = join(process.cwd(), 'messages')

const REQUIRED_LANDING_KEYS = [
  'hero.ctaPrimaryLaunch',
  'hero.ctaSecondary',
  'hero.ctaSupportingLine',
  'hero.chips.0.label',
  'hero.chips.0.detail',
  'twoModes.title',
  'twoModes.go.cta',
  'twoModes.director.cta',
  'pricing.title',
  'pricing.subtitle',
  'pricing.explorerHighlight',
  'exitIntent.startNow',
  'finalCta.cta',
  'finalCta.subtitle',
  'finalCta.ctaSecondary',
  'hero.availabilityBadge',
  'notify.heading',
  'notify.submit',
] as const

const EXPLORER_PRICE_KEYS = [
  'twoModes.director.cta',
  'pricing.title',
  'pricing.subtitle',
  'exitIntent.startNow',
  'finalCta.subtitle',
] as const

const OUTDATED_PATTERNS = [
  'August 2026',
  'Summer of Production',
  'July 15',
  'July 22',
  'August 1',
  'Application Window Closes',
  'September cohort',
  'Early Access cohort',
  'Founding Creator',
  '/early-access',
]

function hasExplorerPrice(text: string): boolean {
  return /[9۹]/.test(text)
}

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current == null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[part]
  }, obj)
}

describe('landing locale copy', () => {
  const localeCodes = LANDING_TRANSLATE_LANGUAGES.map((l) => l.code).filter((c) => c !== 'en')
  const localeFiles = readdirSync(ROOT).filter((f) => f.endsWith('.json') && f !== 'en.json')

  it('includes a messages file for every selector locale', () => {
    for (const code of localeCodes) {
      expect(localeFiles).toContain(`${code}.json`)
    }
  })

  it('mirrors launch-critical landing keys in English messages', () => {
    for (const path of REQUIRED_LANDING_KEYS) {
      const value = getAtPath(enMessages, path)
      expect(typeof value).toBe('string')
    }
    for (const path of EXPLORER_PRICE_KEYS) {
      expect(hasExplorerPrice(String(getAtPath(enMessages, path)))).toBe(true)
    }
    expect(String(enMessages.hero.ctaPrimaryLaunch)).toBe('Start Your Production')
    expect(String(enMessages.finalCta.cta)).toBe('Explore plans')
    expect(String(enMessages.finalCta.subtitle)).toContain('$9')
    expect(String(enMessages.hero.availabilityBadge)).toContain('November 2026')
  })

  it('names the footer trust section Trust & Safety in English', () => {
    const footer = enMessages.footer as { legal?: string; links?: { trustSafety?: string } }
    expect(footer.legal).toBe('Trust & Safety')
    expect(footer.legal).not.toBe('Legal')
    expect(footer.links?.trustSafety).toBe('Trust & Safety')
  })

  for (const code of localeCodes) {
    it(`syncs September landing keys for ${code}`, () => {
      const localeMessages = JSON.parse(
        readFileSync(join(ROOT, `${code}.json`), 'utf8')
      ) as Record<string, unknown>

      for (const path of REQUIRED_LANDING_KEYS) {
        const value = getAtPath(localeMessages, path)
        expect(typeof value, `${code} missing ${path}`).toBe('string')
      }

      for (const path of EXPLORER_PRICE_KEYS) {
        expect(hasExplorerPrice(String(getAtPath(localeMessages, path)))).toBe(true)
      }

      const ctaPrimary = String(getAtPath(localeMessages, 'hero.ctaPrimaryLaunch'))
      const finalSubtitle = String(getAtPath(localeMessages, 'finalCta.subtitle'))
      const pricingSubtitle = String(getAtPath(localeMessages, 'pricing.subtitle'))

      expect(ctaPrimary.length).toBeGreaterThan(4)
      expect(finalSubtitle.length).toBeGreaterThan(20)
      expect(pricingSubtitle.length).toBeGreaterThan(20)

      const allStrings = REQUIRED_LANDING_KEYS.map((path) =>
        String(getAtPath(localeMessages, path))
      ).join('\n')
      for (const pattern of OUTDATED_PATTERNS) {
        expect(allStrings).not.toContain(pattern)
      }

      const footer = localeMessages.footer as { legal?: string; links?: { trustSafety?: string } }
      expect(footer.legal, `${code} footer.legal`).toBeTruthy()
      expect(footer.links?.trustSafety, `${code} footer.links.trustSafety`).toBeTruthy()
      expect(footer.legal).toBe(footer.links?.trustSafety)
    })
  }
})
