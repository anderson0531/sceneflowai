import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_TRAILER_SCRIPTS,
  IMAGINE_POSSIBILITIES_COPY,
  formatExampleTrailerScript,
  getExampleTrailerScript,
} from '@/config/landing/exampleTrailerScripts'
import {
  ANIMATED_SERIES_DUB_LOCALE_IDS,
  CINEMATIC_DRAMA_DUB_LOCALE_IDS,
  DOCUMENTARY_DUB_LOCALE_IDS,
  PRODUCTION_WALK_IDS,
  getAnimatedSeriesTrailerSources,
  getCinematicDramaTrailerSources,
  getDocumentaryTrailerSources,
  getProductionExampleMedia,
} from '@/config/landing/productionPipelineDemo'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Imagine the Possibilities top cinematic video header & 60s–90s trailer scripts', () => {
  it('mounts ImaginePossibilitiesHero before HeroSection on the landing page', () => {
    const landing = readSource('src/app/LandingPageClient.tsx')
    const possibilitiesIdx = landing.indexOf('<ImaginePossibilitiesHero />')
    const heroIdx = landing.indexOf('<HeroSection />')

    expect(possibilitiesIdx).toBeGreaterThan(-1)
    expect(heroIdx).toBeGreaterThan(possibilitiesIdx)
  })

  it('headlines with "Imagine the Possibilities, with SceneFlow Studio" over a background video and omits example card clutter', () => {
    expect(IMAGINE_POSSIBILITIES_COPY.headline).toBe('Imagine the Possibilities')
    expect(IMAGINE_POSSIBILITIES_COPY.subheadline).toBe('with SceneFlow Studio')
    expect(EXAMPLE_TRAILER_SCRIPTS.map((s) => s.id)).toEqual([...PRODUCTION_WALK_IDS])
    expect(EXAMPLE_TRAILER_SCRIPTS.map((s) => s.buttonLabel)).toEqual([
      'Cinematic Drama',
      'Animated Series',
      'Documentaries',
      'Training Series',
      'Creator & Podcasts',
      'Video Memoirs',
    ])

    const heroComponent = readSource('src/components/landing/ImaginePossibilitiesHero.tsx')
    expect(heroComponent).toContain('IMAGINE_POSSIBILITIES_COPY.headline')
    expect(heroComponent).toContain('IMAGINE_POSSIBILITIES_COPY.subheadline')
    expect(heroComponent).toContain('EXAMPLE_TRAILER_SCRIPTS.map')
    expect(heroComponent).toContain('min-h-[100dvh]')
    expect(heroComponent).toContain('type="video/webm"')
    expect(heroComponent).toContain('type="video/mp4"')

    // Ensure removed showcase/example clutter is not rendered in the hero component
    expect(heroComponent).not.toContain('SceneFlow Studio Showcase')
    expect(heroComponent).not.toContain('Unmute Trailer')
    expect(heroComponent).not.toContain('Continuity Lock:')
    expect(heroComponent).not.toContain('showTitle')
    expect(heroComponent).not.toContain('logline')
    expect(heroComponent).not.toContain('formatBadge')
    expect(heroComponent).not.toContain('runtimeLabel')
  })

  it('provides 60s–90s shot-by-shot trailer scripts for all four example productions', () => {
    for (const script of EXAMPLE_TRAILER_SCRIPTS) {
      expect(script.durationSeconds).toBeGreaterThanOrEqual(60)
      expect(script.durationSeconds).toBeLessThanOrEqual(90)
      expect(script.blocks.length).toBeGreaterThanOrEqual(8)
      expect(script.referenceLocks.length).toBeGreaterThanOrEqual(3)
      expect(script.webmSrc).toContain('/videos/')
      expect(script.mp4Src).toContain('/videos/')
      expect(script.backgroundMusic.mixLevel).toContain('25% volume')
      expect(script.backgroundMusic.generationPrompt.length).toBeGreaterThan(80)

      for (const block of script.blocks) {
        expect(block.title.length).toBeGreaterThan(4)
        expect(block.timecode).toMatch(/^\d:\d{2}–\d:\d{2}$/)
        expect(block.timing).toContain('Motion')
        expect(block.videoPrompt).toContain('Single continuous')
        expect(block.videoPrompt).toContain('At 0.0s')
        expect(block.videoPrompt).toContain('From ')
        expect(block.cameraAndLighting.length).toBeGreaterThan(15)
        expect(block.sfxAndMusic).toContain('25% volume')
        expect(block.settleOn.length).toBeGreaterThan(15)
      }

      const formatted = formatExampleTrailerScript(script)
      expect(formatted).toContain(script.showTitle)
      expect(formatted).toContain('BACKGROUND MUSIC SPECIFICATION (MIX AT 25% VOLUME / -12 dB)')
      expect(formatted).toContain('LOCKED CHARACTER, PROP & ENVIRONMENT REFERENCES')
      expect(formatted).toContain('SHOT-BY-SHOT TRAILER SCRIPT')
      expect(getExampleTrailerScript(script.id)?.showTitle).toBe(script.showTitle)
    }
  })

  it('ships the markdown trailer script pack in scripts/use-case-scripts/imagine-the-possibilities-trailers.md', () => {
    const md = readSource('scripts/use-case-scripts/imagine-the-possibilities-trailers.md')
    expect(md).toContain('The White City Current')
    expect(md).toContain('Hart House')
    expect(md).toContain('The Long Thought')
    expect(md).toContain('Five Plates')
    expect(md).toContain('The Midnight Frequency')
    expect(md).toContain('Letters Across the Water')
    expect(md).toContain('Cinematic Drama')
    expect(md).toContain('Animated Series')
    expect(md).toContain('Documentaries')
    expect(md).toContain('Training Series')
    expect(md).toContain('Creator & Podcasts')
    expect(md).toContain('Video Memoirs')
  })

  it('ships English and 6 multilingual dubbed Cinematic Drama, Animated Series, and Documentary trailers (.webm and .mp4) for es, pt, hi, zh, ar, and th', () => {
    expect(CINEMATIC_DRAMA_DUB_LOCALE_IDS).toEqual(['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'])
    expect(ANIMATED_SERIES_DUB_LOCALE_IDS).toEqual(['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'])
    expect(DOCUMENTARY_DUB_LOCALE_IDS).toEqual(['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th'])

    for (const locale of CINEMATIC_DRAMA_DUB_LOCALE_IDS) {
      const sources = getCinematicDramaTrailerSources(locale)
      const media = getProductionExampleMedia('drama', locale)
      expect(media.trailerSrc).toBe(sources.webmSrc)
      expect(media.trailerMp4Src).toBe(sources.mp4Src)

      const webmRel = sources.webmSrc.split('?')[0].replace(/^\//, '')
      const mp4Rel = sources.mp4Src.split('?')[0].replace(/^\//, '')
      const webmAbs = path.join(ROOT, 'public', webmRel)
      const mp4Abs = path.join(ROOT, 'public', mp4Rel)

      expect(existsSync(webmAbs), `missing ${webmRel}`).toBe(true)
      expect(existsSync(mp4Abs), `missing ${mp4Rel}`).toBe(true)
      expect(statSync(webmAbs).size).toBeGreaterThan(1_000_000)
      expect(statSync(mp4Abs).size).toBeGreaterThan(1_000_000)
    }

    for (const locale of ANIMATED_SERIES_DUB_LOCALE_IDS) {
      const sources = getAnimatedSeriesTrailerSources(locale)
      const media = getProductionExampleMedia('animation', locale)
      expect(media.trailerSrc).toBe(sources.webmSrc)
      expect(media.trailerMp4Src).toBe(sources.mp4Src)

      const webmRel = sources.webmSrc.split('?')[0].replace(/^\//, '')
      const mp4Rel = sources.mp4Src.split('?')[0].replace(/^\//, '')
      const webmAbs = path.join(ROOT, 'public', webmRel)
      const mp4Abs = path.join(ROOT, 'public', mp4Rel)

      expect(existsSync(webmAbs), `missing ${webmRel}`).toBe(true)
      expect(existsSync(mp4Abs), `missing ${mp4Rel}`).toBe(true)
      expect(statSync(webmAbs).size).toBeGreaterThan(1_000_000)
      expect(statSync(mp4Abs).size).toBeGreaterThan(1_000_000)
    }

    for (const locale of DOCUMENTARY_DUB_LOCALE_IDS) {
      const sources = getDocumentaryTrailerSources(locale)
      const media = getProductionExampleMedia('documentary', locale)
      expect(media.trailerSrc).toBe(sources.webmSrc)
      expect(media.trailerMp4Src).toBe(sources.mp4Src)

      const webmRel = sources.webmSrc.split('?')[0].replace(/^\//, '')
      const mp4Rel = sources.mp4Src.split('?')[0].replace(/^\//, '')
      const webmAbs = path.join(ROOT, 'public', webmRel)
      const mp4Abs = path.join(ROOT, 'public', mp4Rel)

      expect(existsSync(webmAbs), `missing ${webmRel}`).toBe(true)
      expect(existsSync(mp4Abs), `missing ${mp4Rel}`).toBe(true)
      expect(statSync(webmAbs).size).toBeGreaterThan(1_000_000)
      expect(statSync(mp4Abs).size).toBeGreaterThan(1_000_000)
    }
  })
})
