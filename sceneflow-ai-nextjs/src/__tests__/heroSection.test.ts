import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { HERO_COPY, HERO_PIPELINE_STEPS, HERO_VALUE_CHIPS } from '@/config/landing/valuePropCopy'

const ROOT = join(process.cwd())

describe('hero section copy and UI', () => {
  it('leads with long-form continuity rather than multi-scene framing', () => {
    expect(HERO_COPY.headline).toBe('Build Worlds. Not Just Clips.')
    expect(HERO_COPY.subheadline).toContain('character continuity')
    expect(HERO_COPY.subheadline).not.toContain('multi-scene')
    expect(HERO_COPY.eyebrow).toContain('long-form')
    expect(HERO_COPY.ctaPrimaryLaunch).toBe('Start Your Production')
    expect(HERO_COPY.ctaSecondary).toBe('Explore How It Works')
    expect(HERO_VALUE_CHIPS).toHaveLength(3)
    expect(HERO_PIPELINE_STEPS).toEqual(['Blueprint', 'Production', 'Screening Room'])
  })

  it('states the November 2026 availability date', () => {
    expect(HERO_COPY.availabilityBadge).toBe('Full access opens November 2026')
    expect(String(enMessages.hero.availabilityBadge)).toBe(HERO_COPY.availabilityBadge)
  })

  it('mirrors hero chips and pipeline steps in English messages', () => {
    const hero = enMessages.hero as {
      chips: Array<{ label: string; detail: string }>
      pipelineSteps: string[]
    }
    expect(hero.chips).toHaveLength(3)
    expect(hero.chips.map((chip) => chip.label)).toEqual([
      'Persistent Continuity',
      'Direct Before You Render',
      'Built for Every Audience',
    ])
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
    expect(hero).toContain('getVideoPreloadStrategy')
    expect(hero).toContain('useAdaptiveVideoSource')
    expect(hero).not.toContain('key={inlineVideoLocale}')
  })

  it('offers launch-notification capture in the hero', () => {
    const hero = readFileSync(join(ROOT, 'src/app/components/HeroSection.tsx'), 'utf8')
    expect(hero).toContain('NotifyCapture')
    expect(hero).toContain("t('availabilityBadge')")
  })

  it('stacks the availability badge on its own centered line under the eyebrow', () => {
    const hero = readFileSync(join(ROOT, 'src/app/components/HeroSection.tsx'), 'utf8')
    expect(hero).toContain('flex w-full flex-col items-center justify-center gap-3 text-center')
    expect(hero).not.toContain('sm:flex-row sm:justify-center')
    expect(hero).toContain("t('eyebrow')")
    expect(hero).toContain("t('availabilityBadge')")
  })
})
