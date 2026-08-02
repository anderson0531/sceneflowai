import { describe, it, expect } from 'vitest'
import {
  HERO_YOUTUBE_PUBLISH_BUNDLES,
  getHeroYouTubePublishBundle,
  getHeroYouTubePublishBundleByLocale,
  truncateYouTubeTitle,
} from '@/config/landing/heroYouTubePublish'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'

describe('Hero YouTube publish metadata', () => {
  it('defines bundles for all seven hero locales', () => {
    expect(HERO_YOUTUBE_PUBLISH_BUNDLES.map((bundle) => bundle.locale)).toEqual(VIDEO_LOCALE_ORDER)
  })

  it('keeps titles within YouTube limit and uses SceneFlow prefix', () => {
    for (const bundle of HERO_YOUTUBE_PUBLISH_BUNDLES) {
      expect(bundle.title.length).toBeLessThanOrEqual(100)
      expect(bundle.title).toMatch(/^SceneFlow AI Studio — /)
    }
  })

  it('includes video, thumbnail, tags, and conversion-focused description', () => {
    for (const bundle of HERO_YOUTUBE_PUBLISH_BUNDLES) {
      expect(bundle.videoUrl).toMatch(/\.mp4$/)
      expect(bundle.thumbnailUrl).toMatch(/sceneflow-hero-.*-poster\.jpg$/)
      expect(bundle.tags.length).toBeGreaterThan(3)
      expect(bundle.description).toContain('sceneflowai.studio')
      expect(bundle.description).toContain('https://www.youtube.com/@sceneflowaistudio')
      expect(bundle.description).toContain('#SceneFlow')
      expect(bundle.description).toContain('•')
      expect(bundle.categoryId).toBe('28')
    }
  })

  it('maps zh locale bundle correctly', () => {
    const zh = getHeroYouTubePublishBundle('zh')
    expect(zh.title).toContain('SceneFlow')
    expect(zh.videoUrl).toContain('Hero%20Video%20(Chinese).mp4')
  })

  it('looks up bundles by locale id', () => {
    expect(getHeroYouTubePublishBundleByLocale('en')?.locale).toBe('en')
    expect(getHeroYouTubePublishBundleByLocale('xx' as 'en')).toBeUndefined()
  })

  it('truncates long titles with ellipsis', () => {
    const long = 'A'.repeat(120)
    expect(truncateYouTubeTitle(long).length).toBeLessThanOrEqual(100)
    expect(truncateYouTubeTitle(long).endsWith('…')).toBe(true)
  })
})
