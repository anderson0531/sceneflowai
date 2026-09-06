import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { HERO_COPY, FINAL_CTA_COPY } from '@/config/landing/valuePropCopy'
import { TWO_MODES_COPY } from '@/config/landing/twoModesCopy'
import {
  COLLAPSIBLE_LANDING_SECTION_IDS,
  DEFAULT_EXPANDED_LANDING_SECTION_IDS,
  LANDING_HASH_TO_SECTION,
} from '@/config/landing/landingSectionCollapseCopy'

const ROOT = join(process.cwd())

describe('one-pipeline landing section', () => {
  it('defines seven pipeline steps and an Explorer CTA in config', () => {
    expect(TWO_MODES_COPY.eyebrow).toBe('One automated pipeline')
    expect(TWO_MODES_COPY.title).toBe('From first idea to a world that ships.')
    expect(TWO_MODES_COPY.steps).toHaveLength(7)
    expect(TWO_MODES_COPY.cta).toBe('Launch Studio ($9)')
  })

  it('folds Audience Resonance, 5× pre-vis, and Screening Room into the steps', () => {
    const allBodies = TWO_MODES_COPY.steps.map((step) => `${step.title} ${step.body}`).join(' ')
    expect(TWO_MODES_COPY.subtitle).toContain('culture you named')
    expect(TWO_MODES_COPY.subtitle).toContain('hundreds of beats in parallel')
    expect(allBodies).toContain('Audience Resonance')
    expect(allBodies).toContain('not a language code')
    expect(allBodies).toContain('~30 beats')
    expect(allBodies).toContain('~360')
    expect(allBodies).toContain('Screening Room')
    expect(allBodies).toContain('native-language streams')
    expect(allBodies).toContain('lower-cost path')
    expect(TWO_MODES_COPY.steps[0].title).toBe('Bring the spark')
    expect(TWO_MODES_COPY.steps[6].title).toBe('Screen. Package. Ship.')
  })

  it('mirrors twoModes namespace in English messages', () => {
    expect(enMessages.twoModes.eyebrow).toBe(TWO_MODES_COPY.eyebrow)
    expect(enMessages.twoModes.title).toBe(TWO_MODES_COPY.title)
    expect(enMessages.twoModes.subtitle).toBe(TWO_MODES_COPY.subtitle)
    expect(enMessages.twoModes.steps).toEqual(
      TWO_MODES_COPY.steps.map((step) => ({ title: step.title, body: step.body }))
    )
    expect(enMessages.twoModes.cta).toBe('Launch Studio ($9)')
    expect(enMessages.floatingNav.twoModes).toBe('One Pipeline')
  })

  it('keeps GCP and pipeline jargon out of hero namespace', () => {
    const heroText = JSON.stringify(enMessages.hero)
    expect(heroText).not.toContain('Google Cloud')
    expect(heroText).not.toContain('Vertex AI')
    expect(heroText).not.toContain('blueprint to master MP4')
    expect(enMessages.hero.headline).toBe(HERO_COPY.headline)
    expect(enMessages.hero.ctaPrimaryLaunch).toBe('Start Your Production')
    expect(enMessages.hero.ctaSecondary).toBe('Explore How It Works')
  })

  it('renders numbered steps with hash aliases and a single Explorer CTA', () => {
    const landing = readFileSync(join(ROOT, 'src/app/LandingPageClient.tsx'), 'utf8')
    const twoModes = readFileSync(join(ROOT, 'src/components/landing/TwoModesSection.tsx'), 'utf8')
    const nav = readFileSync(join(ROOT, 'src/components/landing/FloatingNav.tsx'), 'utf8')
    const hero = readFileSync(join(ROOT, 'src/app/components/HeroSection.tsx'), 'utf8')

    expect(landing).toContain('TwoModesSection')
    expect(landing).toContain('InfrastructureSection')
    expect(landing).toContain('TrustSafeguardSection')
    expect(landing).not.toContain('CoreCapabilitiesSection')
    expect(landing).not.toContain('PreVisEngineSection')
    expect(twoModes).toContain("id={TWO_MODES_SECTION_ID}")
    expect(twoModes).toContain("'two-modes'")
    expect(twoModes).toContain("'core-capabilities'")
    expect(twoModes).toContain("'audience-resonance'")
    expect(twoModes).toContain("'pre-vis-engine'")
    expect(twoModes).toContain("t('eyebrow')")
    expect(twoModes).toContain("t('cta')")
    expect(twoModes).toContain("t.raw('steps')")
    expect(twoModes).not.toContain("t('intelligence.name')")
    expect(twoModes).not.toContain("t('speed.name')")
    expect(twoModes).not.toContain("t('go.cta')")
    expect(twoModes).not.toContain("t('director.cta')")
    expect(nav).toContain("'two-modes'")
    expect(nav).toContain("t('twoModes')")
    expect(nav).not.toContain("'core-capabilities'")
    expect(nav).not.toContain("'pre-vis-engine'")
    expect(nav).not.toContain("t('audienceResonance')")
    expect(nav).not.toContain("t('preVisEngine')")
    expect(hero).toContain("t('ctaSecondary')")
    expect(hero).toContain('scrollToHowItWorks')
  })

  it('drops retired pipeline sections from collapse config', () => {
    expect([...COLLAPSIBLE_LANDING_SECTION_IDS]).toEqual(['pricing', 'trust-safety'])
    expect([...DEFAULT_EXPANDED_LANDING_SECTION_IDS]).toEqual(['trust-safety'])
    expect(LANDING_HASH_TO_SECTION).toEqual({
      pricing: 'pricing',
      'trust-safety': 'trust-safety',
    })
  })

  it('moves infrastructure copy to dedicated bottom section', () => {
    expect(enMessages.infrastructure.title).toContain('Enterprise-Grade Infrastructure')
    expect(String(enMessages.infrastructure.description)).toContain('Google Cloud')
    expect(String(enMessages.infrastructure.description)).toContain('Vertex AI')

    const pricingBadges = enMessages.pricing.trustBadges as string[]
    expect(pricingBadges.join('\n')).not.toContain('Google Cloud infrastructure')
    expect(pricingBadges.join('\n')).not.toContain('Vertex AI generation')
  })

  it('points the final CTA at the November launch list, not Early Access', () => {
    expect(FINAL_CTA_COPY.cta).toBe('Explore plans')
    expect(FINAL_CTA_COPY.subtitle).toContain('November 2026')
    expect(FINAL_CTA_COPY.subtitle).toContain('$9 Explorer')
    expect(FINAL_CTA_COPY.ctaSecondaryHref).not.toContain('early-access')
    expect(JSON.stringify(FINAL_CTA_COPY)).not.toContain('Founding Creator')
    expect(enMessages.finalCta.cta).toBe(FINAL_CTA_COPY.cta)
  })
})
