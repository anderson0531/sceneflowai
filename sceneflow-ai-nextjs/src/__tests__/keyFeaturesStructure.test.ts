import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { FEATURE_ICONS } from '@/components/landing/keyFeatureIcons'
import {
  FEATURE_ROOM_IDS,
  FEATURE_ROOM_OVERVIEW_SECONDS,
  featureRoomHasVideo,
  featureRoomVideoSources,
  getFeatureRoomMedia,
  getFeatureRoomVideoLocales,
} from '@/config/landing/featureRoomMedia'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'

const ROOT = path.resolve(__dirname, '../..')

type Feature = {
  icon: string
  title: string
  description: string
  screenshot: string
  learnMore?: { items?: Array<{ title?: string; description?: string }> }
}

function sentenceCount(text: string): number {
  const withoutDecimals = text.replace(/\d+\.\d+/g, (match) => match.replace('.', ''))
  return withoutDecimals.split(/[.?!]/).filter((part) => part.trim()).length
}

type Room = {
  id: string
  label: string
  promise: string
  features?: Feature[]
  spend?: { label: string; features: Feature[] }
  groups?: Array<{ id: string; label: string; features: Feature[] }>
}

function loadEnglish(): {
  keyFeatures: {
    title: string
    subtitle: string
    landingUiLanguagesLabel: string
    rooms: Room[]
  }
} {
  return JSON.parse(readFileSync(path.join(ROOT, 'messages/en.json'), 'utf8'))
}

function featuresOf(room: Room): Feature[] {
  return [
    ...(room.features ?? []),
    ...(room.spend?.features ?? []),
    ...(room.groups ?? []).flatMap((group) => group.features),
  ]
}

const EXPECTED_TITLES: Record<string, string[]> = {
  'series-desk': [
    'Season universe',
    'Episode handoff',
    'Reshape · with Direction',
    'Direct this episode',
  ],
  'blueprint-board': [
    'Treatment and beat sheet',
    'Audience Resonance',
    'Co-Director · Blueprint',
    'Stakeholder review',
  ],
  'production-stage': [
    'Bring Your Own Key',
    'Production Planner',
    'Script',
    'Script Audience Resonance',
    'Scene Director',
    'Script Director',
    'Reference Library',
    'Production Agents',
    'Direct Shot',
    'Pre-Vis before motion',
    'Mixer',
    'Language Streams',
    'Delivery resolution',
    'Version control',
    'Promotion trailers',
  ],
  'screening-room': [
    'One player',
    'Collaborate on the cut',
    'Release when it is ready',
  ],
}

