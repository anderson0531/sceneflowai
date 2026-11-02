/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  hasExplicitLandingLocaleChoice,
  persistLandingLocale,
  readPersistedLandingLocale,
} from '@/i18n/persistLandingLocale'
import { LANDING_LOCALE_COOKIE, LANDING_LOCALE_EXPLICIT_COOKIE } from '@/i18n/locale'

describe('persistLandingLocale', () => {
  afterEach(() => {
    document.cookie = `${LANDING_LOCALE_COOKIE}=; path=/; max-age=0`
    document.cookie = `${LANDING_LOCALE_EXPLICIT_COOKIE}=; path=/; max-age=0`
    localStorage.clear()
  })

  it('writes cookie and localStorage for a supported locale without marking explicit by default', () => {
    persistLandingLocale('th')
    expect(localStorage.getItem(LANDING_LOCALE_COOKIE)).toBe('th')
    expect(readPersistedLandingLocale()).toBe('th')
    expect(hasExplicitLandingLocaleChoice()).toBe(false)
  })

  it('marks explicit choice when called from the language switcher', () => {
    persistLandingLocale('es', { explicit: true })
    expect(readPersistedLandingLocale()).toBe('es')
    expect(hasExplicitLandingLocaleChoice()).toBe(true)
  })

  it('ignores unsupported locales', () => {
    persistLandingLocale('klingon')
    expect(readPersistedLandingLocale()).toBeUndefined()
  })
})
