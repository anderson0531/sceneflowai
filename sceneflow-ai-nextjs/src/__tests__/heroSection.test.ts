import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { HERO_COPY, HERO_PIPELINE_STEPS, HERO_VALUE_CHIPS } from '@/config/landing/valuePropCopy'

const ROOT = join(process.cwd())

describe('hero section copy and UI', () => {
  it('defines headline, subheadline, chips, and pipeline steps in config', () => {
    expect(HERO_COPY.headline).toBe('Envision the Story. Let SceneFlow Run the Production.')
    expect(HERO_COPY.subheadline).toContain('multi-scene videos automatically')
    expect(HERO_COPY.ctaPrimaryLaunch).toBe('Start Your Production')
    expect(HERO_COPY.ctaSecondary).toBe('Explore How It Works')
    expect(HERO_VALUE_CHIPS).toHaveLength(3)
    expect(HERO_PIPELINE_STEPS).toEqual(['Blueprint', 'Production', 'Screening Room'])
  })

  it('mirrors hero chips and pipeline steps in English messages', () => {
    const hero = enMessages.hero as {
      chips: Array<{ label: string; detail: string }>
      pipelineSteps: string[]
    }
    expect(hero.chips).toHaveLength(3)
    expect(hero.chips[0].label).toBe('Flexible Inputs')
    expect(hero.pipelineSteps).toEqual([...HERO_PIPELINE_STEPS])
  })

  it('keeps GCP and Vertex out of hero namespace', () => {
    const heroText = JSON.stringify(enMessages.hero)
    expect(heroText).not.toContain('Google Cloud')
    expect(heroText).not.toContain('Vertex AI')
  })

  it('renders value chips and pipeline strip in HeroSection', () => {
    const hero = readFileSync(join(ROOT, 'src/app/components/HeroSection.tsx'), 'utf8')
    expect(hero).toContain("t.raw('chips')")
    expect(hero).toContain("t.raw('pipelineSteps')")
    expect(hero).toContain('scrollToHowItWorks')
    expect(hero).toContain('key-features')
  })
})
