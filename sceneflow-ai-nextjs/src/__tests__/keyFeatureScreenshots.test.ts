import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
  CAST_LOCATIONS_SCREENSHOT_WEBP,
  DIRECT_BEATS_SCREENSHOT_WEBP,
  DIRECT_EPISODE_SCREENSHOT_WEBP,
  NEW_SERIES_SCREENSHOT_WEBM,
  START_BLUEPRINT_SCREENSHOT_WEBP,
  START_EPISODE_SCREENSHOT_WEBP,
  SERIES_DIRECTOR_SCREENSHOT_WEBP,
  SERIES_RESONANCE_SCREENSHOT_WEBP,
  SERIES_REVIEW_SCREENSHOT_WEBP,
  getKeyFeatureScreenshot,
  keyFeatureScreenshotSrc,
} from '@/config/landing/keyFeatureScreenshots'

const ROOT = path.resolve(__dirname, '../..')

describe('key feature screenshots', () => {
  it('plays New Series and Review the first cut as full-block stills', () => {
    expect(getKeyFeatureScreenshot('newSeries')).toEqual({
      webmUrl: NEW_SERIES_SCREENSHOT_WEBM,
    })
    expect(getKeyFeatureScreenshot('seriesReview')).toEqual({
      imageUrl: SERIES_REVIEW_SCREENSHOT_WEBP,
    })
    expect(getKeyFeatureScreenshot('seriesResonance')).toEqual({
      imageUrl: SERIES_RESONANCE_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('seriesResonance')!)).toBe(
      SERIES_RESONANCE_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('seriesDirector')).toEqual({
      imageUrl: SERIES_DIRECTOR_SCREENSHOT_WEBP,
    })
    expect(getKeyFeatureScreenshot('directEpisode')).toEqual({
      imageUrl: DIRECT_EPISODE_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('directEpisode')!)).toBe(
      DIRECT_EPISODE_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('startEpisode')).toEqual({
      imageUrl: START_EPISODE_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('startEpisode')!)).toBe(
      START_EPISODE_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('startBlueprint')).toEqual({
      imageUrl: START_BLUEPRINT_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('startBlueprint')!)).toBe(
      START_BLUEPRINT_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('treatment')).toEqual({
      imageUrl: DIRECT_BEATS_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('treatment')!)).toBe(
      DIRECT_BEATS_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('castLocations')).toEqual({
      imageUrl: CAST_LOCATIONS_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('castLocations')!)).toBe(
      CAST_LOCATIONS_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('blueprintDirector')).toEqual({
      imageUrl: BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('blueprintDirector')!)).toBe(
      BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP
    )
    expect(NEW_SERIES_SCREENSHOT_WEBM).toBe(
      '/landing/key-features/screenshots/new-series.webm'
    )
    expect(SERIES_REVIEW_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/series-review.webp'
    )
    expect(SERIES_RESONANCE_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/series-resonance.webp'
    )
    expect(SERIES_DIRECTOR_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/series-director.webp'
    )
    expect(DIRECT_EPISODE_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/episode-director.webp'
    )
    expect(START_EPISODE_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/series-start-project.webp?v=20261015'
    )
    expect(START_BLUEPRINT_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/start-blueprint.webp'
    )
    expect(DIRECT_BEATS_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/blueprint-beats.webp'
    )
    expect(CAST_LOCATIONS_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/blueprint-cast.webp'
    )
    expect(BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/blueprint-director.webp'
    )

    const webm = readFileSync(path.join(ROOT, 'public', NEW_SERIES_SCREENSHOT_WEBM))
    expect(webm.subarray(0, 4).toString('hex')).toBe('1a45dfa3')
    expect(webm.length).toBeGreaterThan(500_000)

    for (const src of [
      SERIES_REVIEW_SCREENSHOT_WEBP,
      SERIES_RESONANCE_SCREENSHOT_WEBP,
      SERIES_DIRECTOR_SCREENSHOT_WEBP,
      DIRECT_EPISODE_SCREENSHOT_WEBP,
      START_BLUEPRINT_SCREENSHOT_WEBP,
      DIRECT_BEATS_SCREENSHOT_WEBP,
      CAST_LOCATIONS_SCREENSHOT_WEBP,
      BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
    ]) {
      const webp = readFileSync(path.join(ROOT, 'public', src))
      expect(webp.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(webp.subarray(8, 12).toString('ascii')).toBe('WEBP')
      expect(webp.length).toBeGreaterThan(200_000)
    }

    const startEpisode = readFileSync(
      path.join(ROOT, 'public', START_EPISODE_SCREENSHOT_WEBP.split('?')[0])
    )
    expect(startEpisode.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(startEpisode.subarray(8, 12).toString('ascii')).toBe('WEBP')
    expect(startEpisode.subarray(12, 16).toString('ascii')).toBe('VP8L')
    expect(startEpisode.length).toBeGreaterThan(50_000)
  })

  it('gives the still a fullscreen control and keeps other cards on the placeholder', () => {
    const section = readFileSync(
      path.join(ROOT, 'src/components/landing/KeyFeaturesSection.tsx'),
      'utf8'
    )
    const frame = readFileSync(
      path.join(ROOT, 'src/components/landing/FeatureScreenshotFrame.tsx'),
      'utf8'
    )

    expect(section).toContain('demoSrc ? null : getKeyFeatureScreenshot')
    expect(section).toContain('keyFeatureScreenshotSrc(screenshot)')
    expect(section).toContain('lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]')
    expect(section).toContain('bg-slate-800 text-white')
    expect(section).not.toContain('ScreenshotFeatureBlock')
    expect(section).not.toContain('bg-black/50')
    expect(section).not.toContain('bg-slate-950/50')

    const detail = section.slice(
      section.indexOf('function FeatureDetail'),
      section.indexOf('export default function')
    )
    const descriptionAt = detail.indexOf('{feature.description}')
    const frameAt = detail.indexOf('<FeatureScreenshotFrame')
    const placeholderAt = detail.indexOf('feature.screenshot')
    expect(descriptionAt).toBeGreaterThan(-1)
    expect(frameAt).toBeGreaterThan(descriptionAt)
    expect(placeholderAt).toBeGreaterThan(frameAt)
    expect(detail.indexOf('{learnMore}')).toBeGreaterThan(placeholderAt)

    expect(frame).toContain('type="video/webm"')
    expect(frame).toContain('<img')
    expect(frame).toContain('alt={label}')
    expect(frame).toContain('min-h-[56vh]')
    expect(frame).toContain('max-h-[70vh]')
    expect(frame).toContain('object-contain object-center')
    expect(frame).not.toContain('object-cover')
    expect(frame).not.toContain('bg-gradient-to-b')
    expect(frame).toContain('requestFullscreen')
    expect(frame).toContain('webkitEnterFullscreen')
    expect(frame).toContain('aria-pressed={isFullscreen}')
    expect(frame).toContain('enterFullscreenLabel')
    expect(frame).toContain('exitFullscreenLabel')
    expect(frame).not.toContain('controls')
    expect(frame).toContain('computeReadableZoom')
    expect(frame).toContain('aria-label="Zoom in"')
    expect(frame).toContain('aria-label="Zoom out"')
    expect(frame).toContain('aria-label="Zoom level percentage"')
    expect(frame).toContain('translate3d(')
    expect(frame).toContain('Radar')
  })
})