/**
 * Interactive Property Explorer — Core Data Schema & Types
 *
 * Architecture:
 * - PropertyTour = Standalone white-label listing container (hosted at /tour/[slug] & embeddable via iframe)
 * - PropertyRoom = Physical space (Exterior, Kitchen, Great Room, Primary Suite, Pool Terrace, etc.)
 * - PropertyPerspective = 4 cardinal camera perspectives (N, E, S, W) anchored to agent smartphone photos
 * - PropertyVariantAsset = Cross-angle locked AI plates (Design Style × Lighting × Lifestyle) + optional motion loop
 */

export type CompassDirection = 'N' | 'E' | 'S' | 'W'
export const COMPASS_DIRECTIONS: readonly CompassDirection[] = ['N', 'E', 'S', 'W'] as const

export type PropertyTourStatus = 'draft' | 'published' | 'paused' | 'archived'
export type PropertyHostingTier = 'standard' | 'cinema' | 'enterprise'

export type PropertyRoomType =
  | 'exterior'
  | 'foyer'
  | 'living'
  | 'kitchen'
  | 'dining'
  | 'primary_suite'
  | 'bedroom'
  | 'bathroom'
  | 'backyard_pool'
  | 'office'
  | 'other'

export type PropertyStyleId =
  | 'as_is'
  | 'modern_coastal'
  | 'warm_transitional'
  | 'chefs_remodel'
  | 'luxury_contemporary'
  | 'mediterranean_villa'

export type PropertyLightingId = 'daylight' | 'golden_hour' | 'twilight'

export type PropertyLifestyleId =
  | 'architectural'
  | 'quiet_morning'
  | 'entertaining'
  | 'family_gathering'

export interface PropertySpecs {
  priceUsd?: number | null
  beds?: number | null
  baths?: number | null
  sqft?: number | null
  lotSize?: string | null
  yearBuilt?: number | null
  propertyType?: string | null
  mlsNumber?: string | null
}

export interface PropertyBranding {
  agencyName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  hideSceneFlowBranding?: boolean
  agentName?: string | null
  agentTitle?: string | null
  agentPhone?: string | null
  agentEmail?: string | null
  agentPhotoUrl?: string | null
  ctaLabel?: string | null
  ctaUrl?: string | null
  disclosureText?: string | null
}

export interface PropertyVariantAsset {
  id: string
  style: PropertyStyleId
  lighting: PropertyLightingId
  lifestyle: PropertyLifestyleId
  imageUrl: string
  motionVideoUrl?: string | null
  isVirtuallyModified: boolean
  promptSummary?: string
  generatedAt: string
  creditsUsed?: number
}

export interface PropertyPerspective {
  direction: CompassDirection
  label?: string
  originalImageUrl: string | null
  variants: PropertyVariantAsset[]
  /** Optional pre-rendered 4s FTV camera pan to clockwise neighbor (N->E, E->S, S->W, W->N) */
  transitionToNextVideoUrl?: string | null
}

export interface PropertyRoom {
  id: string
  name: string
  roomType: PropertyRoomType
  orderIndex: number
  description?: string
  renovationEstimateUsd?: number | null
  anchorDirection: CompassDirection
  perspectives: Record<CompassDirection, PropertyPerspective>
  narrationAudioUrl?: string | null
  narrationScript?: string | null
}

export interface PropertyTourDTO {
  id: string
  userId: string
  producerProfileId: string | null
  slug: string
  title: string
  propertyAddress: string | null
  propertySpecs: PropertySpecs
  status: PropertyTourStatus
  hostingTier: PropertyHostingTier
  monthlyHostingCredits: number
  publishedAt: string | null
  hostingRenewedAt: string | null
  branding: PropertyBranding
  defaultRoomId: string | null
  availableStyles: PropertyStyleId[]
  availableLighting: PropertyLightingId[]
  availableLifestyles: PropertyLifestyleId[]
  rooms: PropertyRoom[]
  viewCount: number
  leadCount: number
  totalGenerationCredits: number
  createdAt: string
  updatedAt: string
}

export interface PropertyOptionPreset<T extends string> {
  id: T
  label: string
  shortLabel: string
  promptGuidance: string
}

