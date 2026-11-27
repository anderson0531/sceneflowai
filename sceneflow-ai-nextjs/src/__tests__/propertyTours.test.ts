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
import { buildPropertyShowcaseBlueprintPrompt } from '@/lib/propertyTours/blueprintTemplate'
import { compileSceneFlowProjectToPropertyTour } from '@/lib/propertyTours/compileProjectToTour'

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

    // Verify Events (Cocktail Party, Family Gathering) & Additions (Wine Bar, Guest Casita) resolve accurately
    const partyAsset = resolvePerspectiveAsset(demoTour.rooms[0].perspectives.N, {
      style: 'modern_coastal',
      lighting: 'daylight',
      lifestyle: 'architectural',
      event: 'cocktail_party',
    })
    expect(partyAsset.imageUrl).toBe('/images/property-tours/demo/great-room-event-party.jpg')

    const familyAsset = resolvePerspectiveAsset(demoTour.rooms[0].perspectives.N, {
      style: 'modern_coastal',
      lighting: 'daylight',
      lifestyle: 'architectural',
      event: 'family_gathering',
    })
    expect(familyAsset.imageUrl).toBe('/images/property-tours/demo/great-room-event-family.jpg')

    const wineBarAsset = resolvePerspectiveAsset(demoTour.rooms[0].perspectives.N, {
      style: 'modern_coastal',
      lighting: 'daylight',
      lifestyle: 'architectural',
      addition: 'wine_cellar_bar',
    })
    expect(wineBarAsset.imageUrl).toBe('/images/property-tours/demo/addition-wine-bar.jpg')

    const aduAsset = resolvePerspectiveAsset(demoTour.rooms[2].perspectives.N, {
      style: 'modern_coastal',
      lighting: 'daylight',
      lifestyle: 'architectural',
      addition: 'adu_casita',
    })
    expect(aduAsset.imageUrl).toBe('/images/property-tours/demo/addition-adu-cabana.jpg')

    // Verify EN / ES / JA Narration & In-Scene Agent Sync scripts exist on every room
    for (const room of demoTour.rooms) {
      for (const lang of ['en', 'es', 'ja'] as const) {
        expect(room.narrationByLanguage?.[lang]?.script?.length).toBeGreaterThan(20)
        expect(room.agentSyncByLanguage?.[lang]?.script?.length).toBeGreaterThan(20)
      }
    }

    const publicDir = path.resolve(__dirname, '../../public')
    for (const track of demoTour.musicTracks || []) {
      if (track.audioUrl?.startsWith('/')) {
        expect(fs.existsSync(path.join(publicDir, track.audioUrl))).toBe(true)
      }
    }
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

  it('builds a 30+ minute Property Showcase Blueprint template with N/E/S/W, Event, Redesign, Addition & EN/ES/JA directives', () => {
    const prompt = buildPropertyShowcaseBlueprintPrompt({
      propertyTitle: '910 Pacific Bluff Villa',
      agentName: 'Marcus Sterling',
      spaces: ['Great Room', 'Kitchen', 'Pool Terrace', 'Primary Suite', 'Wine Cellar', 'Rooftop'],
    })
    expect(prompt).toContain('30+ MINUTES')
    expect(prompt).toContain('910 Pacific Bluff Villa')
    expect(prompt).toContain('Marcus Sterling')
    expect(prompt).toContain('[ROOM:')
    expect(prompt).toContain('[WALL: N]')
    expect(prompt).toContain('[EVENT: cocktail_party]')
    expect(prompt).toContain('[ADDITION: adu_casita]')
    expect(prompt).toContain('English (EN), Spanish (ES), and Japanese (JA)')
  })

  it('compiles a SceneFlow Production project (scenes, clips, multilingual narration) into a playable PropertyTourDTO', () => {
    const compiled = compileSceneFlowProjectToPropertyTour({
      projectId: 'proj-malibu-001',
      title: 'Malibu Bluff Showcase',
      script: {
        scenes: [
          {
            id: 'sc-1',
            heading: 'INT. GREAT ROOM - DAY [ROOM: Oceanfront Great Room] [WALL: N] [REDESIGN: modern_coastal]',
            narration: 'Welcome to the sunlit Great Room with 14-foot ocean sliders.',
            imageUrl: 'https://cdn.example.com/gr-n-coastal.jpg',
            narrationAudio: {
              en: 'https://cdn.example.com/gr-en.mp3',
              es: 'https://cdn.example.com/gr-es.mp3',
              ja: 'https://cdn.example.com/gr-ja.mp3',
            },
          },
          {
            id: 'sc-2',
            heading: 'INT. GREAT ROOM - TWILIGHT [ROOM: Oceanfront Great Room] [WALL: N] [EVENT: cocktail_party]',
            narration: 'Picture hosting an unforgettable sunset cocktail party here.',
            imageUrl: 'https://cdn.example.com/gr-n-party.jpg',
          },
          {
            id: 'sc-3',
            heading: 'EXT. INFINITY POOL - GOLDEN HOUR [ROOM: Pool Terrace] [WALL: N] [ADDITION: adu_casita]',
            narration: 'Add a detached glass Guest Casita overlooking the Pacific.',
            imageUrl: 'https://cdn.example.com/pool-adu.jpg',
          },
        ],
      },
      metadata: {
        visionPhase: {
          translations: {
            es: { scenes: [{ narration: 'Bienvenidos al Gran Salón frente al mar.' }] },
            ja: { scenes: [{ narration: 'オーシャンフロントのグレートルームへようこそ。' }] },
          },
        },
      },
      sceneProductionState: {
        'sc-1': {
          segments: [
            {
              startFrameUrl: 'https://cdn.example.com/gr-n-coastal.jpg',
              activeAssetType: 'video',
              activeAssetUrl: 'https://cdn.example.com/gr-n-pan.mp4',
              duration: 10,
            },
          ],
        },
      },
    })

    expect(compiled.stats.totalRooms).toBe(2)
    expect(compiled.stats.totalVideoClips).toBe(1)
    expect(compiled.stats.languagesDetected).toEqual(expect.arrayContaining(['en', 'es', 'ja']))

    const greatRoom = compiled.tour.rooms[0]
    expect(greatRoom.name).toBe('Oceanfront Great Room')
    expect(greatRoom.narrationByLanguage?.es?.script).toContain('Gran Salón')
    expect(greatRoom.narrationByLanguage?.ja?.audioUrl).toBe('https://cdn.example.com/gr-ja.mp3')

    const partyPlate = resolvePerspectiveAsset(greatRoom.perspectives.N, {
      style: 'modern_coastal',
      lighting: 'twilight',
      lifestyle: 'entertaining',
      event: 'cocktail_party',
    })
    expect(partyPlate.imageUrl).toBe('https://cdn.example.com/gr-n-party.jpg')

    const aduPlate = resolvePerspectiveAsset(compiled.tour.rooms[1].perspectives.N, {
      style: 'modern_coastal',
      lighting: 'golden_hour',
      lifestyle: 'architectural',
      addition: 'adu_casita',
    })
    expect(aduPlate.imageUrl).toBe('https://cdn.example.com/pool-adu.jpg')
  })
})
