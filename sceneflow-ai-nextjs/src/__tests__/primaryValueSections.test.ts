import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { DIRECT_CONTROL_COPY } from '@/config/landing/directControlCopy'
import { PUBLISH_CUT_COPY } from '@/config/landing/publishCutCopy'
import {
  ANA_CHARACTER_VOICE,
  HERO_DUB_LOCALE_IDS,
  HERO_SECTION_DUB_BEATS,
  getHeroSectionDubNarration,
} from '@/config/landing/heroSectionScripts'
import {
  DIRECT_CONTROL_VIDEO_BLOB_PATHS,
  PRIMARY_VALUE_MEDIA,
  PRIMARY_VALUE_MEDIA_IDS,
  PRODUCTION_AGENT_MEDIA,
  PRODUCTION_AGENT_VIDEO_BLOB_PATHS,
  PUBLISH_CUT_VIDEO_BLOB_PATHS,
  STUDIO_ACADEMY_MEDIA,
  STUDIO_ACADEMY_VIDEO_BLOB_PATHS,
  directControlVideoBlobPath,
  getDirectControlVideoLocales,
  getPrimaryValueMedia,
  getPublishCutVideoLocales,
  productionAgentVideoBlobPath,
  publishCutVideoBlobPath,
  studioAcademyVideoBlobPath,
} from '@/config/landing/primaryValueMedia'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'
import { twoModesVideoSources } from '@/config/landing/twoModesMedia'

const ROOT = join(process.cwd())

