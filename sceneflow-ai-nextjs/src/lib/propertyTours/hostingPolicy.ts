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
  PROPERTY_LIFESTYLE_PRESETS,
  PROPERTY_LIGHTING_PRESETS,
  PROPERTY_STYLE_PRESETS,
  type CompassDirection,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyRoom,
  type PropertyStyleId,
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

  const compassNames: Record<CompassDirection, string> = {
    N: 'North wall (primary hero perspective)',
    E: 'East wall (90° clockwise from North)',
    S: 'South wall (180° opposite North)',
    W: 'West wall (90° counter-clockwise from North)',
  }

  const lines: string[] = [
    `Architectural luxury real estate photograph of the ${args.room.name} (${compassNames[args.direction]}).`,
    `DESIGN STYLE (${stylePreset.label}): ${stylePreset.promptGuidance}`,
    `LIGHTING (${lightingPreset.label}): ${lightingPreset.promptGuidance}`,
    `LIFESTYLE STAGING (${lifestylePreset.label}): ${lifestylePreset.promptGuidance}`,
  ]

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

/**
 * Creates a rich, immediately playable Interactive Demo Property Tour using
 * SceneFlow's existing hosted architectural/showcase visuals so users can test
 * N/E/S/W compass navigation, Before/After slider, and Style/Lighting toggles in 1 click.
 */
export function buildSampleDemoRooms(): PropertyRoom[] {
  const now = new Date().toISOString()
  // Reuse verified public images already bundled in SceneFlow so the demo works 100% offline/out-of-box
  const coastalBase = '/images/use-cases/real-estate-luxury.webp'
  const fallbackHero = '/landing/key-features/screenshots/new-series.png'

  return [
    {
      id: 'room-kitchen-demo',
      name: "Oceanfront Chef's Kitchen",
      roomType: 'kitchen',
      orderIndex: 0,
      description: 'Open-concept coastal kitchen with 12-foot island and panoramic glass sliders.',
      renovationEstimateUsd: 85000,
      anchorDirection: 'N',
      narrationAudioUrl: null,
      narrationScript: 'Welcome to the oceanfront kitchen — toggle between As-Is, Modern Coastal, and Twilight Entertaining across all four walls.',
      perspectives: {
        N: {
          direction: 'N',
          label: 'North — Main Island & Ocean Sliders',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-n-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              imageUrl: coastalBase,
              isVirtuallyModified: true,
              promptSummary: 'Modern Coastal daylight remodel with Calacatta waterfall island',
              generatedAt: now,
              creditsUsed: 30,
            },
            {
              id: 'var-k-n-remodel-twilight',
              style: 'chefs_remodel',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              imageUrl: coastalBase,
              isVirtuallyModified: true,
              promptSummary: "Chef's Remodel at twilight staged for evening entertaining",
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        E: {
          direction: 'E',
          label: 'East — Wine Wall & Breakfast Nook',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-e-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              imageUrl: coastalBase,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked East wall matching North oak & marble palette',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        S: {
          direction: 'S',
          label: 'South — Great Room Sightline',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-s-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              imageUrl: coastalBase,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked South sightline into living room',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        W: {
          direction: 'W',
          label: 'West — Butler Pantry & Espresso Bar',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-k-w-coastal-day',
              style: 'modern_coastal',
              lighting: 'daylight',
              lifestyle: 'architectural',
              imageUrl: coastalBase,
              isVirtuallyModified: true,
              promptSummary: 'Cross-angle locked West wall custom cabinetry',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
      },
    },
    {
      id: 'room-terrace-demo',
      name: 'Infinity Pool & Twilight Terrace',
      roomType: 'backyard_pool',
      orderIndex: 1,
      description: 'Zero-edge pool deck with sunken fire lounge and outdoor kitchen.',
      renovationEstimateUsd: 120000,
      anchorDirection: 'N',
      narrationAudioUrl: null,
      narrationScript: 'Step onto the infinity terrace and preview golden-hour lounging or twilight entertaining.',
      perspectives: {
        N: {
          direction: 'N',
          label: 'North — Infinity Edge & Horizon',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [
            {
              id: 'var-t-n-coastal-twilight',
              style: 'modern_coastal',
              lighting: 'twilight',
              lifestyle: 'entertaining',
              imageUrl: coastalBase,
              isVirtuallyModified: true,
              promptSummary: 'Twilight infinity pool deck with glowing underwater lights & fire lounge',
              generatedAt: now,
              creditsUsed: 30,
            },
          ],
        },
        E: {
          direction: 'E',
          label: 'East — Outdoor Dining Pergola',
          originalImageUrl: fallbackHero,
          transitionToNextVideoUrl: null,
          variants: [],
        },
        S: {
          direction: 'S',
          label: 'South — Glass Facade View Back to Villa',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [],
        },
        W: {
          direction: 'W',
          label: 'West — Sunset Firepit Lounge',
          originalImageUrl: coastalBase,
          transitionToNextVideoUrl: null,
          variants: [],
        },
      },
    },
  ]
}
