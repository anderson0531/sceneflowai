import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { APP_SURFACES, BASE_SURFACE, surfacesForPath } from '@/i18n/appSurfaces'
import { icuArguments } from '@/lib/i18n/glossary'
import { LOCALES } from '@/i18n/locale'
import { buildEnMessages } from '@/i18n/buildEnMessages'

const ROOT = join(__dirname, '..', '..')
const APP_DIR = join(ROOT, 'messages', 'app')

function flatten(
  value: unknown,
  prefix = '',
  out: Record<string, string> = {}
): Record<string, string> {
  if (typeof value === 'string') {
    if (prefix) out[prefix] = value
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, out))
    return out
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out)
    }
  }
  return out
}

function readCatalog(locale: string, surface: string): Record<string, unknown> | null {
  const path = join(APP_DIR, locale, `${surface}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

const ENGLISH = Object.fromEntries(
  APP_SURFACES.map((surface) => [surface, flatten(readCatalog('en', surface))])
) as Record<string, Record<string, string>>

describe('English app catalogs', () => {
  it.each(APP_SURFACES)('messages/app/en/%s.json exists and has keys', (surface) => {
    expect(readCatalog('en', surface)).not.toBeNull()
    expect(Object.keys(ENGLISH[surface]).length).toBeGreaterThan(0)
  })

  it.each(APP_SURFACES)('%s has no empty values', (surface) => {
    const empty = Object.entries(ENGLISH[surface])
      .filter(([, value]) => !value.trim())
      .map(([key]) => key)
    expect(empty).toEqual([])
  })

  it.each(APP_SURFACES)('%s has balanced, parseable ICU braces', (surface) => {
    const broken: string[] = []
    for (const [key, value] of Object.entries(ENGLISH[surface])) {
      const opens = (value.match(/\{/g) ?? []).length
      const closes = (value.match(/\}/g) ?? []).length
      if (opens !== closes) broken.push(`${key}: unbalanced`)
      else if (opens > 0 && icuArguments(value).length === 0) {
        broken.push(`${key}: braces do not parse as ICU`)
      }
    }
    expect(broken).toEqual([])
  })

  it('keeps the base surface small, since it loads on every route', () => {
    const bytes = JSON.stringify(readCatalog('en', BASE_SURFACE)).length
    expect(bytes).toBeLessThan(20_000)
  })
})

/**
 * Translated catalogs arrive incrementally, so the invariant is not "every
 * locale exists" — it is that whatever exists is consistent with English. A
 * missing key falls back to English at runtime; an orphan key or a dropped ICU
 * argument is a real defect.
 */
describe('translated app catalogs', () => {
  const translatedLocales = existsSync(APP_DIR)
    ? readdirSync(APP_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'en')
        .map((entry) => entry.name)
    : []

  it('only contains directories for supported locales', () => {
    const unsupported = translatedLocales.filter((locale) => !LOCALES.includes(locale))
    expect(unsupported).toEqual([])
  })

  for (const locale of translatedLocales) {
    describe(locale, () => {
      it.each(APP_SURFACES)('%s has no keys absent from English', (surface) => {
        const catalog = readCatalog(locale, surface)
        if (!catalog) return
        const orphans = Object.keys(flatten(catalog)).filter(
          (key) => ENGLISH[surface][key] === undefined
        )
        expect(orphans).toEqual([])
      })

      it.each(APP_SURFACES)('%s preserves every ICU argument', (surface) => {
        const catalog = readCatalog(locale, surface)
        if (!catalog) return
        const flat = flatten(catalog)
        const mangled: string[] = []
        for (const [key, value] of Object.entries(flat)) {
          const source = ENGLISH[surface][key]
          if (!source) continue
          const expected = icuArguments(source)
          if (expected.length === 0) continue
          const actual = icuArguments(value)
          if (expected.join('|') !== actual.join('|')) {
            mangled.push(`${key}: expected ${expected.join(',')} got ${actual.join(',')}`)
          }
        }
        expect(mangled).toEqual([])
      })
    })
  }
})

describe('surfacesForPath', () => {
  it('always includes the base surface', () => {
    expect(surfacesForPath('/dashboard')).toContain(BASE_SURFACE)
    expect(surfacesForPath('/totally/unknown')).toEqual([BASE_SURFACE])
  })

  it('maps each studio to its own surface', () => {
    expect(surfacesForPath('/dashboard/studio/abc')).toEqual([BASE_SURFACE, 'blueprint'])
    expect(surfacesForPath('/dashboard/workflow/vision/abc')).toEqual([
      BASE_SURFACE,
      'production',
    ])
    expect(surfacesForPath('/dashboard/series/abc')).toEqual([BASE_SURFACE, 'series'])
    expect(surfacesForPath('/dashboard/settings/profile')).toEqual([BASE_SURFACE, 'settings'])
  })

  it('prefers the longest matching prefix', () => {
    // /dashboard/studio must not resolve to the bare /dashboard entry.
    expect(surfacesForPath('/dashboard/studio')).toEqual([BASE_SURFACE, 'blueprint'])
  })
})

/**
 * Guards the drift that made `npm run i18n:build-en` destructive: four
 * namespaces existed only in the committed JSON, so regenerating deleted them.
 */
describe('landing catalog drift', () => {
  it('buildEnMessages covers every namespace in messages/en.json', () => {
    const committed = JSON.parse(
      readFileSync(join(ROOT, 'messages', 'en.json'), 'utf8')
    ) as Record<string, unknown>
    const built = buildEnMessages() as unknown as Record<string, unknown>

    const missing = Object.keys(committed).filter((key) => !(key in built))
    expect(missing).toEqual([])
  })
})
