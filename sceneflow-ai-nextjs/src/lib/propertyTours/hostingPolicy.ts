/**
 * Property Tours — White-Label Hosting Monetization, Prompt Builder & Embed Helpers
 *
 * Dual monetization model:
 * 1. One-time creation credits (escrow-metered Gemini 3 Pro 2K plates + optional FTV motion transitions)
 * 2. Recurring monthly active-listing hosting: each tier includes active published listing slots;
 *    active listings above plan quota bill `EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS` (150 cr/mo = $1.50/mo)
 *    while agencies retail white-label interactive hosting to brokerages at $29–$99/mo per listing.
 */

import {
  PROPERTY_ADDITION_PRESETS,
  PROPERTY_EVENT_PRESETS,
  PROPERTY_LIFESTYLE_PRESETS,
  PROPERTY_LIGHTING_PRESETS,
  PROPERTY_STYLE_PRESETS,
  type CompassDirection,
  type PropertyAdditionId,
  type PropertyEventId,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyRoom,
  type PropertyStyleId,
  type PropertyTourDTO,
} from './types'

export const EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS = 150 // $1.50/mo face value per extra active listing

export const INCLUDED_ACTIVE_LISTINGS_BY_TIER: Record<string, number> = {
  free: 1,
  explorer: 1,
  trial: 1,
  hobbyist: 2,
  starter: 5,
  pro: 15,
  studio: 60,
  enterprise: 9999,
}

export function getIncludedActiveListingSlots(tierName?: string | null): number {
  const key = (tierName || 'explorer').trim().toLowerCase()
  return INCLUDED_ACTIVE_LISTINGS_BY_TIER[key] ?? 1
}

export function getCurrentBillingMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function slugifyPropertyTitle(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'property-tour'
  return suffix ? `${base}-${suffix}` : base
}

/**
 * Build cross-angle locked architectural prompt for a room wall (N, E, S, W).
 * When generating E/S/W after the Anchor (N), explicitly locks materials, flooring,
 * paint palette, and light direction to Reference Image #2 (the approved Anchor plate).
 */
export function buildPropertyPerspectivePrompt(args: {
  room: PropertyRoom
  direction: CompassDirection
  style: PropertyStyleId
  lighting: PropertyLightingId
  lifestyle: PropertyLifestyleId
  event?: PropertyEventId
  addition?: PropertyAdditionId
  isAnchor: boolean
  hasOriginalPhoto: boolean
  hasAnchorReference: boolean
  customInstructions?: string
}): string {
  const stylePreset =
    PROPERTY_STYLE_PRESETS.find((s) => s.id === args.style) ?? PROPERTY_STYLE_PRESETS[1]
  const lightingPreset =
    PROPERTY_LIGHTING_PRESETS.find((l) => l.id === args.lighting) ?? PROPERTY_LIGHTING_PRESETS[0]
  const lifestylePreset =
    PROPERTY_LIFESTYLE_PRESETS.find((ls) => ls.id === args.lifestyle) ?? PROPERTY_LIFESTYLE_PRESETS[0]
  const eventPreset = args.event && args.event !== 'none'
    ? PROPERTY_EVENT_PRESETS.find((e) => e.id === args.event)
    : undefined
  const additionPreset = args.addition && args.addition !== 'none'
    ? PROPERTY_ADDITION_PRESETS.find((a) => a.id === args.addition)
    : undefined

  const compassNames: Record<CompassDirection, string> = {
    N: 'North wall (primary hero perspective)',
    E: 'East wall (90° clockwise from North)',
    S: 'South wall (180° opposite North)',
    W: 'West wall (90° counter-clockwise from North)',
  }

  const lines: string[] = [
    `Architectural luxury real estate photograph of the ${args.room.name} (${compassNames[args.direction]}).`,
    `REDESIGN STYLE (${stylePreset.label}): ${stylePreset.promptGuidance}`,
    `LIGHTING (${lightingPreset.label}): ${lightingPreset.promptGuidance}`,
    `LIFESTYLE STAGING (${lifestylePreset.label}): ${lifestylePreset.promptGuidance}`,
  ]

  if (eventPreset) {
    lines.push(`LIVE EVENT SCENARIO (${eventPreset.label}): ${eventPreset.promptGuidance}`)
  }

  if (additionPreset) {
    lines.push(`ARCHITECTURAL ADDITION (${additionPreset.label}): ${additionPreset.promptGuidance}`)
  }

  if (args.hasOriginalPhoto) {
    lines.push(
      'ARCHITECTURAL GROUNDING (Reference Image 1 = real property photo): Strictly preserve the exact room geometry, window placements, ceiling height, walls, structural columns, doorways, and camera perspective from Reference Image 1. Do NOT invent non-existent rooms, move structural walls, or warp proportions.'
    )
  }

  if (!args.isAnchor && args.hasAnchorReference) {
    lines.push(
      `CROSS-ANGLE CONTINUITY LOCK (Reference Image 2 = approved ${args.room.anchorDirection} Anchor view of this exact same room): Match the exact flooring wood/stone material, wall paint tone, cabinetry finish, countertop stone veining, hardware metal finish, and lighting color temperature from Reference Image 2 so rotating N -> E -> S -> W feels like standing inside one continuous real room.`
    )
  }

  if (args.room.description?.trim()) {
    lines.push(`ROOM CONTEXT: ${args.room.description.trim()}`)
  }

  if (args.customInstructions?.trim()) {
    lines.push(`ADDITIONAL DIRECTIVE: ${args.customInstructions.trim()}`)
  }

  lines.push(
    'CAMERA & QUALITY: Shot on 24mm tilt-shift architectural lens, straight verticals, photorealistic editorial real estate photography, ultra-sharp textures, zero watermarks, zero text overlays, zero fisheye distortion.'
  )

  return lines.join('\n')
}