describe('keyFeatures structure', () => {
  const en = loadEnglish()
  const rooms = en.keyFeatures.rooms

  it('stacks four rooms from idea to master', () => {
    expect(en.keyFeatures.title).toBe('From the idea to the master.')
    expect(en.keyFeatures.subtitle).toBe(
      'Series Room → Blueprint Room → Production Stage → Screening Room.'
    )
    expect(rooms.map((room) => room.id)).toEqual([...FEATURE_ROOM_IDS])
    expect(rooms.map((room) => room.label)).toEqual([
      'Series Room',
      'Blueprint Room',
      'Production Stage',
      'Screening Room',
    ])
    expect(en.keyFeatures).not.toHaveProperty('categories')
  })

  it('matches the room feature titles, including Production Stage groups', () => {
    const production = rooms.find((room) => room.id === 'production-stage')
    expect(production?.spend?.label).toBe('Spend')
    expect(production?.groups?.map((group) => group.label)).toEqual([
      'Script',
      'Production',
      'Deployment',
    ])
    for (const room of rooms) {
      expect(featuresOf(room).map((feature) => feature.title)).toEqual(
        EXPECTED_TITLES[room.id]
      )
    }
  })

  it('maps every feature icon key to FEATURE_ICONS', () => {
    const icons = rooms.flatMap((room) => featuresOf(room).map((feature) => feature.icon))
    for (const icon of icons) {
      expect(FEATURE_ICONS[icon]).toBeDefined()
    }
    expect(Object.keys(FEATURE_ICONS).sort()).toEqual([...new Set(icons)].sort())
  })

  it('gives every card a detailed description, a screenshot, and a one-sentence feature list', () => {
    expect(en.keyFeatures).not.toHaveProperty('problemLabel')
    expect(en.keyFeatures).not.toHaveProperty('solutionLabel')
    expect(en.keyFeatures).not.toHaveProperty('outcomeLabel')
    for (const feature of rooms.flatMap(featuresOf)) {
      expect(sentenceCount(feature.description)).toBeGreaterThanOrEqual(2)
      expect(feature.screenshot).toBeTruthy()
      expect(feature.learnMore?.items?.length).toBeGreaterThan(0)
      expect(feature.learnMore).not.toHaveProperty('problem')
      expect(feature.learnMore).not.toHaveProperty('solution')
      expect(feature.learnMore).not.toHaveProperty('outcome')
      for (const item of feature.learnMore?.items ?? []) {
        expect(item.title).toBeTruthy()
        expect(sentenceCount(item.description ?? '')).toBe(1)
      }
    }
  })

  it('reserves a 30-second WebM overview in seven languages for each room', () => {
    expect(FEATURE_ROOM_OVERVIEW_SECONDS).toBe(30)
    for (const roomId of FEATURE_ROOM_IDS) {
      const locales = getFeatureRoomVideoLocales(roomId)
      expect(locales.map((locale) => locale.id)).toEqual([...VIDEO_LOCALE_ORDER])
      expect(locales.every((locale) => !locale.available)).toBe(true)
      expect(featureRoomHasVideo(getFeatureRoomMedia(roomId))).toBe(false)
      for (const locale of VIDEO_LOCALE_ORDER) {
        const sources = featureRoomVideoSources(roomId, locale)
        expect(sources.map((source) => source.type)).toEqual(['video/webm', 'video/mp4'])
        expect(sources[0].src).toBe(`/landing/key-features/rooms/${roomId}-${locale}.webm`)
        expect(sources[1].src).toBe(`/landing/key-features/rooms/${roomId}-${locale}.mp4`)
      }
    }
  })

  it('keeps beats on the Blueprint and ships finished pieces from Screening Room', () => {
    const text = JSON.stringify(en.keyFeatures.rooms)
    expect(text).toContain('Beats exist only here')
    expect(text).toContain('Production Stage turns each beat into a chapter')
    expect(text).toContain('3–5 minute scene')
    expect(text).toContain('8–12 minute chapter')
    expect(text).toContain('Scene Director · Scene N')
    expect(text).toContain('Direct Shot · Scene N · Shot N')
    expect(text).toContain('Gemini TTS speaks the dub in 44 languages')
    expect(text).toContain('Veo 3.1 renders the master in 4K')
    expect(text).toContain('January 2027')
    expect(text).not.toContain('70+')
    expect(text).not.toContain('Google AI Studio')
    expect(text).not.toContain('Omni already')
  })

  it('mirrors keyFeatures into the JSON-maintained English source', () => {
    const maintained = JSON.parse(
      readFileSync(path.join(ROOT, 'src/config/landing/jsonMaintainedCopy.json'), 'utf8')
    )
    expect(maintained.keyFeatures).toEqual(en.keyFeatures)
  })

  it('replaces locale category lists so Plan / Create / Release cannot override the rooms', () => {
    for (const name of readdirSync(path.join(ROOT, 'messages'))) {
      if (!name.endsWith('.json') || name === 'en.json') continue
      const locale = JSON.parse(readFileSync(path.join(ROOT, 'messages', name), 'utf8'))
      expect(locale.keyFeatures?.categories, name).toBeUndefined()
      expect(locale.twoModes?.stages, name).toBeUndefined()
      if (locale.keyFeatures) {
        expect(locale.keyFeatures.subtitle, name).toBe(en.keyFeatures.subtitle)
      }
    }
  })

  it('shows one room tab, one overview, and the selected feature screenshot', () => {
    const section = readFileSync(
      path.join(ROOT, 'src/components/landing/KeyFeaturesSection.tsx'),
      'utf8'
    )
    const overview = readFileSync(
      path.join(ROOT, 'src/components/landing/FeatureRoomOverview.tsx'),
      'utf8'
    )

    expect(section).toContain("const SECTION_ID = 'key-features'")
    expect(section).toContain('id={room.id}')
    expect(section).toContain("t.raw('rooms')")
    expect(section).toContain('hashchange')
    expect(section.split('<FeatureRoomOverview').length - 1).toBe(1)
    expect(section).toContain("t('overviewComingSoon')")
    expect(section).toContain('room.spend')
    expect(section).toContain('room.groups')
    expect(section).toContain('key-feature-group-')
    expect(section).toContain('lg:grid')
    expect(section.split('feature.screenshot').length - 1).toBe(1)
    expect(section).toContain('aspect-video')
    expect(section).not.toContain('MultiLanguageVideoPlayer')
    expect(section).not.toContain("t.raw('categories')")
    expect(section).toContain("feature.icon === 'languageStreams'")
    expect(section).toContain("t('landingUiLanguagesLabel')")
    expect(section).not.toContain('outcomeLabel')
    expect(section).not.toContain('problemLabel')
    expect(section).not.toContain('solutionLabel')
    expect(section).toContain('learnMore.items')
    expect(section).toContain("t('videoSoon')")
    expect(section).toContain('LANDING_TRANSLATE_LANGUAGES')

    const descriptionEnd = section.indexOf('{feature.description}')
    const screenshotStart = section.indexOf('feature.screenshot')
    const featureList = section.indexOf('learnMore.items')
    const languagesBlock = section.indexOf('<LandingUiLanguagesBlock')
    expect(descriptionEnd).toBeGreaterThan(-1)
    expect(screenshotStart).toBeGreaterThan(descriptionEnd)
    expect(featureList).toBeGreaterThan(screenshotStart)
    expect(languagesBlock).toBeGreaterThan(featureList)
    expect(section.slice(descriptionEnd, screenshotStart)).not.toContain('LandingUiLanguagesBlock')

    expect(en.keyFeatures.landingUiLanguagesLabel).toContain('44 languages')
    expect(en.keyFeatures.landingUiLanguagesLabel).toContain('39')
    expect(en.keyFeatures.landingUiLanguagesLabel).not.toContain('70+')

    const webmAt = overview.indexOf('type="video/webm"')
    const mp4At = overview.indexOf('type="video/mp4"')
    expect(webmAt).toBeGreaterThan(-1)
    expect(mp4At).toBeGreaterThan(webmAt)
    expect(overview).toContain('min-h-[180px]')
    expect(overview).not.toContain('min-h-[280px]')
    expect(overview).toContain('IntersectionObserver')
    expect(overview).toContain('useReducedMotion')
    expect(overview).toContain('comingSoonLabel')
    expect(overview).toContain('useLandingVideoLocale')
    expect(overview).toContain('VideoLanguageControl')
    expect(overview).toContain('soonLabel')
  })
})
