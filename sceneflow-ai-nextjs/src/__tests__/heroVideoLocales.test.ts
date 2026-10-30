import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_HERO_VIDEO_LOCALE,
  HERO_PUBLIC_POSTER_FALLBACK,
  HERO_VIDEO_BLOB_PATHS,
  HERO_VIDEO_LOCALE_ORDER,
  HERO_VIDEO_WEB_720P_PATHS,
  HERO_VIDEO_WEB_1080P_PATHS,
  HERO_VIDEO_WEB_WEBM_PATHS,
  HERO_VIDEO_LOCALES,
  getAvailableHeroVideoLocales,
  getDefaultHeroVideoSrc,
  getHeroPublicVideoSources,
  getHeroVideoLocale,
  getHeroVideoLocalesAsVideoLocales,
  resolveHeroVideoLocale,
} from '@/config/landing/heroVideoLocales'

describe('Hero video locales', () => {
  it('lists all seven global locale dubs in display order', () => {
    expect(HERO_VIDEO_LOCALES.map((locale) => locale.id)).toEqual(HERO_VIDEO_LOCALE_ORDER)
  })

  it('plays all seven hero Blob masters', () => {
    const available = getAvailableHeroVideoLocales().map((locale) => locale.id)

    expect(available).toEqual(HERO_VIDEO_LOCALE_ORDER)
    expect(getDefaultHeroVideoSrc()).toContain('Hero%20Video%20(English).mp4')
    expect(getHeroVideoLocale('es')?.src).toContain('Hero%20Video%20(Spanish).mp4')
    expect(getHeroVideoLocale('pt')?.src).toContain('Hero%20Video%20(Portuguese).mp4')
    expect(getHeroVideoLocale('hi')?.src).toContain('Hero%20Video%20(Hindi).mp4')
    expect(getHeroVideoLocale('zh')?.src).toContain('Hero%20Video%20(Chinese).mp4')
    expect(getHeroVideoLocale('ar')?.src).toContain('Hero%20Video%20(Arabic).mp4')
    expect(getHeroVideoLocale('th')?.src).toContain('Hero%20Video%20(Thai).mp4')
    expect(getHeroVideoLocale('ar')?.src).not.toContain('Arabic)%20.mp4')
    expect(getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)?.available).toBe(true)

    for (const locale of HERO_VIDEO_LOCALES) {
      expect(locale.available).toBe(true)
      expect(locale.src).toBeTruthy()
      expect(locale.poster).toBe(`/landing/hero/sceneflow-hero-${locale.id}-poster.jpg`)
    }
  })

  it('reserves predictable Blob paths for hero dubs', () => {
    expect(HERO_VIDEO_BLOB_PATHS.en).toBe('Hero Video (English).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.es).toBe('Hero Video (Spanish).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.pt).toBe('Hero Video (Portuguese).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.hi).toBe('Hero Video (Hindi).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.zh).toBe('Hero Video (Chinese).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.ar).toBe('Hero Video (Arabic).mp4')
    expect(HERO_VIDEO_BLOB_PATHS.th).toBe('Hero Video (Thai).mp4')
  })

  it('reserves 720p, 1080p, and WebM web-encode paths from the live 4K masters', () => {
    for (const locale of HERO_VIDEO_LOCALES) {
      expect(HERO_VIDEO_WEB_720P_PATHS[locale.id]).toBe(
        `landing/hero/sceneflow-hero-${locale.id}-720p.mp4`
      )
      expect(HERO_VIDEO_WEB_1080P_PATHS[locale.id]).toBe(
        `landing/hero/sceneflow-hero-${locale.id}-1080p.mp4`
      )
      expect(HERO_VIDEO_WEB_WEBM_PATHS[locale.id]).toBe(
        `landing/hero/sceneflow-hero-${locale.id}.webm`
      )
      expect(locale.mp4SrcMobile).toContain(`sceneflow-hero-${locale.id}-720p.mp4`)
      expect(locale.mp4SrcHd).toContain(`sceneflow-hero-${locale.id}-1080p.mp4`)
    }
  })

  it('maps hero locales into the shared video player model', () => {
    const locales = getHeroVideoLocalesAsVideoLocales()
    expect(locales).toHaveLength(7)
    for (const id of HERO_VIDEO_LOCALE_ORDER) {
      expect(locales.find((locale) => locale.id === id)?.available).toBe(true)
    }
  })
})

