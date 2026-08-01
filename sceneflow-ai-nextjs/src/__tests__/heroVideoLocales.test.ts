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

  it('plays all seven hero Blob masters', () => {
    const available = getAvailableHeroVideoLocales().map((locale) => locale.id)

    expect(available).toEqual(VIDEO_LOCALE_ORDER)
    expect(getDefaultHeroVideoSrc()).toContain('Hero%20Video%20(English).mp4')
    expect(getHeroVideoLocale('es')?.src).toContain('Hero%20Video%20(Spanish)%20.mp4')
    expect(getHeroVideoLocale('pt')?.src).toContain('Hero%20Video%20(Portuguese).mp4')
    expect(getHeroVideoLocale('hi')?.src).toContain('Hero%20Video%20(Hindi).mp4')
    expect(getHeroVideoLocale('zh')?.src).toContain('Hero%20Video%20(Chinese).mp4')
    expect(getHeroVideoLocale('ar')?.src).toContain('Hero%20Video%20(Arabic)%20.mp4')
    expect(getHeroVideoLocale('th')?.src).toContain('Hero%20Video%20(Thai)%20.mp4')
    expect(getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)?.available).toBe(true)

    for (const locale of HERO_VIDEO_LOCALES) {
      expect(locale.available).toBe(true)
      expect(locale.src).toBeTruthy()
      expect(locale.poster).toContain('sceneflow-hero-')
      expect(locale.poster).toContain('-poster.jpg')
    }
  })

  it('reserves predictable Blob paths for hero dubs', () => {
    expect(HERO_VIDEO_BLOB_PATHS.en).toBe('Hero Video (English).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.es).toBe('Hero Video (Spanish) .mp4')
    expect(HERO_VIDEO_BLOB_PATHS.th).toBe('Hero Video (Thai) .mp4')
  })

  it('maps hero locales into the shared video player model', () => {
    const locales = getHeroVideoLocalesAsVideoLocales()
    expect(locales).toHaveLength(7)
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(locales.find((locale) => locale.id === id)?.available).toBe(true)
    }
  })
})
