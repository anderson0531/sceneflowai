import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { DIRECT_CONTROL_COPY } from '@/config/landing/directControlCopy'
import { PUBLISH_CUT_COPY } from '@/config/landing/publishCutCopy'
import {
  DIRECT_CONTROL_VIDEO_BLOB_PATHS,
  PRIMARY_VALUE_MEDIA,
  PRIMARY_VALUE_MEDIA_IDS,
  PUBLISH_CUT_VIDEO_BLOB_PATHS,
  directControlVideoBlobPath,
  getDirectControlVideoLocales,
  getPublishCutVideoLocales,
  publishCutVideoBlobPath,
} from '@/config/landing/primaryValueMedia'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'
import { twoModesVideoSources } from '@/config/landing/twoModesMedia'

const ROOT = join(process.cwd())

describe('primary value sections', () => {
  it('keeps direction and publish copy next to friction', () => {
    expect(DIRECT_CONTROL_COPY.eyebrow).toBe('The control you keep')
    expect(DIRECT_CONTROL_COPY.title).toBe('Direct the story. Let agents do the prompting.')
    expect(DIRECT_CONTROL_COPY.subtitle).toContain('only then spend on motion')
    expect(DIRECT_CONTROL_COPY.cta).toBe('Launch Studio ($9)')
    expect(PUBLISH_CUT_COPY.eyebrow).toBe('The cut you publish')
    expect(PUBLISH_CUT_COPY.title).toBe('Flexible Distribution, Direct from SceneFlow Studio')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('YouTube, Facebook, or TikTok')
    expect(PUBLISH_CUT_COPY.subtitle).toContain('Screening Room')
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
    const publishAt = landing.indexOf('<PublishCutSection />')
    const featuresAt = landing.indexOf('<KeyFeaturesSection />')

    expect(frictionAt).toBeGreaterThan(-1)
    expect(directAt).toBeGreaterThan(frictionAt)
    expect(publishAt).toBeGreaterThan(directAt)
    expect(featuresAt).toBeGreaterThan(publishAt)
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
      webmUrl: '/landing/primary-value/direction-en.webm',
      mp4Url: '/landing/primary-value/direction-en.mp4',
    })
    expect(PRIMARY_VALUE_MEDIA.publish).toEqual({
      imageUrl: '',
      posterUrl: '/landing/primary-value/publish.webp',
      webmUrl: '/landing/primary-value/publish-en.webm',
      mp4Url: '/landing/primary-value/publish-en.mp4',
    })

    const direct = readFileSync(join(ROOT, 'src/components/landing/DirectControlSection.tsx'), 'utf8')
    const publish = readFileSync(join(ROOT, 'src/components/landing/PublishCutSection.tsx'), 'utf8')
    expect(direct).toContain('videoLocales={getDirectControlVideoLocales()}')
    expect(publish).toContain('videoLocales={getPublishCutVideoLocales()}')

    const locales = getDirectControlVideoLocales()
    expect(locales.map((locale) => locale.id)).toEqual([...VIDEO_LOCALE_ORDER])
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(DIRECT_CONTROL_VIDEO_BLOB_PATHS[id]).toBe(directControlVideoBlobPath(id))
      const locale = locales.find((entry) => entry.id === id)
      if (!locale) throw new Error(`missing control locale ${id}`)
      expect(locale.available).toBe(true)
      expect(locale.webmUrl).toBe(`/landing/primary-value/direction-${id}.webm`)
      expect(locale.mp4Url).toBe(`/landing/primary-value/direction-${id}.mp4`)
      expect(locale.src).toBe(`/landing/primary-value/direction-${id}.mp4`)
      expect(
        twoModesVideoSources({
          imageUrl: '',
          posterUrl: '',
          webmUrl: locale.webmUrl,
          mp4Url: locale.mp4Url,
        }).map((source) => source.type)
      ).toEqual(['video/webm', 'video/mp4'])
    }
    expect(directControlVideoBlobPath('en')).toBe('The Control (English).mp4')
    expect(directControlVideoBlobPath('es')).toBe('The Control (Spanish).mp4')
    expect(directControlVideoBlobPath('pt')).toBe('The Control (Portuguese).mp4')
    expect(directControlVideoBlobPath('hi')).toBe('The Control (Hindi).mp4')
    expect(directControlVideoBlobPath('zh')).toBe('The Control (Chinese).mp4')
    expect(directControlVideoBlobPath('ar')).toBe('The Control (Arabic).mp4')
    expect(directControlVideoBlobPath('th')).toBe('The Control (Thai).mp4')

    const publishLocales = getPublishCutVideoLocales()
    expect(publishLocales.map((locale) => locale.id)).toEqual([...VIDEO_LOCALE_ORDER])
    for (const id of VIDEO_LOCALE_ORDER) {
      expect(PUBLISH_CUT_VIDEO_BLOB_PATHS[id]).toBe(publishCutVideoBlobPath(id))
      const locale = publishLocales.find((entry) => entry.id === id)
      if (!locale) throw new Error(`missing cut locale ${id}`)
      expect(locale.available).toBe(true)
      expect(locale.webmUrl).toBe(`/landing/primary-value/publish-${id}.webm`)
      expect(locale.mp4Url).toBe(`/landing/primary-value/publish-${id}.mp4`)
      expect(locale.src).toBe(`/landing/primary-value/publish-${id}.mp4`)
      expect(
        twoModesVideoSources({
          imageUrl: '',
          posterUrl: '',
          webmUrl: locale.webmUrl,
          mp4Url: locale.mp4Url,
        }).map((source) => source.type)
      ).toEqual(['video/webm', 'video/mp4'])
    }
    expect(publishCutVideoBlobPath('en')).toBe('The Cut (English).mp4')
    expect(publishCutVideoBlobPath('es')).toBe('The Cut (Spanish).mp4')
    expect(publishCutVideoBlobPath('pt')).toBe('The Cut (Portuguese).mp4')
    expect(publishCutVideoBlobPath('hi')).toBe('The Cut (Hindi).mp4')
    expect(publishCutVideoBlobPath('zh')).toBe('The Cut (Chinese).mp4')
    expect(publishCutVideoBlobPath('ar')).toBe('The Cut (Arabic).mp4')
    expect(publishCutVideoBlobPath('th')).toBe('The Cut (Thai).mp4')
  })
})
