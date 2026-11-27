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
  | 'japandi_zen'
  | 'old_money_estate'

export type PropertyLightingId = 'daylight' | 'golden_hour' | 'twilight'

export type PropertyLifestyleId =
  | 'architectural'
  | 'quiet_morning'
  | 'entertaining'
  | 'family_gathering'

export type PropertyEventId =
  | 'none'
  | 'family_gathering'
  | 'cocktail_party'
  | 'private_dinner'
  | 'holiday_celebration'

export type PropertyAdditionId =
  | 'none'
  | 'wine_cellar_bar'
  | 'outdoor_kitchen'
  | 'infinity_pool'
  | 'glass_sunroom'
  | 'adu_casita'

export type PropertyLanguageCode = 'en' | 'es' | 'ja'
export type PropertyGuideMode = 'off' | 'narration' | 'agent_sync'

export interface PropertyRoomLocalizedTrack {
  script: string
  audioUrl?: string | null
  videoUrl?: string | null
  posterImageUrl?: string | null
}

export interface PropertyMusicTrack {
  id: string
  label: string
  mood: string
  audioUrl: string | null
}

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
  event?: PropertyEventId
  addition?: PropertyAdditionId
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
  /** Localized voiceover narration (English, Spanish, Japanese) */
  narrationByLanguage?: Partial<Record<PropertyLanguageCode, PropertyRoomLocalizedTrack>>
  /** Localized in-scene agent lip-sync presenter tracks (video + fallback poster + audio) */
  agentSyncByLanguage?: Partial<Record<PropertyLanguageCode, PropertyRoomLocalizedTrack>>
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
  availableEvents?: PropertyEventId[]
  availableAdditions?: PropertyAdditionId[]
  availableLanguages?: PropertyLanguageCode[]
  musicTracks?: PropertyMusicTrack[]
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
  {
    id: 'japandi_zen',
    label: 'Organic Japandi',
    shortLabel: 'Japandi',
    promptGuidance: 'Serene Japandi architectural redesign: pale slatted ash wood joinery, low-profile sculptural oak furniture, textured lime plaster, shoji-inspired soft diffused light, quiet minimalist harmony.',
  },
  {
    id: 'old_money_estate',
    label: 'European Estate',
    shortLabel: 'European',
    promptGuidance: 'Timeless European estate redesign: herringbone white oak floors, refined wall paneling, Calacatta Viola marble hearth, antique brass chandeliers, heirloom linen and velvet seating.',
  },
] as const

export const PROPERTY_EVENT_PRESETS: readonly PropertyOptionPreset<PropertyEventId>[] = [
  {
    id: 'none',
    label: 'No Event',
    shortLabel: 'Quiet Space',
    promptGuidance: 'Empty of people; pure architectural staging without event activity.',
  },
  {
    id: 'family_gathering',
    label: 'Family Gathering',
    shortLabel: 'Family Gathering',
    promptGuidance: 'Warm Sunday multi-generational family gathering relaxing naturally across the seating and hearth, golden sunlight, joyful authentic everyday home life.',
  },
  {
    id: 'cocktail_party',
    label: 'Sunset Cocktail Party',
    shortLabel: 'Cocktail Party',
    promptGuidance: 'Upscale twilight cocktail party with stylishly dressed guests mingling with champagne flutes, warm candlelit surfaces, glowing recessed and patio lights, effortless luxury hosting.',
  },
  {
    id: 'private_dinner',
    label: 'Private Chef Dinner',
    shortLabel: 'Chef Dinner',
    promptGuidance: 'Intimate private chef dinner party around a beautifully set long table with tapered candles, crystal stemware, floral runner, and guests enjoying evening conversation.',
  },
  {
    id: 'holiday_celebration',
    label: 'Holiday Celebration',
    shortLabel: 'Holiday Party',
    promptGuidance: 'Elegant tastefully decorated holiday celebration with warm white garlands, glowing fireplace, champagne toast, and festive architectural warmth.',
  },
] as const

export interface PropertyAdditionPreset extends PropertyOptionPreset<PropertyAdditionId> {
  estimatedCostUsd?: number
  estimatedCostRange?: string
}

