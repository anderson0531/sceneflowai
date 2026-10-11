import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  allowsGoogleTranslate,
  localizationModeForPath,
  localizationReasonForPath,
} from '@/config/i18n/gtSurfaces'
import { keepsEnglishUntilTranslate } from '@/i18n/locale'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

/**
 * These assertions are the guard on the hard constraint from the plan: Google
 * Translate mutates DOM text nodes underneath React, so it must never be offered
 * on an interactive studio route. A regression here surfaces as
 * `removeChild` crashes and corrupted input values, which is very hard to trace
 * back to a config change.
 */
describe('studio routes never allow the translate widget', () => {
  const studioRoutes = [
    '/dashboard',
    '/dashboard/projects',
    '/dashboard/studio',
    '/dashboard/studio/new-project',
    '/dashboard/studio/abc-123',
    '/dashboard/workflow',
    '/dashboard/workflow/vision/abc-123',
    '/dashboard/workflow/pre-vis',
    '/dashboard/series',
    '/dashboard/series/abc-123',
    '/dashboard/settings',
    '/dashboard/settings/profile',
  ]

  it.each(studioRoutes)('%s uses catalogs', (route) => {
    expect(localizationModeForPath(route)).toBe('catalog')
    expect(allowsGoogleTranslate(route)).toBe(false)
  })
})

describe('read-mostly routes allow the translate widget', () => {
  const readMostly = [
    '/share/abc',
    '/blueprint/share/abc',
    '/embed/storyboard/abc',
    '/collaborate/abc',
    '/screening-room',
    '/privacy',
    '/terms',
    '/trust-safety',
    '/dashboard/help',
  ]

  it.each(readMostly)('%s allows opt-in translation', (route) => {
    expect(allowsGoogleTranslate(route)).toBe(true)
  })
})

describe('internal tooling is excluded entirely', () => {
  it.each(['/admin', '/admin/dol/analytics', '/setup-database', '/api/projects'])(
    '%s is none',
    (route) => {
      expect(localizationModeForPath(route)).toBe('none')
    }
  )
})

describe('prefix resolution', () => {
  it('prefers the longest matching prefix', () => {
    // /dashboard/help must not inherit /dashboard's catalog mode.
    expect(localizationModeForPath('/dashboard/help')).toBe('gt')
    expect(localizationModeForPath('/dashboard')).toBe('catalog')
  })

  it('defaults unknown routes to catalogs rather than the widget', () => {
    expect(localizationModeForPath('/some/new/route')).toBe('catalog')
  })

  it('records a reason for every rule, so the next person does not undo it', () => {
    for (const route of ['/dashboard/workflow', '/share/abc', '/admin']) {
      expect(localizationReasonForPath(route)).toBeTruthy()
    }
  })
})

describe('demo share pages stay English until a language is chosen', () => {
  it('does not inherit the marketing locale on pipeline review routes', () => {
    expect(keepsEnglishUntilTranslate('/share/script-resonance/abc')).toBe(true)
    expect(keepsEnglishUntilTranslate('/blueprint/share/abc')).toBe(true)
    expect(keepsEnglishUntilTranslate('/s/series/abc')).toBe(true)
    expect(keepsEnglishUntilTranslate('/privacy')).toBe(false)
    expect(keepsEnglishUntilTranslate('/dashboard')).toBe(false)
  })

  it('loads the Google script only after an explicit selection', () => {
    const control = readSource('src/components/i18n/PageTranslateControl.tsx')
    expect(control).toContain('active ? <GoogleTranslate /> : null')
    expect(control).toContain('clearStoredTranslation()')
    expect(control).not.toContain('readActiveLocale')
    expect(control).toContain("setAttribute('translate', 'no')")
  })
})
