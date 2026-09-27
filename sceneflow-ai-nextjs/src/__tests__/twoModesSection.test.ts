import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { HERO_COPY, FINAL_CTA_COPY } from '@/config/landing/valuePropCopy'
import { TWO_MODES_COPY } from '@/config/landing/twoModesCopy'
import {
  TWO_MODES_MEDIA,
  TWO_MODES_MEDIA_IDS,
  twoModesStillSrc,
  twoModesVideoSources,
} from '@/config/landing/twoModesMedia'
import {
  COLLAPSIBLE_LANDING_SECTION_IDS,
  DEFAULT_EXPANDED_LANDING_SECTION_IDS,
  LANDING_HASH_TO_SECTION,
} from '@/config/landing/landingSectionCollapseCopy'

const ROOT = join(process.cwd())

describe('one-pipeline landing section', () => {
  it('defines the friction comparison, four stages, and an Explorer CTA', () => {
    expect(TWO_MODES_COPY.eyebrow).toBe('The friction we remove')
    expect(TWO_MODES_COPY.title).toBe('One pipeline. Not a stack of tools.')
    expect(TWO_MODES_COPY.comparison.rows).toHaveLength(5)
    expect(TWO_MODES_COPY.retired).toHaveLength(3)
    expect(TWO_MODES_COPY.stages.map((stage) => stage.title)).toEqual([
      'Series Desk',
      'Blueprint Board',
      'Production Stage',
      'Screening Room',
    ])
    expect(TWO_MODES_COPY.cta).toBe('Launch Studio ($9)')
  })

  it('keeps beats in the Blueprint and ships scenes or chapters from the master', () => {
    const stageText = TWO_MODES_COPY.stages.map((stage) => `${stage.title} ${stage.body}`).join(' ')
    const blueprint = TWO_MODES_COPY.stages.find((stage) => stage.id === 'blueprint-board')
    const production = TWO_MODES_COPY.stages.find((stage) => stage.id === 'production-stage')
    expect(blueprint?.body).toContain('Beats exist only here')
    expect(production?.body).toContain('Each Blueprint beat becomes a chapter')
    expect(production?.body).toContain('five stills or clips at once')
    expect(production?.body).not.toContain('beat frames')
    expect(stageText).not.toContain('production beat')
    expect(stageText).not.toContain('parallel beat')
    expect(stageText).not.toContain('hundreds')
    expect(TWO_MODES_COPY.earn.body).toContain('500 shots')
    expect(TWO_MODES_COPY.earn.body).toContain('3–5 minute scene')
    expect(TWO_MODES_COPY.earn.body).toContain('8–12 minute chapter')
    expect(TWO_MODES_COPY.subtitle).toContain('90-minute master')
    expect(stageText).toContain('Audience Resonance')
    expect(stageText).toContain('Screening Room')
    expect(TWO_MODES_COPY.languages.body).toContain('39 languages')
    expect(TWO_MODES_COPY.languages.body).toContain('70+ languages')
  })

  it('mirrors twoModes namespace in English messages', () => {
    expect(enMessages.twoModes.eyebrow).toBe(TWO_MODES_COPY.eyebrow)
    expect(enMessages.twoModes.title).toBe(TWO_MODES_COPY.title)
    expect(enMessages.twoModes.subtitle).toBe(TWO_MODES_COPY.subtitle)
    expect(enMessages.twoModes.comparison).toEqual(TWO_MODES_COPY.comparison)
    expect(enMessages.twoModes.stages).toEqual(TWO_MODES_COPY.stages)
    expect(enMessages.twoModes.earn).toEqual(TWO_MODES_COPY.earn)
    expect(enMessages.twoModes.cta).toBe('Launch Studio ($9)')
    expect(enMessages.floatingNav.twoModes).toBe('One Pipeline')
    expect(enMessages.twoModes).not.toHaveProperty('steps')
  })

  it('keeps GCP and pipeline jargon out of hero namespace', () => {
    const heroText = JSON.stringify(enMessages.hero)
    expect(heroText).not.toContain('Google Cloud')
    expect(heroText).not.toContain('Vertex AI')
    expect(heroText).not.toContain('ProRes')
    expect(heroText).not.toContain('blueprint to master MP4')
    expect(enMessages.hero.headline).toBe(HERO_COPY.headline)
    expect(enMessages.hero.ctaPrimaryLaunch).toBe('Launch Studio ($9)')
    expect(enMessages.hero.ctaSecondary).toBe('Explore the pipeline')
  })

  it('renders empty WebP and WebM slots without touching the hero video', () => {
    const frame = readFileSync(join(ROOT, 'src/components/landing/TwoModesMediaFrame.tsx'), 'utf8')
    const background = readFileSync(
      join(ROOT, 'src/components/landing/HeroVideoBackground.tsx'),
      'utf8'
    )
    const webmAt = frame.indexOf('type="video/webm"')
    const mp4At = frame.indexOf('type="video/mp4"')

    expect(webmAt).toBeGreaterThan(-1)
    expect(mp4At).toBeGreaterThan(webmAt)
    expect(frame).toContain("from 'next/image'")
    expect(frame).not.toMatch(/\.png|\.jpe?g/i)
    expect(background).toContain('type="video/webm"')
    expect(background).toContain('type="video/mp4"')

    expect([
      TWO_MODES_COPY.comparison.id,
      ...TWO_MODES_COPY.retired.map((card) => card.id),
      ...TWO_MODES_COPY.stages.map((stage) => stage.id),
      TWO_MODES_COPY.earn.id,
      TWO_MODES_COPY.languages.id,
    ]).toEqual([...TWO_MODES_MEDIA_IDS])

    for (const id of TWO_MODES_MEDIA_IDS) {
      expect(TWO_MODES_MEDIA[id]).toEqual({
        imageUrl: '',
        posterUrl: '',
        webmUrl: '',
        mp4Url: '',
      })
    }

    const filled = {
      imageUrl: 'https://cdn.example/still.webp',
      posterUrl: 'https://cdn.example/poster.webp',
      webmUrl: 'https://cdn.example/walk.webm',
      mp4Url: 'https://cdn.example/walk.mp4',
    }
    expect(twoModesVideoSources(filled).map((source) => source.type)).toEqual([
      'video/webm',
      'video/mp4',
    ])
    expect(twoModesStillSrc(filled)).toMatch(/\.webp$/)
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
    expect(twoModes).toContain("t.raw('comparison')")
    expect(twoModes).toContain("t.raw('stages')")
    expect(twoModes).toContain("t.raw('earn')")
    expect(twoModes).not.toContain("t.raw('steps')")
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
    expect(hero).toContain('HeroVideoBackground')
    expect(hero).toContain("getElementById('two-modes')")
    expect(FINAL_CTA_COPY.ctaSecondaryHref).toBe('#two-modes')
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