export function buildPropertyTourUrls(slug: string, baseUrl?: string): {
  shareUrl: string
  embedUrl: string
  iframeCode: string
} {
  const origin = (baseUrl || 'https://sceneflowai.studio').replace(/\/$/, '')
  const shareUrl = `${origin}/tour/${encodeURIComponent(slug)}`
  const embedUrl = `${shareUrl}?embed=1`
  const iframeCode = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;"><iframe src="${embedUrl}" title="Interactive Property Tour" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="fullscreen; autoplay" allowfullscreen loading="lazy"></iframe></div>`
  return { shareUrl, embedUrl, iframeCode }
}

export const PUBLIC_DEMO_TOUR_SLUGS = ['demo', 'malibu-oceanfront-demo'] as const

export function isPublicDemoTourSlug(slug: string): boolean {
  const normalized = (slug || '').trim().toLowerCase()
  return (PUBLIC_DEMO_TOUR_SLUGS as readonly string[]).includes(normalized)
}

/**
 * Creates a rich, immediately playable Interactive Demo Property Tour using
 * bundled photorealistic architectural plates in `/images/property-tours/demo/`
 * so buyers & agencies can test N/E/S/W compass navigation, Before/After slider,
 * and Style/Lighting toggles with ZERO login and ZERO database dependency.
 */
