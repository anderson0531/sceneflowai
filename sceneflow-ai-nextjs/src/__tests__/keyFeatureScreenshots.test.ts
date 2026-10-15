import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  NEW_SERIES_SCREENSHOT_WEBM,
  getKeyFeatureScreenshot,
} from '@/config/landing/keyFeatureScreenshots'

const ROOT = path.resolve(__dirname, '../..')

describe('key feature screenshots', () => {
  it('plays the New Series still in the screenshot slot', () => {
    expect(getKeyFeatureScreenshot('newSeries')).toEqual({
      webmUrl: NEW_SERIES_SCREENSHOT_WEBM,
    })
    expect(getKeyFeatureScreenshot('seriesReview')).toBeNull()
    expect(NEW_SERIES_SCREENSHOT_WEBM).toBe(
      '/landing/key-features/screenshots/new-series.webm'
    )

    const webm = readFileSync(path.join(ROOT, 'public', NEW_SERIES_SCREENSHOT_WEBM))
    expect(webm.subarray(0, 4).toString('hex')).toBe('1a45dfa3')
    expect(webm.length).toBeGreaterThan(500_000)
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
    expect(section).toContain('<FeatureScreenshotFrame')
    expect(section).toContain('feature.screenshot')
    expect(frame).toContain('type="video/webm"')
    expect(frame).toContain('object-contain')
    expect(frame).toContain('requestFullscreen')
    expect(frame).toContain('webkitEnterFullscreen')
    expect(frame).toContain('aria-pressed={isFullscreen}')
    expect(frame).toContain('enterFullscreenLabel')
    expect(frame).toContain('exitFullscreenLabel')
    expect(frame).not.toContain('controls')
  })
})