export const PROPERTY_ADDITION_PRESETS: readonly PropertyAdditionPreset[] = [
  {
    id: 'none',
    label: 'Existing Footprint',
    shortLabel: 'Existing',
    promptGuidance: 'No structural additions; preserve existing room footprint and boundaries.',
  },
  {
    id: 'wine_cellar_bar',
    label: '+ Glass Wine Wall & Bar',
    shortLabel: '+ Wine Bar (Est. $40K–$60K)',
    estimatedCostUsd: 48000,
    estimatedCostRange: 'Est. $40K–$60K',
    promptGuidance: 'Architectural addition: floor-to-ceiling frameless glass climate-controlled wine cellar wall with backlit oak racking alongside a stone wet bar and unlacquered brass fixtures.',
  },
  {
    id: 'outdoor_kitchen',
    label: '+ Pergola & Outdoor Kitchen',
    shortLabel: '+ Outdoor Kitchen (Est. $55K–$85K)',
    estimatedCostUsd: 68000,
    estimatedCostRange: 'Est. $55K–$85K',
    promptGuidance: 'Architectural addition: custom cedar slatted pergola shading a built-in stainless grill island, quartzite bar seating, pizza oven, and warm string lighting.',
  },
  {
    id: 'glass_sunroom',
    label: '+ Glass Sunroom Pavilion',
    shortLabel: '+ Glass Sunroom (Est. $80K–$120K)',
    estimatedCostUsd: 95000,
    estimatedCostRange: 'Est. $80K–$120K',
    promptGuidance: 'Architectural addition: steel-and-glass conservatory sunroom extension with skylights and retractable pocket doors blending interior living into the garden.',
  },
  {
    id: 'infinity_pool',
    label: '+ Infinity Pool & Fire Lounge',
    shortLabel: '+ Pool & Firepit (Est. $110K–$150K)',
    estimatedCostUsd: 125000,
    estimatedCostRange: 'Est. $110K–$150K',
    promptGuidance: 'Architectural addition: zero-edge infinity pool and integrated spa with glowing underwater lighting, travertine coping, and sunken cedar firepit lounge.',
  },
  {
    id: 'adu_casita',
    label: '+ Detached Guest Casita / ADU',
    shortLabel: '+ Guest Casita (Est. $165K–$220K)',
    estimatedCostUsd: 185000,
    estimatedCostRange: 'Est. $165K–$220K',
    promptGuidance: 'Architectural addition: sleek detached modern coastal Guest Casita / ADU pavilion with cedar soffits, retractable black-framed glass walls, and private lounge terrace.',
  },
] as const

export const PROPERTY_LANGUAGE_PRESETS: readonly {
  code: PropertyLanguageCode
  label: string
  nativeLabel: string
  speechLang: string
  edgeVoice: string
}[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLang: 'en-US',
    edgeVoice: 'en-US-AriaNeural',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    speechLang: 'es-ES',
    edgeVoice: 'es-ES-ElviraNeural',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nativeLabel: '日本語',
    speechLang: 'ja-JP',
    edgeVoice: 'ja-JP-NanamiNeural',
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
    event?: PropertyEventId
    addition?: PropertyAdditionId
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

  const wantedEvent: PropertyEventId = selection.event ?? 'none'
  const wantedAddition: PropertyAdditionId = selection.addition ?? 'none'

  if (selection.showOriginal) {
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

  // 0a. If user actively toggled a specific Architectural Addition, prioritize exact addition variant
  if (wantedAddition !== 'none') {
    const exactAddition = perspective.variants.find(
      (v) => (v.addition ?? 'none') === wantedAddition
    )
    if (exactAddition) {
      return {
        imageUrl: exactAddition.imageUrl,
        motionVideoUrl: exactAddition.motionVideoUrl ?? null,
        variant: exactAddition,
        isOriginal: false,
        isVirtuallyModified: exactAddition.isVirtuallyModified,
      }
    }
  }

  // 0b. If user actively toggled an Event (Family Gathering, Cocktail Party, etc.), prioritize exact event variant
  if (wantedEvent !== 'none') {
    const exactEvent = perspective.variants.find(
      (v) => (v.event ?? 'none') === wantedEvent
    )
    if (exactEvent) {
      return {
        imageUrl: exactEvent.imageUrl,
        motionVideoUrl: exactEvent.motionVideoUrl ?? null,
        variant: exactEvent,
        isOriginal: false,
        isVirtuallyModified: exactEvent.isVirtuallyModified,
      }
    }
  }

  if (selection.style === 'as_is' && wantedAddition === 'none' && wantedEvent === 'none') {
    const exactAsIs = perspective.variants.find(
      (v) =>
        v.style === 'as_is' &&
        v.lighting === selection.lighting &&
        v.lifestyle === selection.lifestyle &&
        (v.event ?? 'none') === 'none' &&
        (v.addition ?? 'none') === 'none'
    )
    if (exactAsIs) {
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

  // Prefer base (non-event, non-addition) variants when user selected no event & no addition
  const baseVariants = perspective.variants.filter(
    (v) => (v.event ?? 'none') === 'none' && (v.addition ?? 'none') === 'none'
  )
  const pool = baseVariants.length > 0 ? baseVariants : perspective.variants

  // 1. Exact match on Style + Lighting + Lifestyle
  const exact = pool.find(
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
  const styleLighting = pool.find(
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
  const styleOnly = pool.find((v) => v.style === selection.style)
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
  if (pool[0]) {
    const first = pool[0]
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
