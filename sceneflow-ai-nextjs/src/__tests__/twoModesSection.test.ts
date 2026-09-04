import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { HERO_COPY, FINAL_CTA_COPY } from '@/config/landing/valuePropCopy'
import { TWO_MODES_COPY } from '@/config/landing/twoModesCopy'

const ROOT = join(process.cwd())

describe('two modes landing section', () => {
  it('defines Director and Go card copy in config', () => {
    expect(TWO_MODES_COPY.title).toBe('Two modes at every step. One long-form pipeline.')
    expect(TWO_MODES_COPY.director.points).toHaveLength(5)
    expect(TWO_MODES_COPY.go.points).toHaveLength(4)
    expect(TWO_MODES_COPY.go.cta).toBe('Try Go Mode')
    expect(TWO_MODES_COPY.director.cta).toBe('Launch Studio ($9)')
  })

  it('frames Director Mode for long-form and contrasts clip generators', () => {
    expect(TWO_MODES_COPY.director.badge).toBe('Built for long-form')
    expect(TWO_MODES_COPY.director.points.join(' ')).toContain('120-minute')
    expect(TWO_MODES_COPY.director.points.join(' ')).toContain('tool stacks')
    expect(TWO_MODES_COPY.subtitle).toContain('five-second clip')
  })

  it('mirrors twoModes namespace in English messages', () => {
    expect(enMessages.twoModes.title).toBe(TWO_MODES_COPY.title)
    expect(enMessages.twoModes.subtitle).toBe(TWO_MODES_COPY.subtitle)
    expect(enMessages.twoModes.go.cta).toBe('Try Go Mode')
    expect(enMessages.twoModes.director.cta).toBe('Launch Studio ($9)')
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

  it('renders section with anchor id and dual hero CTAs', () => {
    const landing = readFileSync(join(ROOT, 'src/app/LandingPageClient.tsx'), 'utf8')
    const twoModes = readFileSync(join(ROOT, 'src/components/landing/TwoModesSection.tsx'), 'utf8')
    const hero = readFileSync(join(ROOT, 'src/app/components/HeroSection.tsx'), 'utf8')

    expect(landing).toContain('TwoModesSection')
    expect(landing).toContain('InfrastructureSection')
    expect(landing).toContain('TrustSafeguardSection')
    expect(landing).toContain('CoreCapabilitiesSection')
    expect(landing).toContain('PreVisEngineSection')
    expect(twoModes).toContain("id={TWO_MODES_SECTION_ID}")
    expect(twoModes).toContain("'two-modes'")
    expect(twoModes).toContain("t('go.cta')")
    expect(twoModes).toContain("t('director.cta')")
    expect(hero).toContain("t('ctaSecondary')")
    expect(hero).toContain('scrollToHowItWorks')
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
