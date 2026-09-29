import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { DIRECT_CONTROL_COPY } from '@/config/landing/directControlCopy'
import { PUBLISH_CUT_COPY } from '@/config/landing/publishCutCopy'
import {
  PRIMARY_VALUE_MEDIA,
  PRIMARY_VALUE_MEDIA_IDS,
} from '@/config/landing/primaryValueMedia'

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

  it('registers direction walkthrough encodes and leaves publish empty', () => {
    expect([...PRIMARY_VALUE_MEDIA_IDS]).toEqual(['direction', 'publish'])
    expect(PRIMARY_VALUE_MEDIA.direction).toEqual({
      imageUrl: '',
      posterUrl: '/landing/primary-value/direction.webp',
      webmUrl: '/landing/primary-value/direction.webm',
      mp4Url: '/landing/primary-value/direction.mp4',
    })
    expect(PRIMARY_VALUE_MEDIA.publish).toEqual({
      imageUrl: '',
      posterUrl: '',
      webmUrl: '',
      mp4Url: '',
    })
  })
})
