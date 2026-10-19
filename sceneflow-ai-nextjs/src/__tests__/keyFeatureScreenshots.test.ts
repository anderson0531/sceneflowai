import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  AUDIO_AGENT_SCREENSHOT_WEBP,
  BLUEPRINT_DIRECTOR_SCREENSHOT_WEBP,
  BLUEPRINT_RESONANCE_SCREENSHOT_WEBP,
  CAST_LOCATIONS_SCREENSHOT_WEBP,
  CLIPS_AGENT_SCREENSHOT_WEBP,
  CONTINUITY_LIBRARY_SCREENSHOT_WEBP,
  DIRECT_BEATS_SCREENSHOT_WEBP,
  DIRECT_EPISODE_SCREENSHOT_WEBP,
  DIRECT_PUBLISHING_SCREENSHOT_WEBP,
  GO_TO_PRODUCTION_SCREENSHOT_WEBP,
  NEW_SERIES_SCREENSHOT_WEBM,
  PRE_VIS_ANIMATIC_SCREENSHOT_WEBP,
  PRODUCTION_MIXER_SCREENSHOT_WEBP,
  PRODUCTION_PLANNER_SCREENSHOT_WEBP,
  PRODUCTION_SCRIPT_SCREENSHOT_WEBP,
  PROMO_TRAILERS_SCREENSHOT_WEBP,
  SCENE_DIRECTOR_SCREENSHOT_WEBP,
  SCRIPT_RESONANCE_SCREENSHOT_WEBP,
  START_BLUEPRINT_SCREENSHOT_WEBP,
  START_EPISODE_SCREENSHOT_WEBP,
  STILLS_AGENT_SCREENSHOT_WEBP,
  STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP,
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
    expect(getKeyFeatureScreenshot('blueprintResonance')).toEqual({
      imageUrl: BLUEPRINT_RESONANCE_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('blueprintResonance')!)).toBe(
      BLUEPRINT_RESONANCE_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('goToProduction')).toEqual({
      imageUrl: GO_TO_PRODUCTION_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('goToProduction')!)).toBe(
      GO_TO_PRODUCTION_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('directShot')).toEqual({
      imageUrl: SCENE_DIRECTOR_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('directShot')!)).toBe(
      SCENE_DIRECTOR_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('continuity')).toEqual({
      imageUrl: CONTINUITY_LIBRARY_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('continuity')!)).toBe(
      CONTINUITY_LIBRARY_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('scriptResonance')).toEqual({
      imageUrl: SCRIPT_RESONANCE_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('scriptResonance')!)).toBe(
      SCRIPT_RESONANCE_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('budget')).toEqual({
      imageUrl: PRODUCTION_PLANNER_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('budget')!)).toBe(
      PRODUCTION_PLANNER_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('productionScript')).toEqual({
      imageUrl: PRODUCTION_SCRIPT_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('productionScript')!)).toBe(
      PRODUCTION_SCRIPT_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('audioAgent')).toEqual({
      imageUrl: AUDIO_AGENT_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('audioAgent')!)).toBe(
      AUDIO_AGENT_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('stillsAgent')).toEqual({
      imageUrl: STILLS_AGENT_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('stillsAgent')!)).toBe(
      STILLS_AGENT_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('animatic')).toEqual({
      imageUrl: PRE_VIS_ANIMATIC_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('animatic')!)).toBe(
      PRE_VIS_ANIMATIC_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('videoAgent')).toEqual({
      imageUrl: CLIPS_AGENT_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('videoAgent')!)).toBe(
      CLIPS_AGENT_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('mixer')).toEqual({
      imageUrl: PRODUCTION_MIXER_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('mixer')!)).toBe(
      PRODUCTION_MIXER_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('languageStreams')).toEqual({
      imageUrl: STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('languageStreams')!)).toBe(
      STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('promoTrailers')).toEqual({
      imageUrl: PROMO_TRAILERS_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('promoTrailers')!)).toBe(
      PROMO_TRAILERS_SCREENSHOT_WEBP
    )
    expect(getKeyFeatureScreenshot('shipPackage')).toEqual({
      imageUrl: DIRECT_PUBLISHING_SCREENSHOT_WEBP,
    })
    expect(keyFeatureScreenshotSrc(getKeyFeatureScreenshot('shipPackage')!)).toBe(
      DIRECT_PUBLISHING_SCREENSHOT_WEBP
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
    expect(BLUEPRINT_RESONANCE_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/blueprint-resonance.webp'
    )
    expect(GO_TO_PRODUCTION_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/blueprint-production-stage.webp'
    )
    expect(SCENE_DIRECTOR_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/scene-director.webp'
    )
    expect(CONTINUITY_LIBRARY_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/continuity-library.webp'
    )
    expect(SCRIPT_RESONANCE_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/script-resonance.webp'
    )
    expect(PRODUCTION_PLANNER_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/production-planner.webp'
    )
    expect(PRODUCTION_SCRIPT_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/production-script.webp'
    )
    expect(AUDIO_AGENT_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/audio-agent.webp'
    )
    expect(STILLS_AGENT_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/stills-agent.webp'
    )
    expect(PRE_VIS_ANIMATIC_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/pre-vis-animatic.webp'
    )
    expect(CLIPS_AGENT_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/clips-agent.webp'
    )
    expect(PRODUCTION_MIXER_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/production-mixer.webp'
    )
    expect(STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/streams-multilanguage.webp'
    )
    expect(PROMO_TRAILERS_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/promo-trailers.webp'
    )
    expect(DIRECT_PUBLISHING_SCREENSHOT_WEBP).toBe(
      '/landing/key-features/screenshots/direct-publishing.webp'
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
      BLUEPRINT_RESONANCE_SCREENSHOT_WEBP,
      GO_TO_PRODUCTION_SCREENSHOT_WEBP,
      SCENE_DIRECTOR_SCREENSHOT_WEBP,
      CONTINUITY_LIBRARY_SCREENSHOT_WEBP,
      SCRIPT_RESONANCE_SCREENSHOT_WEBP,
      PRODUCTION_PLANNER_SCREENSHOT_WEBP,
      PRODUCTION_SCRIPT_SCREENSHOT_WEBP,
      AUDIO_AGENT_SCREENSHOT_WEBP,
      STILLS_AGENT_SCREENSHOT_WEBP,
      PRE_VIS_ANIMATIC_SCREENSHOT_WEBP,
      CLIPS_AGENT_SCREENSHOT_WEBP,
      PRODUCTION_MIXER_SCREENSHOT_WEBP,
      STREAMS_MULTILANGUAGE_SCREENSHOT_WEBP,
      PROMO_TRAILERS_SCREENSHOT_WEBP,
      DIRECT_PUBLISHING_SCREENSHOT_WEBP,
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