import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { HERO_COPY, FINAL_CTA_COPY } from '@/config/landing/valuePropCopy'
import { TWO_MODES_COPY } from '@/config/landing/twoModesCopy'
import {
  TWO_MODES_MEDIA,
  TWO_MODES_MEDIA_IDS,
  TWO_MODES_VIDEO_BLOB_PATHS,
  getTwoModesMedia,
  getTwoModesVideoLocales,
  twoModesStillSrc,
  twoModesVideoBlobPath,
  twoModesVideoSources,
} from '@/config/landing/twoModesMedia'
import { VIDEO_LOCALE_ORDER, videoUrl } from '@/config/landing/videoLocales'
import {
  COLLAPSIBLE_LANDING_SECTION_IDS,
  DEFAULT_EXPANDED_LANDING_SECTION_IDS,
  LANDING_HASH_TO_SECTION,
} from '@/config/landing/landingSectionCollapseCopy'

const ROOT = join(process.cwd())

describe('one-pipeline landing section', () => {
  it('defines the friction comparison and an Explorer CTA', () => {
    expect(TWO_MODES_COPY.eyebrow).toBe('The friction we remove')
    expect(TWO_MODES_COPY.title).toBe('One pipeline. Not a stack of tools.')
    expect(TWO_MODES_COPY.comparison).toEqual({
      id: 'comparison',
      caption: 'Fragmented tools beside one SceneFlow pipeline.',
    })
    expect(TWO_MODES_COPY).not.toHaveProperty('retired')
    expect(TWO_MODES_COPY).not.toHaveProperty('earn')
    expect(TWO_MODES_COPY).not.toHaveProperty('languages')
    expect(TWO_MODES_COPY).not.toHaveProperty('stages')
    expect(TWO_MODES_COPY.subtitle).toContain('90-minute master')
    expect(TWO_MODES_COPY.cta).toBe('Launch Studio ($9)')
  })

  it('mirrors twoModes namespace in English messages', () => {
    expect(enMessages.twoModes.eyebrow).toBe(TWO_MODES_COPY.eyebrow)
    expect(enMessages.twoModes.title).toBe(TWO_MODES_COPY.title)
    expect(enMessages.twoModes.subtitle).toBe(TWO_MODES_COPY.subtitle)
    expect(enMessages.twoModes.comparison).toEqual(TWO_MODES_COPY.comparison)
    expect(enMessages.twoModes).not.toHaveProperty('stages')
    expect(enMessages.twoModes).not.toHaveProperty('retired')
    expect(enMessages.twoModes).not.toHaveProperty('earn')
    expect(enMessages.twoModes).not.toHaveProperty('languages')
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

  it('plays the comparison behind the copy with hero playback controls', () => {
    const section = readFileSync(join(ROOT, 'src/components/landing/PrimaryValueBackdrop.tsx'), 'utf8')
    const twoModesSection = readFileSync(join(ROOT, 'src/components/landing/TwoModesSection.tsx'), 'utf8')
    const theater = readFileSync(
      join(ROOT, 'src/components/landing/TwoModesTheaterModal.tsx'),
      'utf8'
    )
    const background = readFileSync(
      join(ROOT, 'src/components/landing/HeroVideoBackground.tsx'),
      'utf8'
    )
    const webmAt = section.indexOf('type="video/webm"')
    const mp4At = section.indexOf('type="video/mp4"')
    const theaterWebmAt = theater.indexOf('type="video/webm"')
    const theaterMp4At = theater.indexOf('type="video/mp4"')

    expect(webmAt).toBeGreaterThan(-1)
    expect(mp4At).toBeGreaterThan(webmAt)
    expect(theaterWebmAt).toBeGreaterThan(-1)
    expect(theaterMp4At).toBeGreaterThan(theaterWebmAt)
    expect(section).toContain('object-cover')
    expect(section).toContain('bg-black/40')
    expect(section).toContain('loop')
    expect(section).toContain('muted={isMuted || isTheaterOpen}')
    expect(section).toContain('useReducedMotion')
    expect(section).toContain("preload={prefersReducedMotion ? 'none' : 'metadata'}")
    expect(section).toContain('TwoModesTheaterModal')
    expect(section).toContain('Maximize2')
    expect(section).toContain("tHero('playWithNarration')")
    expect(section).toContain("tHero('tapToHear')")
    expect(section).toContain("tHero('pauseBackgroundVideo')")
    expect(section).toContain("tHero('playBackgroundVideo')")
    expect(section).toContain("tHero('fullscreen')")
    expect(section).toContain("tCommon('mute')")
    expect(section).toContain("tCommon('unmute')")
    expect(section).not.toContain('TwoModesMediaFrame')
    expect(twoModesSection).toContain('PrimaryValueBackdrop')
    expect(twoModesSection).toContain('namespace="twoModes"')
    expect(section).not.toContain('controls')
    expect(section).not.toMatch(/\.png|\.jpe?g/i)
    expect(background).toContain('type="video/webm"')
    expect(background).toContain('type="video/mp4"')

    expect(section).toContain('VideoLanguageControl')
    expect(theater).toContain('VideoLanguageControl')
    expect(twoModesSection).toContain('videoLocales={getTwoModesVideoLocales()}')

    expect([TWO_MODES_COPY.comparison.id]).toEqual([...TWO_MODES_MEDIA_IDS])

    const english = TWO_MODES_MEDIA.comparison
    expect(english.imageUrl).toBe('')
    expect(english.posterUrl).toBe('/landing/two-modes/comparison.webp')
    expect(english.webmUrl).toBe('')
    expect(english.mp4Url).toBe(videoUrl('Front Page/You Direct (English).mp4'))
    expect(english.mp4Url).toContain('You%20Direct%20(English).mp4')
    expect(getTwoModesMedia('comparison')).toEqual(english)

    const locales = getTwoModesVideoLocales()
    expect(locales.map((locale) => locale.id)).toEqual([...VIDEO_LOCALE_ORDER])
    expect(locales.filter((locale) => locale.available).map((locale) => locale.id)).toEqual([
      'en',
      'es',
      'pt',
      'hi',
      'zh',
    ])
    expect(locales.find((locale) => locale.id === 'en')?.mp4Url).toBe(english.mp4Url)
    expect(locales.find((locale) => locale.id === 'en')?.webmUrl).toBe('')
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(TWO_MODES_VIDEO_BLOB_PATHS[id]).toBe(twoModesVideoBlobPath(id))
      const locale = locales.find((entry) => entry.id === id)
      if (id === 'en' || id === 'es' || id === 'pt') {
        expect(locale?.available).toBe(true)
        expect(locale?.webmUrl).toBe('')
        expect(locale?.mp4Url).toBe(videoUrl(TWO_MODES_VIDEO_BLOB_PATHS[id]))
        continue
      }
      if (id === 'hi' || id === 'zh') {
        expect(locale?.available).toBe(true)
        expect(locale?.webmUrl).toBe(`/landing/two-modes/friction-${id}.webm`)
        expect(locale?.mp4Url).toBe(`/landing/two-modes/friction-${id}.mp4`)
        expect(locale?.src).toBe(`/landing/two-modes/friction-${id}.mp4`)
        expect(
          twoModesVideoSources({
            imageUrl: '',
            posterUrl: '',
            webmUrl: locale.webmUrl,
            mp4Url: locale.mp4Url,
          }).map((source) => source.type)
        ).toEqual(['video/webm', 'video/mp4'])
        continue
      }
      expect(locale?.available).toBe(false)
      expect(locale?.src).toBe('')
      expect(locale?.mp4Url).toBe('')
      expect(locale?.webmUrl).toBe('')
    }
    expect(twoModesVideoBlobPath('es')).toBe('The Friction (Spanish).mp4')
    expect(twoModesVideoBlobPath('pt')).toBe('The Friction (Portuguese).mp4')
    expect(twoModesVideoBlobPath('hi')).toBe('The Friction (Hindi).mp4')
    expect(twoModesVideoBlobPath('zh')).toBe('The Friction (Chinese).mp4')
    expect(twoModesVideoBlobPath('ar')).toBe('The Friction (Arabic).mp4')
    expect(twoModesVideoBlobPath('th')).toBe('The Friction (Thai).mp4')

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

  it('renders the comparison, hash aliases, and a single Explorer CTA', () => {
    const landing = readFileSync(join(ROOT, 'src/app/LandingPageClient.tsx'), 'utf8')
    const twoModes = readFileSync(join(ROOT, 'src/components/landing/TwoModesSection.tsx'), 'utf8')
    const nav = readFileSync(join(ROOT, 'src/components/landing/FloatingNav.tsx'), 'utf8')
    const hero = readFileSync(join(ROOT, 'src/app/components/HeroSection.tsx'), 'utf8')

    expect(landing).toContain('TwoModesSection')
    expect(landing).toContain('InfrastructureSection')
    expect(landing).toContain('TrustSafeguardSection')
    expect(landing).not.toContain('CoreCapabilitiesSection')
    expect(landing).not.toContain('PreVisEngineSection')
    expect(twoModes).toContain('sectionId={TWO_MODES_SECTION_ID}')
    expect(twoModes).toContain("'two-modes'")
    expect(twoModes).toContain("'core-capabilities'")
    expect(twoModes).toContain("'audience-resonance'")
    expect(twoModes).toContain("'pre-vis-engine'")
    expect(twoModes).toContain('PrimaryValueBackdrop')
    expect(twoModes).toContain('namespace="twoModes"')
    expect(twoModes).not.toContain('TwoModesMediaFrame')
    const backdrop = readFileSync(
      join(ROOT, 'src/components/landing/PrimaryValueBackdrop.tsx'),
      'utf8'
    )
    expect(backdrop).toContain("t('eyebrow')")
    expect(backdrop).toContain("t('cta')")
    expect(backdrop).toContain('TwoModesTheaterModal')
    expect(backdrop).toContain("t.raw('comparison')")
    expect(twoModes).not.toContain("t.raw('stages')")
    expect(twoModes).not.toContain("t.raw('retired')")
    expect(twoModes).not.toContain("t.raw('earn')")
    expect(twoModes).not.toContain("t.raw('languages')")
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
