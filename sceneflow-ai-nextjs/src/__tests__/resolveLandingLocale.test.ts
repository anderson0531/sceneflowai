import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { resolveLandingLocaleFromHints } from '@/i18n/resolveLandingLocale'
import { DEFAULT_LANDING_LOCALE } from '@/i18n/locale'

describe('resolveLandingLocaleFromHints', () => {
  it('prefers a valid marketing cookie over Accept-Language', () => {
    expect(
      resolveLandingLocaleFromHints({
        cookie: 'es',
        acceptLanguage: 'ja,en;q=0.8',
      })
    ).toBe('es')
  })

  it('maps regional tags from Accept-Language when no cookie is set', () => {
    expect(
      resolveLandingLocaleFromHints({
        cookie: null,
        acceptLanguage: 'es-MX,es;q=0.9,en;q=0.8',
      })
    ).toBe('es')
  })

  it('selects Japanese from Accept-Language when no cookie is set', () => {
    expect(
      resolveLandingLocaleFromHints({
        acceptLanguage: 'ja,en;q=0.4',
      })
    ).toBe('ja')
  })

  it('ignores an unsupported cookie and falls through to Accept-Language', () => {
    expect(
      resolveLandingLocaleFromHints({
        cookie: 'klingon',
        acceptLanguage: 'pt-BR,pt;q=0.9',
      })
    ).toBe('pt')
  })

  it('defaults to English when nothing matches', () => {
    expect(
      resolveLandingLocaleFromHints({
        cookie: null,
        acceptLanguage: 'xh, mi',
      })
    ).toBe(DEFAULT_LANDING_LOCALE)
  })
})

describe('landing homepage wires Accept-Language without touching the studio', () => {
  const root = join(process.cwd())

  it('resolves `/` from cookie then Accept-Language and redirects first visits', () => {
    const page = readFileSync(join(root, 'src/app/page.tsx'), 'utf8')
    expect(page).toContain('resolveLandingLocaleFromHints')
    expect(page).toContain('accept-language')
    expect(page).toContain('redirect(getLandingLocalePath(locale))')
    expect(page).toContain('LANDING_LOCALE_COOKIE')
  })

  it('persists the detected locale on the marketing client only', () => {
    const landing = readFileSync(join(root, 'src/app/LandingPageClient.tsx'), 'utf8')
    const studioLocale = readFileSync(join(root, 'src/i18n/serverLocale.ts'), 'utf8')
    expect(landing).toContain('PersistLandingLocale')
    expect(studioLocale).not.toContain('matchAcceptLanguage')
    expect(studioLocale).not.toContain('accept-language')
  })
})
