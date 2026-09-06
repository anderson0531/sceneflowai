import { describe, it, expect, afterEach } from 'vitest'
import {
  DEFAULT_HERO_VIDEO_LOCALE,
  HERO_VIDEO_BLOB_PATHS,
  HERO_VIDEO_LOCALES,
  getAvailableHeroVideoLocales,
  getDefaultHeroVideoSrc,
  getHeroVideoLocale,
  getHeroVideoLocalesAsVideoLocales,
  getHeroVideoMp4Url,
  getHeroVideoHlsUrl,
  getHeroVideoPosterUrl,
  getHeroVideoPlaybackSources,
} from '@/config/landing/heroVideoLocales'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'

const BLOB_HOST = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
const CDN_HOST = 'https://storage.googleapis.com/sceneflow-assets'

describe('Hero video locales', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LANDING_VIDEO_CDN
    delete process.env.NEXT_PUBLIC_LANDING_VIDEO_HLS
  })

  it('lists all seven locale pills in display order', () => {
    expect(HERO_VIDEO_LOCALES.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
  })

  it('plays all seven hero masters from Blob when CDN env is unset', () => {
    const available = getAvailableHeroVideoLocales().map((locale) => locale.id)

    expect(available).toEqual(VIDEO_LOCALE_ORDER)
    expect(getDefaultHeroVideoSrc()).toContain('SceneFlow%20Hero%20Video.mp4')
    expect(getHeroVideoLocale('es')?.src).toContain('Hero%20Video%20(Spanish)%20.mp4')
    expect(getHeroVideoLocale('pt')?.src).toContain('Hero%20Video%20(Portuguese).mp4')
    expect(getHeroVideoLocale('hi')?.src).toContain('Hero%20Video%20(Hindi).mp4')
    expect(getHeroVideoLocale('zh')?.src).toContain('Hero%20Video%20(Chinese).mp4')
    expect(getHeroVideoLocale('ar')?.src).toContain('Hero%20Video%20(Arabic)%20.mp4')
    expect(getHeroVideoLocale('th')?.src).toContain('Hero%20Video%20(Thai)%20.mp4')
    expect(getHeroVideoLocale(DEFAULT_HERO_VIDEO_LOCALE)?.available).toBe(true)

    for (const locale of HERO_VIDEO_LOCALES) {
      expect(locale.available).toBe(true)
      expect(getHeroVideoMp4Url(locale.id)).toContain(BLOB_HOST)
      expect(getHeroVideoPosterUrl(locale.id)).toBe(
        `/landing/hero/sceneflow-hero-${locale.id}-poster.jpg`
      )
    }
  })

  it('reserves predictable Blob paths for hero dubs', () => {
    expect(HERO_VIDEO_BLOB_PATHS.en).toBe('SceneFlow Hero Video.mp4')
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

  it('prefers GCS master.mp4 when NEXT_PUBLIC_LANDING_VIDEO_CDN is set', () => {
    process.env.NEXT_PUBLIC_LANDING_VIDEO_CDN = CDN_HOST

    expect(getHeroVideoMp4Url('en')).toBe(`${CDN_HOST}/hero/en/master.mp4#t=0.1`)
    expect(getHeroVideoPlaybackSources('es')?.mp4Src).toBe(`${CDN_HOST}/hero/es/master.mp4#t=0.1`)
    expect(getHeroVideoHlsUrl('en')).toBeUndefined()
  })

  it('exposes HLS only when CDN and NEXT_PUBLIC_LANDING_VIDEO_HLS are set', () => {
    process.env.NEXT_PUBLIC_LANDING_VIDEO_CDN = CDN_HOST
    expect(getHeroVideoHlsUrl('en')).toBeUndefined()

    process.env.NEXT_PUBLIC_LANDING_VIDEO_HLS = '1'
    expect(getHeroVideoHlsUrl('en')).toBe(`${CDN_HOST}/hero/en/hls/manifest.m3u8`)
    expect(getHeroVideoPlaybackSources('en')?.hlsSrc).toBe(
      `${CDN_HOST}/hero/en/hls/manifest.m3u8`
    )
  })
})