export const PROPERTY_STYLE_PRESETS: readonly PropertyOptionPreset<PropertyStyleId>[] = [
  {
    id: 'as_is',
    label: 'Original (As-Is)',
    shortLabel: 'Original',
    promptGuidance: 'Preserve original architecture and finishes exactly; subtle clean photographic lighting only.',
  },
  {
    id: 'modern_coastal',
    label: 'Modern Coastal',
    shortLabel: 'Coastal',
    promptGuidance: 'Modern coastal luxury interior: light wide-plank white oak flooring, warm alabaster walls, honed Calacatta marble counters, brushed brass fixtures, organic linen upholstery, airy minimalist styling.',
  },
  {
    id: 'warm_transitional',
    label: 'Warm Transitional',
    shortLabel: 'Transitional',
    promptGuidance: 'Warm transitional architectural redesign: rich walnut millwork, limewash plaster walls, honed limestone accents, sculptural bronze pendant lighting, tailored neutral furniture.',
  },
  {
    id: 'chefs_remodel',
    label: "Chef's Remodel",
    shortLabel: 'Remodel',
    promptGuidance: 'Full high-end architectural remodel: waterfall quartzite island, custom inset rift-sawn oak cabinetry, integrated panel-ready appliances, statement architectural lighting, bespoke millwork.',
  },
  {
    id: 'luxury_contemporary',
    label: 'Luxury Contemporary',
    shortLabel: 'Contemporary',
    promptGuidance: 'Ultra-clean architectural contemporary luxury: large-format matte travertine stone, floor-to-ceiling black steel glazing, recessed linear architectural lighting, gallery-grade furniture.',
  },
  {
    id: 'mediterranean_villa',
    label: 'Mediterranean Villa',
    shortLabel: 'Villa',
    promptGuidance: 'Refined Mediterranean estate aesthetic: hand-troweled warm stucco, aged oak ceiling beams, terracotta and honed travertine textures, arched accents, olive tree accents.',
  },
] as const

export const PROPERTY_LIGHTING_PRESETS: readonly PropertyOptionPreset<PropertyLightingId>[] = [
  {
    id: 'daylight',
    label: 'Bright Daylight',
    shortLabel: 'Daylight',
    promptGuidance: 'Crisp natural mid-morning sunlight streaming through windows, clean airy color balance, soft realistic architectural shadows.',
  },
  {
    id: 'golden_hour',
    label: 'Golden Hour',
    shortLabel: 'Golden Hour',
    promptGuidance: 'Warm late-afternoon golden-hour sun casting rich amber light beams across floors and walls, soft inviting luxury glow.',
  },
  {
    id: 'twilight',
    label: 'Blue-Hour Twilight',
    shortLabel: 'Twilight',
    promptGuidance: 'Dramatic blue-hour twilight sky outside with warm 2700K architectural interior lighting, glowing sconces, illuminated landscape and pool water.',
  },
] as const

export const PROPERTY_LIFESTYLE_PRESETS: readonly PropertyOptionPreset<PropertyLifestyleId>[] = [
  {
    id: 'architectural',
    label: 'Architectural Clean',
    shortLabel: 'Architectural',
    promptGuidance: 'Magazine-grade architectural photography with no people; staged furniture, fresh botanicals, spotless surfaces.',
  },
  {
    id: 'quiet_morning',
    label: 'Quiet Morning',
    shortLabel: 'Morning',
    promptGuidance: 'Lived-in luxury morning ambiance: artisan coffee service on counter, open architectural book, sunlit linens, peaceful serene atmosphere.',
  },
  {
    id: 'entertaining',
    label: 'Evening Entertaining',
    shortLabel: 'Entertaining',
    promptGuidance: 'Upscale twilight entertaining ambiance: softly lit dinner table or outdoor lounge with warm candlelight, glassware, glowing fire feature, inviting celebration mood.',
  },
  {
    id: 'family_gathering',
    label: 'Family Living',
    shortLabel: 'Family',
    promptGuidance: 'Warm welcoming multi-generational home atmosphere: cozy throws, set dining table, warm illuminated living spaces evoking effortless everyday comfort.',
  },
] as const

export const PROPERTY_ROOM_TYPE_LABELS: Record<PropertyRoomType, string> = {
  exterior: 'Exterior & Curb Appeal',
  foyer: 'Entry & Foyer',
  living: 'Great Room / Living',
  kitchen: 'Kitchen',
  dining: 'Dining Room',
  primary_suite: 'Primary Suite',
  bedroom: 'Bedroom',
  bathroom: 'Primary Bath / Spa',
  backyard_pool: 'Backyard & Pool Terrace',
  office: 'Home Office / Studio',
  other: 'Additional Space',
}

export function createEmptyPerspectives(): Record<CompassDirection, PropertyPerspective> {
  return {
    N: { direction: 'N', label: 'North View (Anchor)', originalImageUrl: null, variants: [], transitionToNextVideoUrl: null },
    E: { direction: 'E', label: 'East View', originalImageUrl: null, variants: [], transitionToNextVideoUrl: null },
    S: { direction: 'S', label: 'South View', originalImageUrl: null, variants: [], transitionToNextVideoUrl: null },
    W: { direction: 'W', label: 'West View', originalImageUrl: null, variants: [], transitionToNextVideoUrl: null },
  }
}