export function buildSampleDemoRooms(): PropertyRoom[] {
  const now = new Date().toISOString()

  const greatRoomNOriginal = '/images/property-tours/demo/great-room-n-original.jpg'
  const greatRoomNCoastal = '/images/property-tours/demo/great-room-n-coastal.jpg'
  const greatRoomECoastal = '/images/property-tours/demo/great-room-e-coastal.jpg'
  const greatRoomSCoastal = '/images/property-tours/demo/great-room-s-coastal.jpg'
  const greatRoomWCoastal = '/images/property-tours/demo/great-room-w-coastal.jpg'
  const greatRoomEventParty = '/images/property-tours/demo/great-room-event-party.jpg'
  const greatRoomEventFamily = '/images/property-tours/demo/great-room-event-family.jpg'
  const additionWineBar = '/images/property-tours/demo/addition-wine-bar.jpg'
  const additionAduCasita = '/images/property-tours/demo/addition-adu-cabana.jpg'
  const agentPresenterPoster = '/images/property-tours/demo/agent-elena-presenter.jpg'
  const kitchenNOriginal = '/images/property-tours/demo/kitchen-n-original.jpg'
  const kitchenNRemodel = '/images/property-tours/demo/kitchen-n-remodel.jpg'
  const poolNTwilight = '/images/property-tours/demo/pool-n-twilight.jpg'

  return [
    {
      id: 'room-great-room-demo',
      name: 'Oceanfront Great Room',
      roomType: 'living',
      orderIndex: 0,
      description: 'Panoramic coastal living room with 14-foot glass sliders, white oak plank floors, and exposed cedar beams.',
      renovationEstimateUsd: 42000,
      anchorDirection: 'N',
      narrationAudioUrl: '/api/property-tours/demo-audio?room=great-room&mode=narration&lang=en',
      narrationScript:
        'Welcome to the Oceanfront Great Room at 742 Oceanfront Terrace. Rotate across all four walls, drag the Before and After slider to compare the vacant space against our Modern Coastal redesign, or preview a Family Gathering, Sunset Cocktail Party, or Glass Wine Bar addition.',
      narrationByLanguage: {
        en: {
          script:
            'Welcome to the Oceanfront Great Room at 742 Oceanfront Terrace. Rotate across all four walls, compare the vacant original against our Modern Coastal redesign, or preview a Family Gathering, Sunset Cocktail Party, or Glass Wine Bar addition.',
          audioUrl: '/api/property-tours/demo-audio?room=great-room&mode=narration&lang=en',
        },
        es: {
          script:
            'Bienvenidos al Gran Salón frente al océano en 742 Oceanfront Terrace. Gire por las cuatro paredes, compare el espacio original con el rediseño Costero Moderno, o visualice una reunión familiar, un cóctel al atardecer o una cava de vinos de vidrio.',
          audioUrl: '/api/property-tours/demo-audio?room=great-room&mode=narration&lang=es',
        },
        ja: {
          script:
            '742オーシャンフロント・テラスのオーシャンフロント・グレートルームへようこそ。東西南北の4方向を自由に切り替え、空室状態とモダンコースタルのリデザインを比較したり、家族の集まりやサンセットパーティー、ワインバー増築をプレビューできます。',
          audioUrl: '/api/property-tours/demo-audio?room=great-room&mode=narration&lang=ja',
        },
      },
      agentSyncByLanguage: {
        en: {
          script:
            'Hi, I am Elena Vance with Pacific Crest Estates. Standing right here in the Oceanfront Great Room, notice how the 14-foot glass sliders open directly to the Pacific horizon. Tap Events or Additions below to see how effortlessly this room transforms for your lifestyle.',
          audioUrl: '/api/property-tours/demo-audio?room=great-room&mode=agent&lang=en',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
        es: {
          script:
            'Hola, soy Elena Vance de Pacific Crest Estates. Desde este Gran Salón con puertas de cristal de cuatro metros, el océano Pacífico se convierte en parte de su hogar. Pruebe los botones de Eventos y Adiciones para imaginar su próxima celebración aquí.',
          audioUrl: '/api/property-tours/demo-audio?room=great-room&mode=agent&lang=es',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
        ja: {
          script:
            'パシフィック・クレスト・エステートのエレナ・ヴァンスです。高さ4メートルのガラス扉の向こうに太平洋が広がるこのグレートルームで、下のイベントや増築オプションを切り替えて、理想の暮らしを体感してみてください。',
          audioUrl: '/api/property-tours/demo-audio?room=great-room&mode=agent&lang=ja',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
      },
      perspectives: {
        N: {
          direction: 'N',
          label: 'North — Panoramic Ocean & Infinity Pool View',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-gr-n-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomNCoastal,
              isVirtuallyModified: true,
              promptSummary: 'Modern Coastal Luxury staging preserving exact glass sliders, oak planks, and Pacific horizon',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-n-event-party',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'cocktail_party',
              addition: 'none',
              imageUrl: greatRoomEventParty,
              isVirtuallyModified: true,
              promptSummary: 'Sunset Cocktail Party with guests mingling near open oceanfront glass sliders',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-n-event-family',
              style: 'modern_coastal',
              lighting: 'golden_hour',
              lifestyle: 'family_gathering',
              event: 'family_gathering',
              addition: 'none',
              imageUrl: greatRoomEventFamily,
              isVirtuallyModified: true,
              promptSummary: 'Warm Sunday multi-generational Family Gathering in sunlit Oceanfront Great Room',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-n-add-winebar',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'wine_cellar_bar',
              imageUrl: additionWineBar,
              isVirtuallyModified: true,
              promptSummary: 'Architectural Addition (+$48K): Floor-to-ceiling glass wine cellar & Taj Mahal quartzite wet bar',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-n-add-adu',
              style: 'modern_coastal',
              lighting: 'golden_hour',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'adu_casita',
              imageUrl: additionAduCasita,
              isVirtuallyModified: true,
              promptSummary: 'Architectural Addition (+$185K): Detached glass-wall Poolside Guest Casita / ADU Pavilion',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-n-add-pool',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'none',
              addition: 'infinity_pool',
              imageUrl: poolNTwilight,
              isVirtuallyModified: true,
              promptSummary: 'Architectural Addition (+$125K): Zero-edge Infinity Pool & sunken cedar firepit terrace',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-n-coastal-twilight',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'none',
              addition: 'none',
              imageUrl: poolNTwilight,
              isVirtuallyModified: true,
              promptSummary: 'Twilight entertaining view opening directly onto illuminated oceanfront terrace',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        E: {
          direction: 'E',
          label: 'East — Limestone Fireplace & Built-In Oak Shelving',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-gr-e-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomECoastal,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked East wall matching North white oak planks & exposed cedar beams',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-e-event-family',
              style: 'modern_coastal',
              lighting: 'golden_hour',
              lifestyle: 'family_gathering',
              event: 'family_gathering',
              addition: 'none',
              imageUrl: greatRoomEventFamily,
              isVirtuallyModified: true,
              promptSummary: 'Family Gathering around the lit limestone fireplace',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-e-add-winebar',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'wine_cellar_bar',
              imageUrl: additionWineBar,
              isVirtuallyModified: true,
              promptSummary: 'Glass Wine Cellar & Wet Bar Addition on East entertaining wall',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        S: {
          direction: 'S',
          label: 'South — Floating Staircase & Sculptural Foyer',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-gr-s-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomSCoastal,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked South foyer wall with matching custom white oak millwork',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-s-event-party',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'cocktail_party',
              addition: 'none',
              imageUrl: greatRoomEventParty,
              isVirtuallyModified: true,
              promptSummary: 'Evening cocktail party flow from foyer into great room',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        W: {
          direction: 'W',
          label: 'West — Open Dining & Chef Kitchen Sightline',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-gr-w-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomWCoastal,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked West sightline into dining room and quartzite kitchen island',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-gr-w-add-winebar',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'wine_cellar_bar',
              imageUrl: additionWineBar,
              isVirtuallyModified: true,
              promptSummary: 'Glass Wine Cellar & Brass Wet Bar flanking the dining room',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
      },
    },
    {
      id: 'room-kitchen-demo',
      name: "Chef's Kitchen Remodel",
      roomType: 'kitchen',
      orderIndex: 1,
      description: 'Compare the dated cherry/granite existing kitchen against a bespoke Taj Mahal quartzite & rift-cut oak remodel.',
      renovationEstimateUsd: 95000,
      anchorDirection: 'N',
      narrationAudioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=narration&lang=en',
      narrationScript:
        'Step into the kitchen and drag the Compare slider to see how a ninety-five thousand dollar architectural redesign transforms older cherry cabinets into bookmatched Taj Mahal quartzite and rift-cut white oak without moving a single structural wall.',
      narrationByLanguage: {
        en: {
          script:
            'Step into the kitchen and drag the Compare slider to see how a ninety-five thousand dollar architectural redesign transforms older cherry cabinets into bookmatched Taj Mahal quartzite and rift-cut white oak without moving a single structural wall.',
          audioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=narration&lang=en',
        },
        es: {
          script:
            'Entre a la cocina y deslice el comparador para ver cómo un rediseño arquitectónico transforma los gabinetes antiguos en una isla de cuarcita Taj Mahal y roble blanco a medida, sin mover una sola pared estructural.',
          audioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=narration&lang=es',
        },
        ja: {
          script:
            'キッチンへようこそ。比較スライダーを動かすと、構造壁を一切動かさずに、既存のキッチンをタージマハル・クォーツァイトのアイランドとホワイトオーク特注キャビネットへ刷新したビフォー・アフターをご確認いただけます。',
          audioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=narration&lang=ja',
        },
      },
      agentSyncByLanguage: {
        en: {
          script:
            'Here in the kitchen, buyers often struggle to picture the potential behind older cabinetry. With one click, you can compare the existing layout directly against a turn-key Chef Remodel or add a climate-controlled glass wine wall.',
          audioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=agent&lang=en',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
        es: {
          script:
            'En esta cocina, muchos compradores dudan al ver muebles antiguos. Con un solo clic, aquí pueden comparar el diseño actual con una remodelación de chef o añadir una cava de vinos iluminada.',
          audioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=agent&lang=es',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
        ja: {
          script:
            'キッチンでは既存の設備から改装後をイメージしにくいものですが、ワンクリックでシェフ仕様のリモデルやガラス張りワインセラー増築をリアルに比較できます。',
          audioUrl: '/api/property-tours/demo-audio?room=kitchen&mode=agent&lang=ja',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
      },
      perspectives: {
        N: {
          direction: 'N',
          label: 'North — Waterfall Quartzite Center Island',
          originalImageUrl: kitchenNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-n-remodel-day',
              style: 'chefs_remodel',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: kitchenNRemodel,
              isVirtuallyModified: true,
              promptSummary: "Chef's Remodel: bookmatched Taj Mahal quartzite island, rift-cut oak cabinetry, unlacquered brass",
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-k-n-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: kitchenNRemodel,
              isVirtuallyModified: true,
              promptSummary: 'Modern Coastal kitchen remodel preserving exact window and island geometry',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-k-n-add-winebar',
              style: 'chefs_remodel',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'wine_cellar_bar',
              imageUrl: additionWineBar,
              isVirtuallyModified: true,
              promptSummary: 'Kitchen Extension (+$48K): Illuminated floor-to-ceiling wine wall & brass wet bar',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-k-n-event-party',
              style: 'chefs_remodel',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'cocktail_party',
              addition: 'none',
              imageUrl: greatRoomEventParty,
              isVirtuallyModified: true,
              promptSummary: 'Evening Cocktail Party entertaining flow from kitchen island to terrace',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        E: {
          direction: 'E',
          label: 'East — Open Dining & Living Transition',
          originalImageUrl: kitchenNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-e-remodel-day',
              style: 'chefs_remodel',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomWCoastal,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked East kitchen-to-dining sightline',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        S: {
          direction: 'S',
          label: 'South — Hearth & Great Room View',
          originalImageUrl: kitchenNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-s-remodel-day',
              style: 'chefs_remodel',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomECoastal,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked South view toward limestone fireplace',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        W: {
          direction: 'W',
          label: 'West — Ocean Terrace Access',
          originalImageUrl: kitchenNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-w-remodel-day',
              style: 'chefs_remodel',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: greatRoomNCoastal,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked West view opening to ocean terrace',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
      },
    },
    {
      id: 'room-terrace-demo',
      name: 'Infinity Pool & Guest Casita Terrace',
      roomType: 'backyard_pool',
      orderIndex: 2,
      description: 'Zero-edge oceanfront pool deck with sunken cedar firepit lounge and optional detached Guest Casita / ADU.',
      renovationEstimateUsd: 125000,
      anchorDirection: 'N',
      narrationAudioUrl: '/api/property-tours/demo-audio?room=terrace&mode=narration&lang=en',
      narrationScript:
        'Out on the Infinity Pool Terrace, experience blue-hour twilight entertaining around the sunken cedar firepit, or toggle the Guest Casita addition to visualize a detached glass-walled poolside ADU overlooking the Pacific.',
      narrationByLanguage: {
        en: {
          script:
            'Out on the Infinity Pool Terrace, experience blue-hour twilight entertaining around the sunken cedar firepit, or toggle the Guest Casita addition to visualize a detached glass-walled poolside ADU overlooking the Pacific.',
          audioUrl: '/api/property-tours/demo-audio?room=terrace&mode=narration&lang=en',
        },
        es: {
          script:
            'En la terraza de la piscina infinita, disfrute del atardecer junto al fogón de cedro o active la adición de Casita de Invitados para visualizar un pabellón acristalado independiente frente al Pacífico.',
          audioUrl: '/api/property-tours/demo-audio?room=terrace&mode=narration&lang=es',
        },
        ja: {
          script:
            'インフィニティプール・テラスでは、トワイライトのファイヤーピットを囲む優雅なひとときや、太平洋を望む独立型ガラス張りゲストカシータ（ADU）増築プランをその場でプレビューできます。',
          audioUrl: '/api/property-tours/demo-audio?room=terrace&mode=narration&lang=ja',
        },
      },
      agentSyncByLanguage: {
        en: {
          script:
            'This oceanfront lot has over point-six-eight acres of usable coastal pad—giving you room not just for this zero-edge infinity pool, but for a detached glass Guest Casita or outdoor chef pavilion.',
          audioUrl: '/api/property-tours/demo-audio?room=terrace&mode=agent&lang=en',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
        es: {
          script:
            'Este terreno frente al mar ofrece espacio excepcional no solo para la piscina infinita, sino también para construir una casita independiente de cristal o un pabellón de cocina exterior.',
          audioUrl: '/api/property-tours/demo-audio?room=terrace&mode=agent&lang=es',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
        ja: {
          script:
            'ゆとりある海沿いの敷地には、インフィニティプールだけでなく独立したゲストカシータやアウトドアキッチンを増築できる十分なポテンシャルがあります。',
          audioUrl: '/api/property-tours/demo-audio?room=terrace&mode=agent&lang=ja',
          posterImageUrl: agentPresenterPoster,
          videoUrl: null,
        },
      },
      perspectives: {
        N: {
          direction: 'N',
          label: 'North — Infinity Edge, Firepit & Pacific Sunset',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-t-n-coastal-twilight',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'none',
              addition: 'none',
              imageUrl: poolNTwilight,
              isVirtuallyModified: true,
              promptSummary: 'Twilight infinity pool deck with glowing underwater lights, cedar firepit & pergola dining',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-t-n-add-adu',
              style: 'modern_coastal',
              lighting: 'golden_hour',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'adu_casita',
              imageUrl: additionAduCasita,
              isVirtuallyModified: true,
              promptSummary: 'Architectural Addition (+$185K): Detached Glass Guest Casita / ADU Pool Pavilion & Outdoor Kitchen',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-t-n-add-outdoor-kitchen',
              style: 'modern_coastal',
              lighting: 'golden_hour',
              lifestyle: 'entertaining',
              event: 'none',
              addition: 'outdoor_kitchen',
              imageUrl: additionAduCasita,
              isVirtuallyModified: true,
              promptSummary: 'Architectural Addition (+$68K): Cedar Pergola & Built-In Outdoor Chef Kitchen',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-t-n-event-party',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'cocktail_party',
              addition: 'none',
              imageUrl: greatRoomEventParty,
              isVirtuallyModified: true,
              promptSummary: 'Sunset Cocktail Party flowing seamlessly from Great Room to Infinity Terrace',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-t-n-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: poolNTwilight,
              isVirtuallyModified: true,
              promptSummary: 'Oceanfront infinity pool terrace & outdoor entertaining lounge',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        E: {
          direction: 'E',
          label: 'East — Detached Guest Casita / ADU Pad',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-t-e-coastal-day',
              style: 'modern_coastal',
              lighting: 'golden_hour',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: additionAduCasita,
              isVirtuallyModified: true,
              promptSummary: 'Poolside Guest Casita & Outdoor Lounge Pavilion',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        S: {
          direction: 'S',
          label: 'South — Chef Kitchen & Serving Bar',
          originalImageUrl: kitchenNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-t-s-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              event: 'none',
              addition: 'none',
              imageUrl: kitchenNRemodel,
              isVirtuallyModified: true,
              promptSummary: 'Direct sightline back to interior entertaining kitchen',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        W: {
          direction: 'W',
          label: 'West — Sunset Coastal Lounge',
          originalImageUrl: greatRoomNOriginal,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-t-w-coastal-twilight',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              event: 'none',
              addition: 'none',
              imageUrl: poolNTwilight,
              isVirtuallyModified: true,
              promptSummary: 'Sunset firepit & twilight horizon deck',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
      },
    },
  ]
}

/**
 * Full zero-DB, zero-login PropertyTourDTO used by `/property-tours` and `/tour/demo`.
 */
export function buildPublicDemoPropertyTourDTO(slug: string = 'demo'): PropertyTourDTO {
  const now = new Date().toISOString()
  const rooms = buildSampleDemoRooms()
  return {
    id: 'public-demo-malibu-742',
    userId: 'public-demo',
    producerProfileId: null,
    slug,
    title: '742 Oceanfront Terrace — Modern Coastal Estate',
    propertyAddress: '742 Oceanfront Terrace, Malibu, CA 90265',
    propertySpecs: {
      priceUsd: 8450000,
      beds: 5,
      baths: 6.5,
      sqft: 6240,
      lotSize: '0.68 Acres',
      yearBuilt: 2024,
      mlsNumber: '26-841920',
      propertyType: 'Oceanfront Architectural Estate',
    },
    status: 'published',
    hostingTier: 'standard',
    monthlyHostingCredits: EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
    publishedAt: now,
    hostingRenewedAt: now,
    branding: {
      agencyName: 'Pacific Crest Luxury Estates',
      logoUrl: null,
      primaryColor: '#06b6d4',
      agentName: 'Elena Vance',
      agentTitle: 'Senior Architectural Advisor · DRE #02148930',
      agentEmail: 'elena@pacificcrestestates.example',
      agentPhone: '(310) 555-0194',
      agentPhotoUrl: null,
      ctaLabel: 'Schedule Private Showing',
      ctaUrl: null,
      hideSceneFlowBranding: false,
      disclosureText: 'Virtually Staged · Concept Visualization (Toggle "As-Is" for Original)',
    },
    defaultRoomId: rooms[0].id,
    availableStyles: ['as_is', 'modern_coastal', 'chefs_remodel', 'japandi_zen', 'old_money_estate'],
    availableLighting: ['daylight', 'golden_hour', 'twilight'],
    availableLifestyles: ['architectural', 'quiet_morning', 'entertaining', 'family_gathering'],
    availableEvents: ['none', 'family_gathering', 'cocktail_party', 'private_dinner', 'holiday_celebration'],
    availableAdditions: ['none', 'wine_cellar_bar', 'outdoor_kitchen', 'infinity_pool', 'adu_casita'],
    availableLanguages: ['en', 'es', 'ja'],
    musicTracks: [
      {
        id: 'coastal_ambient',
        label: 'Coastal Acoustic',
        mood: 'Warm daytime architectural guitar & ocean breeze pad',
        audioUrl: '/media/property-tours/demo/music-coastal-ambient.wav',
      },
      {
        id: 'twilight_lounge',
        label: 'Twilight Lounge',
        mood: 'Deep sunset piano & warm Rhodes chords for evening entertaining',
        audioUrl: '/media/property-tours/demo/music-twilight-lounge.wav',
      },
    ],
    rooms,
    viewCount: 1428,
    leadCount: 27,
    totalGenerationCredits: 360,
    createdAt: now,
    updatedAt: now,
  }
}
