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
    const frameUseStart = section.indexOf('<FeatureScreenshotFrame')
    const frameUse = section.slice(frameUseStart, section.indexOf('</FeatureScreenshotFrame>'))
    expect(frameUse).toContain('{feature.description}')
    expect(frameUse).toContain('{learnMore}')
    expect(frameUse).not.toContain('bg-slate-900/40')

    expect(frame).toContain('type="video/webm"')
    expect(frame).toContain('min-h-[70vh]')
    expect(frame).toContain('justify-start')
    expect(frame).toContain('object-cover object-center')
    expect(frame).not.toContain('bg-black/40')
    expect(frame).toContain('bg-gradient-to-b from-black/70 via-black/30 to-transparent')
    expect(frame).toContain('object-contain object-center')
    expect(section).toContain('bg-slate-950/50')
    expect(section).toContain('bg-white/15')
    expect(frame).toContain('requestFullscreen')
    expect(frame).toContain('webkitEnterFullscreen')
    expect(frame).toContain('aria-pressed={isFullscreen}')
    expect(frame).toContain('enterFullscreenLabel')
    expect(frame).toContain('exitFullscreenLabel')
    expect(frame).not.toContain('controls')
  })
})