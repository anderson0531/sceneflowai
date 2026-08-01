import { describe, it, expect } from 'vitest'
import {
  landingLocaleToVideoLocale,
  resolveVideoLocaleForPlayer,
  buildVideoLocales,
  VIDEO_LOCALE_ORDER,
} from '@/config/landing/videoLocales'

describe('landingLocaleToVideoLocale', () => {
  it('maps direct video locale matches', () => {
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(landingLocaleToVideoLocale(id)).toBe(id)
    }
  })

  it('maps Chinese UI locales to zh video bucket', () => {
    expect(landingLocaleToVideoLocale('zh-CN')).toBe('zh')
    expect(landingLocaleToVideoLocale('zh-TW')).toBe('zh')
  })

  it('defaults unsupported UI locales to English', () => {
    expect(landingLocaleToVideoLocale('fr')).toBe('en')
    expect(landingLocaleToVideoLocale('de')).toBe('en')
    expect(landingLocaleToVideoLocale('ja')).toBe('en')
  })
})

describe('resolveVideoLocaleForPlayer', () => {
  it('uses mapped locale when dub is available', () => {
    const locales = buildVideoLocales({
      en: { src: 'https://example.com/en.mp4' },
      th: { src: 'https://example.com/th.mp4' },
    })

    expect(resolveVideoLocaleForPlayer('th', locales)).toBe('th')
  })

  it('falls back to first available when mapped dub is missing', () => {
    const locales = buildVideoLocales({
      en: { src: 'https://example.com/en.mp4' },
      es: { src: 'https://example.com/es.mp4' },
    })

    expect(resolveVideoLocaleForPlayer('th', locales)).toBe('en')
  })

  it('falls back to English for unsupported UI locales', () => {
    const locales = buildVideoLocales({
      en: { src: 'https://example.com/en.mp4' },
      es: { src: 'https://example.com/es.mp4' },
    })

    expect(resolveVideoLocaleForPlayer('fr', locales)).toBe('en')
  })

  it('maps zh-CN to zh when Chinese dub exists', () => {
    const locales = buildVideoLocales({
      en: { src: 'https://example.com/en.mp4' },
      zh: { src: 'https://example.com/zh.mp4' },
    })

    expect(resolveVideoLocaleForPlayer('zh-CN', locales)).toBe('zh')
  })
})
