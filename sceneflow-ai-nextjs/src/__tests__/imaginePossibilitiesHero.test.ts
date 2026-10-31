import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_TRAILER_SCRIPTS,
  IMAGINE_POSSIBILITIES_COPY,
  formatExampleTrailerScript,
  getExampleTrailerScript,
} from '@/config/landing/exampleTrailerScripts'
import { PRODUCTION_WALK_IDS } from '@/config/landing/productionPipelineDemo'

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

      for (const block of script.blocks) {
        expect(block.title.length).toBeGreaterThan(4)
        expect(block.timecode).toMatch(/^\d:\d{2}–\d:\d{2}$/)
        expect(block.timing).toContain('Motion')
        expect(block.videoPrompt.length).toBeGreaterThan(40)
        expect(block.cameraAndLighting.length).toBeGreaterThan(15)
        expect(block.sfxAndMusic.length).toBeGreaterThan(15)
        expect(block.settleOn.length).toBeGreaterThan(15)
      }

      const formatted = formatExampleTrailerScript(script)
      expect(formatted).toContain(script.showTitle)
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
    expect(md).toContain('Cinematic Drama')
    expect(md).toContain('Animated Series')
    expect(md).toContain('Documentaries')
    expect(md).toContain('Training Series')
  })
})
