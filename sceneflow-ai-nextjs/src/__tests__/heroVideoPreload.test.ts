import { describe, it, expect, afterEach } from 'vitest'
import {
  getVideoPreloadStrategy,
  getModalVideoPreload,
} from '@/lib/landing/videoPreload'
import {
  getHeroVideoPosterUrl,
  getHeroVideoHlsUrl,
  getHeroVideoMp4Url,
  getHeroVideoPlaybackSources,
  HERO_VIDEO_BLOB_HOST,
} from '@/config/landing/heroVideoLocales'

describe('videoPreload', () => {
  it('uses metadata on mobile viewports', () => {
    expect(
      getVideoPreloadStrategy({ isMobile: true, saveData: false, effectiveType: '4g' })
    ).toBe('metadata')
  })

  it('uses none when save-data is enabled', () => {
    expect(
      getVideoPreloadStrategy({ isMobile: false, saveData: true, effectiveType: '4g' })
    ).toBe('none')
  })

  it('uses metadata on slow effective types', () => {
    expect(
      getVideoPreloadStrategy({ isMobile: false, saveData: false, effectiveType: '3g' })
    ).toBe('metadata')
  })

  it('uses metadata on desktop fast connections', () => {
    expect(
      getVideoPreloadStrategy({ isMobile: false, saveData: false, effectiveType: '4g' })
    ).toBe('metadata')
  })

  it('defers modal preload until open', () => {
    expect(getModalVideoPreload(false)).toBe('none')
    expect(getModalVideoPreload(true)).toBe('metadata')
  })
})

describe('hero video CDN config', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LANDING_VIDEO_CDN
    delete process.env.NEXT_PUBLIC_LANDING_VIDEO_HLS
  })

  it('serves all posters from the site public folder', () => {
    expect(getHeroVideoPosterUrl('en')).toBe('/landing/hero/sceneflow-hero-en-poster.jpg')
    expect(getHeroVideoPosterUrl('th')).toBe('/landing/hero/sceneflow-hero-th-poster.jpg')
  })

  it('omits HLS URL until CDN and HLS flag are both set', () => {
    expect(getHeroVideoHlsUrl('en')).toBeUndefined()
    process.env.NEXT_PUBLIC_LANDING_VIDEO_CDN = 'https://storage.googleapis.com/sceneflow-assets'
    expect(getHeroVideoHlsUrl('en')).toBeUndefined()
  })

  it('exposes mp4 playback sources for every hero locale', () => {
    for (const locale of ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'] as const) {
      const sources = getHeroVideoPlaybackSources(locale)
      expect(sources?.mp4Src).toContain('.mp4')
      expect(sources?.mp4Src).toContain(HERO_VIDEO_BLOB_HOST)
      expect(sources?.poster).toBe(`/landing/hero/sceneflow-hero-${locale}-poster.jpg`)
      expect(getHeroVideoMp4Url(locale)).toContain('#t=0.1')
    }
  })
})
