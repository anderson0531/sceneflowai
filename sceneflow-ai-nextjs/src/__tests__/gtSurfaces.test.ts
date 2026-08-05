import { describe, expect, it } from 'vitest'
import {
  allowsGoogleTranslate,
  localizationModeForPath,
  localizationReasonForPath,
} from '@/config/i18n/gtSurfaces'

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
