import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createDefaultRoom,
  getNextClockwiseDirection,
  getPrevClockwiseDirection,
  resolvePerspectiveAsset,
} from '@/lib/propertyTours/types'
import {
  buildPropertyPerspectivePrompt,
  buildPropertyTourUrls,
  buildPublicDemoPropertyTourDTO,
  buildSampleDemoRooms,
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  getIncludedActiveListingSlots,
  isPublicDemoTourSlug,
  slugifyPropertyTitle,
} from '@/lib/propertyTours/hostingPolicy'
import { isPublicRoute } from '@/constants/publicRoutes'

describe('Interactive Property Explorer — Schema, Compass & Asset Resolution', () => {
  it('cycles N -> E -> S -> W cleanly in both directions', () => {
    expect(getNextClockwiseDirection('N')).toBe('E')
    expect(getNextClockwiseDirection('E')).toBe('S')
    expect(getNextClockwiseDirection('S')).toBe('W')
    expect(getNextClockwiseDirection('W')).toBe('N')
    expect(getPrevClockwiseDirection('N')).toBe('W')
    expect(getPrevClockwiseDirection('W')).toBe('S')
  })

  it('resolves exact style+lighting+lifestyle match, respects showOriginal, and falls back gracefully', () => {
    const rooms = buildSampleDemoRooms()
    const greatRoomNorth = rooms[0].perspectives.N

    const exact = resolvePerspectiveAsset(greatRoomNorth, {
      style: 'modern_coastal',
      lighting: 'twilight',
      lifestyle: 'entertaining',
    })
    expect(exact.isOriginal).toBe(false)
    expect(exact.isVirtuallyModified).toBe(true)
    expect(exact.variant?.id).toBe('var-gr-n-coastal-twilight')

    const original = resolvePerspectiveAsset(greatRoomNorth, {
      style: 'modern_coastal',
      lighting: 'twilight',
      lifestyle: 'entertaining',
      showOriginal: true,
    })
    expect(original.isOriginal).toBe(true)
    expect(original.isVirtuallyModified).toBe(false)
    expect(original.imageUrl).toBe(greatRoomNorth.originalImageUrl)

    // Fallback when requested lifestyle does not exist for a style
    const fallback = resolvePerspectiveAsset(greatRoomNorth, {
      style: 'modern_coastal',
      lighting: 'golden_hour',
      lifestyle: 'family_gathering',
    })
    expect(fallback.variant?.style).toBe('modern_coastal')
  })

  it('locks E/S/W cross-angle prompts to the North Anchor reference image', () => {
    const room = createDefaultRoom({
      id: 'room-1',
      name: 'Great Room',
      roomType: 'living',
      orderIndex: 0,
    })

    const northPrompt = buildPropertyPerspectivePrompt({
      room,
      direction: 'N',
      style: 'modern_coastal',
      lighting: 'golden_hour',
      lifestyle: 'architectural',
      isAnchor: true,
      hasOriginalPhoto: true,
      hasAnchorReference: false,
    })
    expect(northPrompt).toContain('ARCHITECTURAL GROUNDING')
    expect(northPrompt).not.toContain('CROSS-ANGLE CONTINUITY LOCK')

    const eastPrompt = buildPropertyPerspectivePrompt({
      room,
      direction: 'E',
      style: 'modern_coastal',
      lighting: 'golden_hour',
      lifestyle: 'architectural',
      isAnchor: false,
      hasOriginalPhoto: true,
      hasAnchorReference: true,
    })
    expect(eastPrompt).toContain('ARCHITECTURAL GROUNDING')
    expect(eastPrompt).toContain('CROSS-ANGLE CONTINUITY LOCK')
    expect(eastPrompt).toContain('Reference Image 2')
  })
})

describe('Property Tour Hosting Policy, Embed URLs & Standalone Routing', () => {
  it('enforces tiered included active listing quotas and $1.50/mo extra listing rate', () => {
    expect(getIncludedActiveListingSlots('explorer')).toBe(1)
    expect(getIncludedActiveListingSlots('hobbyist')).toBe(2)
    expect(getIncludedActiveListingSlots('starter')).toBe(5)
    expect(getIncludedActiveListingSlots('pro')).toBe(15)
    expect(getIncludedActiveListingSlots('studio')).toBe(60)
    expect(EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS).toBe(150)
  })

  it('builds clean shareable /tour/[slug] URLs and responsive iframe embed code', () => {
    const slug = slugifyPropertyTitle('418 Ocean Crest Drive — Coastal Villa!', 'a1b2c3')
    expect(slug).toBe('418-ocean-crest-drive-coastal-villa-a1b2c3')

    const urls = buildPropertyTourUrls(slug, 'https://sceneflowai.studio')
    expect(urls.shareUrl).toBe(`https://sceneflowai.studio/tour/${slug}`)
    expect(urls.embedUrl).toBe(`https://sceneflowai.studio/tour/${slug}?embed=1`)
    expect(urls.iframeCode).toContain('<iframe')
    expect(urls.iframeCode).toContain('?embed=1')
  })

  it('treats /property-tours and /tour/[slug] as public routes (not behind login) and serves bundled demo assets', () => {
    expect(isPublicRoute('/property-tours')).toBe(true)
    expect(isPublicRoute('/tour/demo')).toBe(true)
    expect(isPublicRoute('/tour/418-ocean-crest')).toBe(true)
    expect(isPublicRoute('/dashboard/property-tours')).toBe(false)
    expect(isPublicDemoTourSlug('demo')).toBe(true)

    const demoTour = buildPublicDemoPropertyTourDTO('demo')
    expect(demoTour.status).toBe('published')
    expect(demoTour.rooms.length).toBeGreaterThanOrEqual(3)
    expect(demoTour.rooms[0].perspectives.N.variants[0]?.imageUrl).toContain(
      '/images/property-tours/demo/'
    )

    const publicDir = path.resolve(__dirname, '../../public')
    for (const room of demoTour.rooms) {
      for (const dir of ['N', 'E', 'S', 'W'] as const) {
        const p = room.perspectives[dir]
        if (p.originalImageUrl?.startsWith('/')) {
          expect(fs.existsSync(path.join(publicDir, p.originalImageUrl))).toBe(true)
        }
        for (const v of p.variants) {
          if (v.imageUrl.startsWith('/')) {
            expect(fs.existsSync(path.join(publicDir, v.imageUrl))).toBe(true)
          }
        }
      }
    }

    const nextConfigSrc = fs.readFileSync(
      path.resolve(__dirname, '../../next.config.mjs'),
      'utf8'
    )
    expect(nextConfigSrc).toContain('source: "/tour/:path*"')
    expect(nextConfigSrc).toContain('frame-ancestors *;')
  })
})
