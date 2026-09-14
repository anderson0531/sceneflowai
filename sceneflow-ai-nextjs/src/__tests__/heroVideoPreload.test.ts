import { readFileSync } from 'fs'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getVideoPreloadStrategy,
  getModalVideoPreload,
} from '@/lib/landing/videoPreload'
import { prefersLeanHeroSource } from '@/lib/landing/heroPlaybackPolicy'
import {
  getHeroVideoPosterUrl,
  getHeroVideoHlsUrl,
  getHeroVideoFallbackMp4Url,
  getHeroVideoPlaybackSources,
  isHeroFourKMasterUrl,
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

  it('uses metadata on desktop fast connections instead of auto', () => {
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
  it('serves posters from the site for every locale (regenerated from current Blob masters)', () => {
    for (const locale of ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'] as const) {
      expect(getHeroVideoPosterUrl(locale)).toBe(`/landing/hero/sceneflow-hero-${locale}-poster.jpg`)
    }
  })

  it('omits HLS URL until NEXT_PUBLIC_LANDING_VIDEO_CDN is set', () => {
    expect(getHeroVideoHlsUrl('en')).toBeUndefined()
  })

  it('exposes mp4 playback sources for every hero locale', () => {
    for (const locale of ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'] as const) {
      const sources = getHeroVideoPlaybackSources(locale)
      expect(sources?.mp4Src).toContain('.mp4')
      expect(sources?.poster).toBe(`/landing/hero/sceneflow-hero-${locale}-poster.jpg`)
    }
  })

  it('plays the uploaded web encode, never the 4K master', () => {
    const mobile = getHeroVideoPlaybackSources('en', {
      isMobile: true,
      saveData: false,
      effectiveType: '4g',
    })
    const desktop = getHeroVideoPlaybackSources('en', {
      isMobile: false,
      saveData: false,
      effectiveType: '4g',
    })

    expect(mobile?.mp4Src).toContain('sceneflow-hero-en.mp4')
    expect(mobile?.mp4Src).not.toContain('720p')
    expect(isHeroFourKMasterUrl(mobile?.mp4Src)).toBe(false)
    expect(isHeroFourKMasterUrl(mobile?.mp4SrcFallback)).toBe(false)
    expect(desktop?.mp4Src).toContain('sceneflow-hero-en.mp4')
    expect(isHeroFourKMasterUrl(desktop?.mp4Src)).toBe(false)
    expect(isHeroFourKMasterUrl(desktop?.mp4SrcFallback)).toBe(false)
  })

  it('treats Save-Data and slow networks as lean even on desktop', () => {
    expect(
      prefersLeanHeroSource({ isMobile: false, saveData: true, effectiveType: '4g' })
    ).toBe(true)
    expect(
      prefersLeanHeroSource({ isMobile: false, saveData: false, effectiveType: '3g' })
    ).toBe(true)
    expect(
      prefersLeanHeroSource({ isMobile: false, saveData: false, effectiveType: '4g' })
    ).toBe(false)
  })

  it('points HLS and the 720p CDN fallback at the Transcoder layout when env is set', () => {
    vi.stubEnv('NEXT_PUBLIC_LANDING_VIDEO_CDN', 'https://media.example.com/')
    expect(getHeroVideoHlsUrl('en')).toBe(
      'https://media.example.com/hero/en/hls/manifest.m3u8'
    )
    expect(getHeroVideoFallbackMp4Url('en')).toBe(
      'https://media.example.com/hero/en/hls/fallback-720p.mp4'
    )
    const mobile = getHeroVideoPlaybackSources('en', {
      isMobile: true,
      saveData: false,
      effectiveType: '4g',
    })
    expect(mobile?.hlsSrc).toBe('https://media.example.com/hero/en/hls/manifest.m3u8')
    expect(mobile?.mp4Src).toBe('https://media.example.com/hero/en/hls/fallback-720p.mp4')
  })
})

describe('landing layout first-paint hints', () => {
  it('preloads the English poster next to the Blob preconnect', () => {
    const layout = readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8')
    expect(layout).toContain('rel="preconnect" href={HERO_VIDEO_BLOB_HOST}')
    expect(layout).toContain('rel="preload"')
    expect(layout).toContain('/landing/hero/sceneflow-hero-en-poster.jpg')
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})