describe('public hero playback sources', () => {
  it('points every locale at same-origin WebM + MP4 paths and a localized poster', () => {
    for (const locale of HERO_VIDEO_LOCALES) {
      const sources = getHeroPublicVideoSources(locale.id)
      const version = {
        en: '20261004',
        es: '20261005',
        pt: '20261005',
        zh: '20261012',
        ar: '20261012',
      }[locale.id]
      expect(sources.webmSrc).toBe(
        version ? `/videos/hero-${locale.id}.webm?v=${version}` : `/videos/hero-${locale.id}.webm`
      )
      expect(sources.mp4Src).toBe(
        version ? `/videos/hero-${locale.id}.mp4?v=${version}` : `/videos/hero-${locale.id}.mp4`
      )
      expect(sources.poster).toBe(`/images/hero-poster-${locale.id}.webp`)
    }
    expect(HERO_PUBLIC_POSTER_FALLBACK).toBe('/images/hero-poster.webp')
  })

  it('serves all seven global hero files from public/videos, not Blob rewrites', () => {
    const config = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')
    const root = join(process.cwd(), 'public', 'videos')
    expect(config).toContain('outputFileTracingExcludes')
    expect(config).toContain('public/videos/**/*.mp4')
    expect(config).not.toContain('blobHeroLocales')
    expect(config).not.toContain('sceneflow-hero-:locale.webm')
    expect(config).not.toContain('sceneflow-hero-:locale-1080p.mp4')
    for (const locale of HERO_VIDEO_LOCALE_ORDER) {
      expect(existsSync(join(root, `hero-${locale}.webm`)), `hero-${locale}.webm`).toBe(true)
      expect(existsSync(join(root, `hero-${locale}.mp4`)), `hero-${locale}.mp4`).toBe(true)
    }
  })

  it('uploads latest WebM and 1080p MP4 from the 4K masters, not the watermarked files', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/publish-hero-public-assets.mjs'), 'utf8')
    expect(script).toContain('--upload')
    expect(script).toContain('landing/hero/sceneflow-hero-en.webm')
    expect(script).toContain('landing/hero/sceneflow-hero-en-1080p.mp4')
    expect(script).toContain('Using 4K master (not watermarked landing MP4)')
  })

  it('ships WebP posters the player requests', () => {
    const root = join(process.cwd(), 'public')
    for (const locale of HERO_VIDEO_LOCALES) {
      const poster = join(root, getHeroPublicVideoSources(locale.id).poster.slice(1))
      expect(existsSync(poster), poster).toBe(true)
    }
    expect(existsSync(join(root, HERO_PUBLIC_POSTER_FALLBACK.slice(1)))).toBe(true)
  })
})

describe('resolveHeroVideoLocale', () => {
  it('maps all seven global UI locales directly to their matching hero dub', () => {
    expect(resolveHeroVideoLocale('en')).toBe('en')
    expect(resolveHeroVideoLocale('es')).toBe('es')
    expect(resolveHeroVideoLocale('pt')).toBe('pt')
    expect(resolveHeroVideoLocale('hi')).toBe('hi')
    expect(resolveHeroVideoLocale('zh-CN')).toBe('zh')
    expect(resolveHeroVideoLocale('zh-TW')).toBe('zh')
    expect(resolveHeroVideoLocale('ar')).toBe('ar')
    expect(resolveHeroVideoLocale('th')).toBe('th')
  })

  it('falls back to the English dub for UI locales without a hero file', () => {
    expect(resolveHeroVideoLocale('fr')).toBe('en')
    expect(resolveHeroVideoLocale('ja')).toBe('en')
  })

  it('uses the page locale ahead of the browser language', () => {
    const languages = vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-MX')
    expect(resolveHeroVideoLocale('ar')).toBe('ar')
    languages.mockRestore()
  })
})
