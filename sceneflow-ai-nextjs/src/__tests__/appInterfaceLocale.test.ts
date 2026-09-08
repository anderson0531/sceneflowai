import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The app interface is English unless the user picks a language in-app.
 *
 * Blueprint Studio was reported as "broken with Spanish sections". The English
 * catalogs were clean; the app was inferring a locale from the marketing cookie
 * or the browser, and because only a fraction of Blueprint components read from
 * the catalog, a non-English resolution translated part of the screen and left
 * the rest hardcoded English. These tests pin every inheritance path shut.
 */

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const cookieJar = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name)
      return value ? { name, value } : undefined
    },
  }),
  headers: async () => {
    throw new Error('resolveUiLocale must not read request headers')
  },
}))

import { resolveUiLocale } from '@/i18n/serverLocale'
import { isAppSurfacePath, matchAcceptLanguage } from '@/i18n/locale'

describe('resolveUiLocale', () => {
  beforeEach(() => cookieJar.clear())

  it('honours an explicit in-app choice', async () => {
    cookieJar.set('sf-locale', 'es')
    await expect(resolveUiLocale()).resolves.toBe('es')
  })

  it('ignores the marketing landing cookie', async () => {
    cookieJar.set('sf-landing-locale', 'es')
    await expect(resolveUiLocale()).resolves.toBe('en')
  })

  it('prefers the in-app choice over the landing cookie', async () => {
    cookieJar.set('sf-locale', 'de')
    cookieJar.set('sf-landing-locale', 'es')
    await expect(resolveUiLocale()).resolves.toBe('de')
  })

  // The header mock throws, so this also proves Accept-Language is never read.
  it('defaults to English with no cookies at all', async () => {
    await expect(resolveUiLocale()).resolves.toBe('en')
  })

  it('ignores an unsupported cookie value', async () => {
    cookieJar.set('sf-locale', 'kl')
    await expect(resolveUiLocale()).resolves.toBe('en')
  })
})

describe('isAppSurfacePath', () => {
  it('covers the authenticated studios', () => {
    expect(isAppSurfacePath('/dashboard')).toBe(true)
    expect(isAppSurfacePath('/dashboard/studio/abc')).toBe(true)
  })

  it('leaves marketing and share routes to the landing cookie', () => {
    expect(isAppSurfacePath('/')).toBe(false)
    expect(isAppSurfacePath('/es')).toBe(false)
    expect(isAppSurfacePath('/pricing')).toBe(false)
    expect(isAppSurfacePath('/blueprint/share/tok')).toBe(false)
    expect(isAppSurfacePath(null)).toBe(false)
  })
})

describe('the client-side locale readers agree with the server', () => {
  it('gates the pre-paint landing fallback to non-app paths', () => {
    const script = readSource('src/components/i18n/DocumentLocaleScript.tsx')
    expect(script).toContain('APP_SURFACE_PATH_PREFIX')
    // The landing cookie is only consulted when the path check fails.
    expect(script).toMatch(
      /if\(!l&&location\.pathname\.indexOf\(.+\)!==0\)\{l=v\[.*LANDING_LOCALE_COOKIE/
    )
  })

  // <html lang> can hold a marketing locale after a client-side navigation out
  // of the landing page, so neither reader may trust it on an app surface.
  it('makes resolveClientUiLocale ignore a stale html lang on app surfaces', () => {
    const hook = readSource('src/i18n/useUiLocale.ts')
    const start = hook.indexOf('export function resolveClientUiLocale')
    expect(start).toBeGreaterThan(0)
    const body = hook.slice(start, hook.indexOf('\n}', start))
    expect(body).toContain('isAppSurfacePath')
    expect(body.indexOf('isAppSurfacePath')).toBeLessThan(
      body.indexOf('documentElement.lang')
    )
  })

  it('makes ClientAppMessagesProvider read the cookie on app surfaces', () => {
    const provider = readSource('src/components/i18n/ClientAppMessagesProvider.tsx')
    expect(provider).toContain('isAppSurfacePath(pathname)')
    expect(provider).toContain('readUiLocaleCookie()')
  })
})

describe('GET /api/user/locale', () => {
  const route = readSource('src/app/api/user/locale/route.ts')

  it('reports English rather than an Accept-Language guess when unset', () => {
    expect(route).toContain(
      'const uiLocale = isLocale(user.preferred_locale) ? user.preferred_locale : DEFAULT_LOCALE'
    )
    expect(route).not.toContain('matchAcceptLanguage')
  })

  it('still distinguishes an explicit choice from a default', () => {
    expect(route).toContain('isExplicit: isLocale(user.preferred_locale)')
  })
})

describe('matchAcceptLanguage still parses headers correctly', () => {
  // Kept as a utility even though app locale resolution no longer calls it.
  it('honours quality weights', () => {
    expect(matchAcceptLanguage('de;q=0.5, ja;q=0.9')).toBe('ja')
    expect(matchAcceptLanguage('xh, mi')).toBeUndefined()
  })
})

describe('the English catalogs contain only English', () => {
  const enDir = path.join(ROOT, 'messages/app/en')
  const files = readdirSync(enDir).filter((f) => f.endsWith('.json'))

  function collectStrings(value: unknown, keyPath: string, out: [string, string][]) {
    if (typeof value === 'string') {
      out.push([keyPath, value])
      return
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        collectStrings(child, keyPath ? `${keyPath}.${key}` : key, out)
      }
    }
  }

  it('ships catalogs to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s has no non-Latin script', (file) => {
    const parsed = JSON.parse(readFileSync(path.join(enDir, file), 'utf8'))
    const strings: [string, string][] = []
    collectStrings(parsed, '', strings)

    // Arabic, Hebrew, Devanagari, Thai, Han, Hiragana/Katakana, Hangul, Cyrillic.
    const nonLatin =
      /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/
    const offenders = strings.filter(([, text]) => nonLatin.test(text))
    expect(offenders).toEqual([])
  })

  /**
   * Latin-script leaks are the realistic regression: a Spanish or Portuguese
   * string pasted into the English file. These words are unambiguous in those
   * languages and do not occur in English UI copy.
   */
  it.each(files)('%s has no Spanish or Portuguese giveaways', (file) => {
    const parsed = JSON.parse(readFileSync(path.join(enDir, file), 'utf8'))
    const strings: [string, string][] = []
    collectStrings(parsed, '', strings)

    const giveaways = [
      'guion',
      'guión',
      'proyecto',
      'personaje',
      'configuración',
      'ajustes',
      'guardando',
      'guardado',
      'cargando',
      'idioma',
      'siguiente',
      'anterior',
      'buscar',
      'cerrar',
      'eliminar',
      'está',
      'según',
      'también',
      'usuario',
      'contraseña',
      'crear',
      'nuevo',
      'nueva',
    ]
    const pattern = new RegExp(`\\b(${giveaways.join('|')})\\b`, 'i')

    const offenders = strings
      .filter(([, text]) => pattern.test(text))
      .map(([key, text]) => `${key}: ${text}`)
    expect(offenders).toEqual([])
  })

  it('flags inverted punctuation, which English never uses', () => {
    const offenders: string[] = []
    for (const file of files) {
      const parsed = JSON.parse(readFileSync(path.join(enDir, file), 'utf8'))
      const strings: [string, string][] = []
      collectStrings(parsed, '', strings)
      for (const [key, text] of strings) {
        if (/[¿¡]/.test(text)) offenders.push(`${file} ${key}: ${text}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
