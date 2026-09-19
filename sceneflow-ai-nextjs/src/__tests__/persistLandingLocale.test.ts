/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { persistLandingLocale, readPersistedLandingLocale } from '@/i18n/persistLandingLocale'
import { LANDING_LOCALE_COOKIE } from '@/i18n/locale'

describe('persistLandingLocale', () => {
  afterEach(() => {
    document.cookie = `${LANDING_LOCALE_COOKIE}=; path=/; max-age=0`
    localStorage.clear()
  })

  it('writes cookie and localStorage for a supported locale', () => {
    persistLandingLocale('th')
    expect(localStorage.getItem(LANDING_LOCALE_COOKIE)).toBe('th')
    expect(readPersistedLandingLocale()).toBe('th')
  })

  it('ignores unsupported locales', () => {
    persistLandingLocale('klingon')
    expect(readPersistedLandingLocale()).toBeUndefined()
  })
})
