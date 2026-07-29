import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HERO_VIDEO_LOCALE,
  HERO_VIDEO_BLOB_PATHS,
  HERO_VIDEO_LOCALES,
  getAvailableHeroVideoLocales,
  getDefaultHeroVideoSrc,
  getHeroVideoLocale,
  getHeroVideoLocalesAsVideoLocales,
} from '@/config/landing/heroVideoLocales'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'

describe('Hero video locales', () => {
  it('lists all seven locale pills in display order', () => {
    expect(HERO_VIDEO_LOCALES.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
  })

  it('plays English through Chinese Blob masters with Arabic and Thai marked Soon', () => {
    const available = getAvailableHeroVideoLocales().map((locale) => locale.id)
    const placeholders = HERO_VIDEO_LOCALES.filter((locale) => !locale.available).map(
      (locale) => locale.id
    )

    expect(available).toEqual(['en', 'es', 'pt', 'hi', 'zh', 'ar'])
    expect(placeholders).toEqual(['th'])
    expect(getDefaultHeroVideoSrc()).toContain('Hero%20Video%20(English).mp4')
    expect(getHeroVideoLocale('es')?.src).toContain('Hero%20Video%20(Spanish)%20.mp4')
    expect(getHeroVideoLocale('pt')?.src).toContain('Hero%20Video%20(Portuguese).mp4')
    expect(getHeroVideoLocale('hi')?.src).toContain('Hero%20Video%20(Hindi).mp4')
    expect(getHeroVideoLocale('zh')?.src).toContain('Hero%20Video%20(Chinese).mp4')
    expect(getHeroVideoLocale('ar')?.src).toContain('Hero%20Video%20(Arabic)%20.mp4')
    expect(getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)?.available).toBe(true)

    for (const locale of HERO_VIDEO_LOCALES) {
      if (!locale.available) {
        expect(locale.src).toBe('')
        expect(locale.poster).toBe('')
      }
    }
  })

  it('reserves predictable Blob paths for upcoming hero dubs', () => {
    expect(HERO_VIDEO_BLOB_PATHS.en).toBe('Hero Video (English).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.es).toBe('Hero Video (Spanish) .mp4')
    expect(HERO_VIDEO_BLOB_PATHS.th).toBe('Hero Video (Thai).mp4')
  })

  it('maps hero locales into the shared video player model', () => {
    const locales = getHeroVideoLocalesAsVideoLocales()
    expect(locales).toHaveLength(7)
    expect(locales.find((locale) => locale.id === 'en')?.available).toBe(true)
    expect(locales.find((locale) => locale.id === 'es')?.available).toBe(true)
    expect(locales.find((locale) => locale.id === 'pt')?.available).toBe(true)
    expect(locales.find((locale) => locale.id === 'hi')?.available).toBe(true)
    expect(locales.find((locale) => locale.id === 'zh')?.available).toBe(true)
    expect(locales.find((locale) => locale.id === 'ar')?.available).toBe(true)
  })
})
