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

  it('serves 720p to phones and 1080p to desktop', () => {
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

    expect(mobile?.mp4Src).toContain('sceneflow-hero-en-720p.mp4')
    expect(mobile?.mp4SrcFallback).toContain('SceneFlow%20Hero%20Video.mp4')
    expect(desktop?.mp4Src).toContain('sceneflow-hero-en-1080p.mp4')
    expect(desktop?.mp4SrcFallback).toContain('SceneFlow%20Hero%20Video.mp4')
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

afterEach(() => {
  vi.unstubAllEnvs()
})
