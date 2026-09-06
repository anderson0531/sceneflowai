import { describe, it, expect } from 'vitest'
import {
  getVideoPreloadStrategy,
  getModalVideoPreload,
} from '@/lib/landing/videoPreload'
import {
  getHeroVideoPosterUrl,
  getHeroVideoHlsUrl,
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

  it('uses auto on desktop fast connections', () => {
    expect(
      getVideoPreloadStrategy({ isMobile: false, saveData: false, effectiveType: '4g' })
    ).toBe('auto')
  })

  it('defers modal preload until open', () => {
    expect(getModalVideoPreload(false)).toBe('none')
    expect(getModalVideoPreload(true)).toBe('metadata')
  })
})

describe('hero video CDN config', () => {
  it('serves posters from Blob CDN (en/es/pt use site-served posters from current masters)', () => {
    expect(getHeroVideoPosterUrl('en')).toBe('/landing/hero/sceneflow-hero-en-poster.jpg')
    expect(getHeroVideoPosterUrl('es')).toBe('/landing/hero/sceneflow-hero-es-poster.jpg')
    expect(getHeroVideoPosterUrl('pt')).toBe('/landing/hero/sceneflow-hero-pt-poster.jpg')
    expect(getHeroVideoPosterUrl('th')).toContain('sceneflow-hero-th-poster.jpg')
  })

  it('omits HLS URL until NEXT_PUBLIC_LANDING_VIDEO_CDN is set', () => {
    expect(getHeroVideoHlsUrl('en')).toBeUndefined()
  })

  it('exposes mp4 playback sources for every hero locale', () => {
    for (const locale of ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'] as const) {
      const sources = getHeroVideoPlaybackSources(locale)
      expect(sources?.mp4Src).toContain('.mp4')
      if (locale === 'en' || locale === 'es' || locale === 'pt') {
        expect(sources?.poster).toBe(`/landing/hero/sceneflow-hero-${locale}-poster.jpg`)
      } else {
        expect(sources?.poster).toContain('blob.vercel-storage.com')
      }
    }
  })
})