describe('primary value sections', () => {
  it('keeps direction and publish copy next to friction', () => {
    expect(DIRECT_CONTROL_COPY.eyebrow).toBe('No technical filmmaking required')
    expect(DIRECT_CONTROL_COPY.title).toBe('Express your vision. Your AI crew handles the craft.')
    expect(DIRECT_CONTROL_COPY.subtitle).toContain('only then spend credits on motion')
    expect(DIRECT_CONTROL_COPY.subtitle).toContain('prompting')
    expect(DIRECT_CONTROL_COPY.subtitle).toContain('music cues')
    expect(DIRECT_CONTROL_COPY.subtitle).toContain('dialogue')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('picture, music, and narration')
    expect(DIRECT_CONTROL_COPY.cta).toBe('Launch Studio ($9)')
    expect(PUBLISH_CUT_COPY.eyebrow).toBe('The cut you publish')
    expect(PUBLISH_CUT_COPY.title).toBe('Export anywhere. Premiere on SceneFlow when you earn it.')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('{longForm}')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('{shorts}')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('Screening Room')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('invite-only SceneFlow Network')
    expect(PUBLISH_CUT_COPY.subtitle).not.toContain('30–60 second')
    expect(PUBLISH_CUT_COPY.subtitle).not.toContain('500')
    expect(enMessages.directControl).toEqual(DIRECT_CONTROL_COPY)
    expect(enMessages.publishCut).toEqual(PUBLISH_CUT_COPY)
    expect(enMessages.floatingNav.directControl).toBe('Direct')
    expect(enMessages.floatingNav.publishCut).toBe('Publish')
  })

  it('places both sections after friction and before key features', () => {
    const landing = readFileSync(join(ROOT, 'src/app/LandingPageClient.tsx'), 'utf8')
    const nav = readFileSync(join(ROOT, 'src/components/landing/FloatingNav.tsx'), 'utf8')
    const frictionAt = landing.indexOf('<TwoModesSection />')
    const directAt = landing.indexOf('<DirectControlSection />')
    const agentAt = landing.indexOf('<ProductionAgentSection />')
    const publishAt = landing.indexOf('<PublishCutSection />')
    const academyAt = landing.indexOf('<StudioAcademySection />')
    const featuresAt = landing.indexOf('<KeyFeaturesSection />')

    expect(frictionAt).toBeGreaterThan(-1)
    expect(directAt).toBeGreaterThan(frictionAt)
    expect(agentAt).toBeGreaterThan(directAt)
    expect(publishAt).toBeGreaterThan(agentAt)
    expect(academyAt).toBeGreaterThan(publishAt)
    expect(featuresAt).toBeGreaterThan(academyAt)
    expect(landing.indexOf('<ForFilmmakersSection />')).toBeGreaterThan(landing.indexOf('<TrustSafeguardSection />'))
    expect(landing.indexOf('<FinalCTA />')).toBeGreaterThan(landing.indexOf('<ForFilmmakersSection />'))
    expect(nav).toContain("'direct-control'")
    expect(nav).toContain("'publish-cut'")
    expect(nav).toContain("t('directControl')")
    expect(nav).toContain("t('publishCut')")
  })

  it('registers direction and publish walkthrough encodes', () => {
    expect([...PRIMARY_VALUE_MEDIA_IDS]).toEqual(['direction', 'publish'])
    expect(PRIMARY_VALUE_MEDIA.direction).toEqual({
      imageUrl: '',
      posterUrl: '/landing/primary-value/direction.webp',
      webmUrl: '/landing/primary-value/direction-en.webm?v=20261012',
      mp4Url: '/landing/primary-value/direction-en.mp4?v=20261012',
    })
    expect(PRIMARY_VALUE_MEDIA.publish).toEqual({
      imageUrl: '',
      posterUrl: '/landing/primary-value/publish.webp',
      webmUrl: '/landing/primary-value/publish-en.webm?v=20261012',
      mp4Url: '/landing/primary-value/publish-en.mp4?v=20261012',
    })
    expect(PRODUCTION_AGENT_MEDIA).toEqual({
      imageUrl: '',
      posterUrl: '/landing/primary-value/production-agent.webp',
      webmUrl: '/landing/primary-value/production-agent-en.webm?v=20261030',
      mp4Url: '/landing/primary-value/production-agent-en.mp4?v=20261030',
    })
    expect(getPrimaryValueMedia('agent')).toEqual(PRODUCTION_AGENT_MEDIA)
    expect(productionAgentVideoBlobPath('en')).toBe('Production Agent.mp4')
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(PRODUCTION_AGENT_VIDEO_BLOB_PATHS[id]).toBe(productionAgentVideoBlobPath(id))
    }
    expect(STUDIO_ACADEMY_MEDIA).toEqual({
      imageUrl: '',
      posterUrl: '/landing/primary-value/studio-academy.webp',
      webmUrl: '/landing/primary-value/studio-academy-en.webm?v=20261030',
      mp4Url: '/landing/primary-value/studio-academy-en.mp4?v=20261030',
    })
    expect(getPrimaryValueMedia('academy')).toEqual(STUDIO_ACADEMY_MEDIA)
    expect(getPrimaryValueMedia('studio-academy')).toEqual(STUDIO_ACADEMY_MEDIA)
    expect(studioAcademyVideoBlobPath('en')).toBe('SceneFlow Studio Academy.mp4')
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(STUDIO_ACADEMY_VIDEO_BLOB_PATHS[id]).toBe(studioAcademyVideoBlobPath(id))
    }

    const direct = readFileSync(join(ROOT, 'src/components/landing/DirectControlSection.tsx'), 'utf8')
    const publish = readFileSync(join(ROOT, 'src/components/landing/PublishCutSection.tsx'), 'utf8')
    expect(direct).not.toContain('videoLocales')
    expect(direct).not.toContain('getDirectControlVideoLocales')
    expect(publish).not.toContain('videoLocales')
    expect(publish).not.toContain('getPublishCutVideoLocales')

    const locales = getDirectControlVideoLocales()
    expect(locales.map((locale) => locale.id)).toEqual([...VIDEO_LOCALE_ORDER])
    expect(locales.filter((locale) => locale.available).map((locale) => locale.id)).toEqual([
      ...VIDEO_LOCALE_ORDER,
    ])
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(DIRECT_CONTROL_VIDEO_BLOB_PATHS[id]).toBe(directControlVideoBlobPath(id))
    }
    const english = locales.find((locale) => locale.id === 'en')
    expect(english?.webmUrl).toBe('/landing/primary-value/direction-en.webm?v=20261012')
    expect(english?.mp4Url).toBe('/landing/primary-value/direction-en.mp4?v=20261012')
    expect(
      twoModesVideoSources({
        imageUrl: '',
        posterUrl: '',
        webmUrl: english?.webmUrl ?? '',
        mp4Url: english?.mp4Url ?? '',
      }).map((source) => source.type)
    ).toEqual(['video/webm', 'video/mp4'])
    expect(directControlVideoBlobPath('en')).toBe('The control (English).mp4')
    expect(directControlVideoBlobPath('es')).toBe('The Control (Spanish).mp4')
    expect(directControlVideoBlobPath('zh')).toBe('The Control (Chinese).mp4')
    expect(directControlVideoBlobPath('ar')).toBe('The Control (Arabic).mp4')

    const publishLocales = getPublishCutVideoLocales()
    expect(publishLocales.map((locale) => locale.id)).toEqual([...VIDEO_LOCALE_ORDER])
    expect(publishLocales.filter((locale) => locale.available).map((locale) => locale.id)).toEqual([
      ...VIDEO_LOCALE_ORDER,
    ])
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(PUBLISH_CUT_VIDEO_BLOB_PATHS[id]).toBe(publishCutVideoBlobPath(id))
    }
    const englishCut = publishLocales.find((locale) => locale.id === 'en')
    expect(englishCut?.webmUrl).toBe('/landing/primary-value/publish-en.webm?v=20261012')
    expect(englishCut?.mp4Url).toBe('/landing/primary-value/publish-en.mp4?v=20261012')
    expect(
      twoModesVideoSources({
        imageUrl: '',
        posterUrl: '',
        webmUrl: englishCut?.webmUrl ?? '',
        mp4Url: englishCut?.mp4Url ?? '',
      }).map((source) => source.type)
    ).toEqual(['video/webm', 'video/mp4'])
    expect(publishCutVideoBlobPath('en')).toBe('The Cut (English).mp4')
    expect(publishCutVideoBlobPath('es')).toBe('The Cut (Spanish).mp4')
    expect(publishCutVideoBlobPath('zh')).toBe('The Cut (Chinese).mp4')
    expect(publishCutVideoBlobPath('ar')).toBe('The Cut (Arabic).mp4')

    for (const loc of ['es', 'pt', 'hi', 'zh-CN', 'ar', 'th'] as const) {
      const code = loc === 'zh-CN' ? 'zh' : loc
      expect(getPrimaryValueMedia('direction', loc).webmUrl).toBe(
        `/landing/primary-value/direction-${code}.webm?v=20261030`
      )
      expect(getPrimaryValueMedia('agent', loc).webmUrl).toBe(
        `/landing/primary-value/production-agent-${code}.webm?v=20261030`
      )
      expect(getPrimaryValueMedia('publish', loc).webmUrl).toBe(
        `/landing/primary-value/publish-${code}.webm?v=20261030`
      )
      expect(getPrimaryValueMedia('academy', loc).webmUrl).toBe(
        `/landing/primary-value/studio-academy-${code}.webm?v=20261030`
      )
    }

    expect(ANA_CHARACTER_VOICE.characterId).toBe('CHAR_ANA')
    expect(ANA_CHARACTER_VOICE.elevenLabsVoiceId).toBe('EXAVITQu4vr4xnSDxMaL')
    for (const sectionId of ['friction', 'control', 'agent', 'cut', 'academy'] as const) {
      for (const locale of HERO_DUB_LOCALE_IDS) {
        expect(HERO_SECTION_DUB_BEATS[sectionId][locale]).toHaveLength(3)
        expect(getHeroSectionDubNarration(sectionId, locale).length).toBeGreaterThan(20)
      }
    }

    for (const locale of HERO_DUB_LOCALE_IDS) {
      expect(existsSync(join(ROOT, `public/landing/two-modes/friction-${locale}.mp4`))).toBe(true)
      expect(existsSync(join(ROOT, `public/landing/two-modes/friction-${locale}.webm`))).toBe(true)
      for (const slot of ['direction', 'production-agent', 'publish', 'studio-academy'] as const) {
        expect(existsSync(join(ROOT, `public/landing/primary-value/${slot}-${locale}.mp4`))).toBe(
          true
        )
        expect(existsSync(join(ROOT, `public/landing/primary-value/${slot}-${locale}.webm`))).toBe(
          true
        )
      }
    }
  })
})