export function createDefaultRoom(args: {
  id: string
  name: string
  roomType: PropertyRoomType
  orderIndex: number
  description?: string
  renovationEstimateUsd?: number | null
}): PropertyRoom {
  return {
    id: args.id,
    name: args.name,
    roomType: args.roomType,
    orderIndex: args.orderIndex,
    description: args.description,
    renovationEstimateUsd: args.renovationEstimateUsd ?? null,
    anchorDirection: 'N',
    perspectives: createEmptyPerspectives(),
    narrationAudioUrl: null,
    narrationScript: null,
  }
}

export function getNextClockwiseDirection(dir: CompassDirection): CompassDirection {
  const idx = COMPASS_DIRECTIONS.indexOf(dir)
  return COMPASS_DIRECTIONS[(idx + 1) % COMPASS_DIRECTIONS.length]
}

export function getPrevClockwiseDirection(dir: CompassDirection): CompassDirection {
  const idx = COMPASS_DIRECTIONS.indexOf(dir)
  return COMPASS_DIRECTIONS[(idx - 1 + COMPASS_DIRECTIONS.length) % COMPASS_DIRECTIONS.length]
}

/**
 * Resolve the best matching asset URL for a room perspective given active toggles.
 */
export function resolvePerspectiveAsset(
  perspective: PropertyPerspective | undefined,
  selection: {
    style: PropertyStyleId
    lighting: PropertyLightingId
    lifestyle: PropertyLifestyleId
    showOriginal?: boolean
  }
): {
  imageUrl: string | null
  motionVideoUrl: string | null
  variant: PropertyVariantAsset | null
  isOriginal: boolean
  isVirtuallyModified: boolean
} {
  if (!perspective) {
    return {
      imageUrl: null,
      motionVideoUrl: null,
      variant: null,
      isOriginal: true,
      isVirtuallyModified: false,
    }
  }

  if (selection.showOriginal || selection.style === 'as_is') {
    const exactAsIs = perspective.variants.find(
      (v) =>
        v.style === 'as_is' &&
        v.lighting === selection.lighting &&
        v.lifestyle === selection.lifestyle
    )
    if (!selection.showOriginal && exactAsIs) {
      return {
        imageUrl: exactAsIs.imageUrl,
        motionVideoUrl: exactAsIs.motionVideoUrl ?? null,
        variant: exactAsIs,
        isOriginal: false,
        isVirtuallyModified: exactAsIs.isVirtuallyModified,
      }
    }
    if (perspective.originalImageUrl) {
      return {
        imageUrl: perspective.originalImageUrl,
        motionVideoUrl: null,
        variant: null,
        isOriginal: true,
        isVirtuallyModified: false,
      }
    }
  }

  // 1. Exact match on Style + Lighting + Lifestyle
  const exact = perspective.variants.find(
    (v) =>
      v.style === selection.style &&
      v.lighting === selection.lighting &&
      v.lifestyle === selection.lifestyle
  )
  if (exact) {
    return {
      imageUrl: exact.imageUrl,
      motionVideoUrl: exact.motionVideoUrl ?? null,
      variant: exact,
      isOriginal: false,
      isVirtuallyModified: exact.isVirtuallyModified,
    }
  }

  // 2. Match Style + Lighting (any lifestyle)
  const styleLighting = perspective.variants.find(
    (v) => v.style === selection.style && v.lighting === selection.lighting
  )
  if (styleLighting) {
    return {
      imageUrl: styleLighting.imageUrl,
      motionVideoUrl: styleLighting.motionVideoUrl ?? null,
      variant: styleLighting,
      isOriginal: false,
      isVirtuallyModified: styleLighting.isVirtuallyModified,
    }
  }

  // 3. Match Style only
  const styleOnly = perspective.variants.find((v) => v.style === selection.style)
  if (styleOnly) {
    return {
      imageUrl: styleOnly.imageUrl,
      motionVideoUrl: styleOnly.motionVideoUrl ?? null,
      variant: styleOnly,
      isOriginal: false,
      isVirtuallyModified: styleOnly.isVirtuallyModified,
    }
  }

  // 4. Fallback to first generated variant or original photo
  if (perspective.variants[0]) {
    const first = perspective.variants[0]
    return {
      imageUrl: first.imageUrl,
      motionVideoUrl: first.motionVideoUrl ?? null,
      variant: first,
      isOriginal: false,
      isVirtuallyModified: first.isVirtuallyModified,
    }
  }

  return {
    imageUrl: perspective.originalImageUrl,
    motionVideoUrl: null,
    variant: null,
    isOriginal: true,
    isVirtuallyModified: false,
  }
}
