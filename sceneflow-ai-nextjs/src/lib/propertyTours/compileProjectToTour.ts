/**
 * SceneFlow Production -> Interactive Property Explorer Compiler
 *
 * Compiles any SceneFlow Project (Blueprint + Script + Scene Production Frames/Clips
 * + Multilingual Narration/Agent Audio + Music) into a standalone white-label
 * `PropertyTourDTO` ready for `/tour/[slug]` and `?embed=1`.
 */

import {
  COMPASS_DIRECTIONS,
  createEmptyPerspectives,
  type CompassDirection,
  type PropertyAdditionId,
  type PropertyBranding,
  type PropertyEventId,
  type PropertyLanguageCode,
  type PropertyLightingId,
  type PropertyMusicTrack,
  type PropertyRoom,
  type PropertyRoomType,
  type PropertySpecs,
  type PropertyStyleId,
  type PropertyTourDTO,
  type PropertyVariantAsset,
} from './types'
import {
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  slugifyPropertyTitle,
} from './hostingPolicy'

export interface CompileProjectToTourInput {
  projectId: string
  userId?: string
  title?: string
  script?: any
  metadata?: Record<string, any> | null
  sceneProductionState?: Record<string, any> | null
  streams?: any[] | null
  brandingOverrides?: Partial<PropertyBranding>
  specsOverrides?: Partial<PropertySpecs>
  propertyAddress?: string | null
  customSlug?: string | null
}

export interface CompileProjectToTourResult {
  tour: PropertyTourDTO
  stats: {
    totalRooms: number
    totalVisualPlates: number
    totalVideoClips: number
    totalNarrationTracks: number
    estimatedMinutes: number
    languagesDetected: PropertyLanguageCode[]
  }
}

const VALID_STYLES = new Set<PropertyStyleId>([
  'as_is',
  'modern_coastal',
  'warm_transitional',
  'chefs_remodel',
  'luxury_contemporary',
  'mediterranean_villa',
  'japandi_zen',
  'old_money_estate',
])

const VALID_EVENTS = new Set<PropertyEventId>([
  'none',
  'family_gathering',
  'cocktail_party',
  'private_dinner',
  'holiday_celebration',
])

const VALID_ADDITIONS = new Set<PropertyAdditionId>([
  'none',
  'wine_cellar_bar',
  'outdoor_kitchen',
  'infinity_pool',
  'glass_sunroom',
  'adu_casita',
])

function inferRoomType(name: string): PropertyRoomType {
  const lower = name.toLowerCase()
  if (/kitchen|pantry|culinary/.test(lower)) return 'kitchen'
  if (/pool|patio|terrace|yard|garden|deck|outdoor|courtyard|casita|adu/.test(lower)) {
    return 'backyard_pool'
  }
  if (/primary|master|suite/.test(lower)) return 'primary_suite'
  if (/bed|guest/.test(lower)) return 'bedroom'
  if (/bath|spa|sauna/.test(lower)) return 'bathroom'
  if (/dining/.test(lower)) return 'dining'
  if (/foyer|entry|lobby|arrival/.test(lower)) return 'foyer'
  if (/office|study|library/.test(lower)) return 'office'
  if (/exterior|facade|front|curb|aerial/.test(lower)) return 'exterior'
  if (/living|great room|lounge|salon|hearth/.test(lower)) return 'living'
  return 'other'
}

function inferLightingFromHeading(text: string): PropertyLightingId {
  const lower = text.toLowerCase()
  if (/twilight|night|evening|blue hour|cocktail|dusk/.test(lower)) return 'twilight'
  if (/golden|sunset|late afternoon|sunrise/.test(lower)) return 'golden_hour'
  return 'daylight'
}

function cleanRoomNameFromHeading(heading: string, fallbackIndex: number): string {
  const tagMatch = heading.match(/\[ROOM:\s*([^\]]+)\]/i)
  if (tagMatch?.[1]?.trim()) {
    return tagMatch[1].trim().slice(0, 80)
  }

  // Strip screenplay prefixes like "INT." / "EXT." and time-of-day suffixes like "- DAY"
  let cleaned = heading
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, '')
    .replace(/\s*[-–—]\s*(DAY|NIGHT|TWILIGHT|GOLDEN HOUR|SUNSET|MORNING|EVENING|CONTINUOUS|LATER)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.length < 2) {
    cleaned = `Space ${fallbackIndex + 1}`
  }

  // Convert ALL CAPS screenplay headings to Title Case
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
  }

  return cleaned.slice(0, 80)
}

function parseSceneTags(heading: string, description: string): {
  wall: CompassDirection | null
  style: PropertyStyleId
  event: PropertyEventId
  addition: PropertyAdditionId
  lighting: PropertyLightingId
} {
  const combined = `${heading}\n${description}`

  const wallMatch = combined.match(/\[WALL:\s*([NESW])\]/i)
  const wall = wallMatch ? (wallMatch[1].toUpperCase() as CompassDirection) : null

  const styleMatch = combined.match(/\[(?:REDESIGN|STYLE):\s*([a-z_]+)\]/i)
  let style: PropertyStyleId = 'modern_coastal'
  if (styleMatch && VALID_STYLES.has(styleMatch[1].toLowerCase() as PropertyStyleId)) {
    style = styleMatch[1].toLowerCase() as PropertyStyleId
  } else if (/\b(as[- ]?is|original|vacant|existing)\b/i.test(combined)) {
    style = 'as_is'
  } else if (/\b(remodel|chef'?s?\s+kitchen)\b/i.test(combined)) {
    style = 'chefs_remodel'
  } else if (/\bjapandi\b/i.test(combined)) {
    style = 'japandi_zen'
  } else if (/\b(european|old money|estate)\b/i.test(combined)) {
    style = 'old_money_estate'
  }

  const eventMatch = combined.match(/\[EVENT:\s*([a-z_]+)\]/i)
  let event: PropertyEventId = 'none'
  if (eventMatch && VALID_EVENTS.has(eventMatch[1].toLowerCase() as PropertyEventId)) {
    event = eventMatch[1].toLowerCase() as PropertyEventId
  } else if (/\b(cocktail|party|champagne|reception)\b/i.test(combined)) {
    event = 'cocktail_party'
  } else if (/\b(family gathering|sunday family|multi-generational)\b/i.test(combined)) {
    event = 'family_gathering'
  } else if (/\b(private chef|dinner party)\b/i.test(combined)) {
    event = 'private_dinner'
  } else if (/\b(holiday|christmas|thanksgiving|festive)\b/i.test(combined)) {
    event = 'holiday_celebration'
  }

  const addMatch = combined.match(/\[ADDITION:\s*([a-z_]+)\]/i)
  let addition: PropertyAdditionId = 'none'
  if (addMatch && VALID_ADDITIONS.has(addMatch[1].toLowerCase() as PropertyAdditionId)) {
    addition = addMatch[1].toLowerCase() as PropertyAdditionId
  } else if (/\b(wine cellar|wine wall|wet bar)\b/i.test(combined)) {
    addition = 'wine_cellar_bar'
  } else if (/\b(adu|guest casita|casita|cabana)\b/i.test(combined)) {
    addition = 'adu_casita'
  } else if (/\b(outdoor kitchen|pergola)\b/i.test(combined)) {
    addition = 'outdoor_kitchen'
  } else if (/\b(sunroom|conservatory|glass pavilion)\b/i.test(combined)) {
    addition = 'glass_sunroom'
  } else if (/\b(infinity pool|firepit|fire lounge)\b/i.test(combined) && /addition|add /i.test(combined)) {
    addition = 'infinity_pool'
  }

  return {
    wall,
    style,
    event,
    addition,
    lighting: inferLightingFromHeading(combined),
  }
}

function extractSceneMedia(
  scene: any,
  prodData: any
): {
  imageUrls: string[]
  videoUrls: string[]
  durationSec: number
} {
  const images: string[] = []
  const videos: string[] = []
  let durationSec = Number(scene?.duration || 0)

  const pushImg = (u: unknown) => {
    if (typeof u === 'string' && u.trim() && !images.includes(u.trim())) {
      images.push(u.trim())
    }
  }
  const pushVid = (u: unknown) => {
    if (typeof u === 'string' && u.trim() && !videos.includes(u.trim())) {
      videos.push(u.trim())
    }
  }

  pushImg(scene?.imageUrl)
  pushImg(scene?.keyframeUrl)
  pushImg(scene?.thumbnailUrl)
  pushVid(scene?.videoUrl)

  const segments: any[] = Array.isArray(prodData?.segments) ? prodData.segments : []
  let segDuration = 0
  for (const seg of segments) {
    segDuration += Number(seg?.endTime || 0) - Number(seg?.startTime || 0) || Number(seg?.duration || 5)
    pushImg(seg?.startFrameUrl)
    pushImg(seg?.endFrameUrl)
    pushImg(seg?.references?.startFrameUrl)
    pushImg(seg?.references?.endFrameUrl)

    if (seg?.activeAssetType === 'video' || (typeof seg?.activeAssetUrl === 'string' && /\.mp4|\.webm/i.test(seg.activeAssetUrl))) {
      pushVid(seg.activeAssetUrl)
    } else if (typeof seg?.activeAssetUrl === 'string') {
      pushImg(seg.activeAssetUrl)
    }

    if (Array.isArray(seg?.takes)) {
      for (const take of seg.takes) {
        if (take?.assetUrl && (take?.type === 'video' || /\.mp4|\.webm/i.test(take.assetUrl))) {
          pushVid(take.assetUrl)
        } else if (take?.thumbnailUrl) {
          pushImg(take.thumbnailUrl)
        }
      }
    }
  }

  if (Array.isArray(prodData?.renderedVideos)) {
    for (const rv of prodData.renderedVideos) {
      pushVid(rv?.mp4Url || rv?.url)
    }
  }
  pushVid(prodData?.renderedVideoUrl)

  if (segDuration > durationSec) {
    durationSec = segDuration
  }
  if (!durationSec) {
    durationSec = Math.max(20, segments.length * 6 || 30)
  }

  return { imageUrls: images, videoUrls: videos, durationSec }
}

function extractLocalizedAudioAndScripts(
  scene: any,
  sceneIndex: number,
  metadata: Record<string, any> | null | undefined,
  prodData: any
): {
  narrationByLanguage: PropertyRoom['narrationByLanguage']
  agentSyncByLanguage: PropertyRoom['agentSyncByLanguage']
  languages: PropertyLanguageCode[]
} {
  const narrationByLanguage: NonNullable<PropertyRoom['narrationByLanguage']> = {}
  const agentSyncByLanguage: NonNullable<PropertyRoom['agentSyncByLanguage']> = {}
  const detectedLangs = new Set<PropertyLanguageCode>()

  const baseNarration = String(scene?.narration || scene?.visualDescription || scene?.action || '').trim()
  const dialogueText = Array.isArray(scene?.dialogue)
    ? scene.dialogue
        .map((d: any) => String(d?.line || d?.text || '').trim())
        .filter(Boolean)
        .join(' ')
    : ''

  const translations =
    metadata?.visionPhase?.translations ||
    metadata?.translations ||
    {}

  const audioMap =
    scene?.narrationAudio ||
    prodData?.narrationAudio ||
    {}

  const agentPoster =
    metadata?.visionPhase?.characters?.[0]?.referenceImage ||
    metadata?.visionPhase?.characters?.[0]?.imageUrl ||
    '/images/property-tours/demo/agent-elena-presenter.jpg'

  for (const lang of ['en', 'es', 'ja'] as const) {
    const translatedScene =
      translations?.[lang]?.scenes?.[sceneIndex] ||
      translations?.[lang]?.[scene?.id] ||
      null

    const localizedNarration =
      String(translatedScene?.narration || (lang === 'en' ? baseNarration : '')).trim()
    const localizedDialogue =
      (Array.isArray(translatedScene?.dialogue)
        ? translatedScene.dialogue.map((d: any) => String(d?.line || d?.text || '').trim()).filter(Boolean).join(' ')
        : '') || (lang === 'en' ? dialogueText : '')

    const audioUrl =
      (typeof audioMap?.[lang] === 'string'
        ? audioMap[lang]
        : typeof audioMap?.[lang]?.url === 'string'
          ? audioMap[lang].url
          : lang === 'en' && typeof scene?.narrationAudioUrl === 'string'
            ? scene.narrationAudioUrl
            : null) || null

    if (localizedNarration || audioUrl) {
      detectedLangs.add(lang)
      narrationByLanguage[lang] = {
        script: localizedNarration || baseNarration || `Exploring ${scene?.heading || 'this space'}.`,
        audioUrl,
      }
    }

    const agentScript = localizedDialogue || localizedNarration
    if (agentScript || audioUrl) {
      detectedLangs.add(lang)
      agentSyncByLanguage[lang] = {
        script: agentScript || baseNarration || `Welcome to ${scene?.heading || 'this space'}.`,
        audioUrl,
        posterImageUrl: agentPoster,
        videoUrl: null,
      }
    }
  }

  if (detectedLangs.size === 0) {
    detectedLangs.add('en')
  }

  return {
    narrationByLanguage,
    agentSyncByLanguage,
    languages: Array.from(detectedLangs),
  }
}

export function compileSceneFlowProjectToPropertyTour(
  input: CompileProjectToTourInput
): CompileProjectToTourResult {
  const now = new Date().toISOString()
  const metadata = input.metadata || {}
  const visionPhase = metadata.visionPhase || {}
  const rawScenes: any[] =
    (Array.isArray(input.script?.script?.scenes) && input.script.script.scenes) ||
    (Array.isArray(input.script?.scenes) && input.script.scenes) ||
    (Array.isArray(visionPhase?.script?.script?.scenes) && visionPhase.script.script.scenes) ||
    (Array.isArray(visionPhase?.script?.scenes) && visionPhase.script.scenes) ||
    []

  const prodMap =
    input.sceneProductionState ||
    visionPhase?.production?.scenes ||
    metadata?.sceneProductionState ||
    {}

  const tourTitle =
    input.title?.trim() ||
    input.script?.title?.trim() ||
    metadata?.title?.trim() ||
    'Interactive Property Showcase'

  const slug =
    input.customSlug?.trim() ||
    slugifyPropertyTitle(tourTitle, (input.projectId || 'tour').slice(0, 6))

  const roomsByKey = new Map<string, PropertyRoom>()
  const stylesFound = new Set<PropertyStyleId>(['as_is'])
  const lightingFound = new Set<PropertyLightingId>(['daylight'])
  const eventsFound = new Set<PropertyEventId>(['none'])
  const additionsFound = new Set<PropertyAdditionId>(['none'])
  const allLanguages = new Set<PropertyLanguageCode>(['en'])
  const musicTracks: PropertyMusicTrack[] = []

  let totalVisualPlates = 0
  let totalVideoClips = 0
  let totalNarrationTracks = 0
  let totalSeconds = 0

  const addMusicIfPresent = (url: unknown, id: string, label: string, mood: string) => {
    if (
      typeof url === 'string' &&
      url.trim() &&
      !musicTracks.some((m) => m.audioUrl === url.trim())
    ) {
      musicTracks.push({ id, label, mood, audioUrl: url.trim() })
    }
  }

  addMusicIfPresent(metadata?.musicUrl, 'project_score', 'Production Score', 'Custom project soundtrack')

  rawScenes.forEach((scene, idx) => {
    const heading = String(scene?.heading || scene?.title || `Space ${idx + 1}`)
    const description = String(scene?.visualDescription || scene?.action || scene?.narration || '')
    const roomName = cleanRoomNameFromHeading(heading, idx)
    const roomKey = roomName.toLowerCase()
    const prodData = prodMap?.[scene?.id] || prodMap?.[String(idx)] || prodMap?.[`scene-${idx + 1}`] || null

    addMusicIfPresent(
      scene?.musicAudio || prodData?.musicAudioUrl,
      `scene-music-${idx}`,
      `${roomName} Score`,
      'Scene ambient soundtrack'
    )

    let room = roomsByKey.get(roomKey)
    if (!room) {
      room = {
        id: `room-${roomsByKey.size + 1}-${slugifyPropertyTitle(roomName).slice(0, 24)}`,
        name: roomName,
        roomType: inferRoomType(roomName),
        orderIndex: roomsByKey.size,
        description: description.slice(0, 240) || undefined,
        renovationEstimateUsd: null,
        anchorDirection: 'N',
        perspectives: createEmptyPerspectives(),
        narrationAudioUrl: null,
        narrationScript: null,
        narrationByLanguage: {},
        agentSyncByLanguage: {},
      }
      roomsByKey.set(roomKey, room)
    }

    const tags = parseSceneTags(heading, description)
    const media = extractSceneMedia(scene, prodData)
    totalSeconds += media.durationSec

    // Choose compass wall: explicit [WALL: N|E|S|W] tag or next available wall in this room
    let targetDir: CompassDirection = tags.wall || 'N'
    if (!tags.wall) {
      const existingCount = COMPASS_DIRECTIONS.filter(
        (d) => room!.perspectives[d].variants.length > 0 || room!.perspectives[d].originalImageUrl
      ).length
      targetDir = COMPASS_DIRECTIONS[existingCount % COMPASS_DIRECTIONS.length]
    }

    const persp = room.perspectives[targetDir]
    if (!persp.label || persp.label.startsWith('North View') || persp.label.endsWith('View')) {
      persp.label = `${targetDir} — ${heading.replace(/\[[^\]]+\]/g, '').trim().slice(0, 64)}`
    }

    const primaryImg = media.imageUrls[0] || null
    const primaryVid = media.videoUrls[0] || null

    if (tags.style === 'as_is' && primaryImg && !persp.originalImageUrl) {
      persp.originalImageUrl = primaryImg
    } else if (primaryImg && !persp.originalImageUrl) {
      persp.originalImageUrl = primaryImg
    }

    if (primaryVid && !persp.transitionToNextVideoUrl && media.videoUrls.length > 1) {
      persp.transitionToNextVideoUrl = media.videoUrls[1]
    }

    if (primaryImg || primaryVid) {
      stylesFound.add(tags.style)
      lightingFound.add(tags.lighting)
      eventsFound.add(tags.event)
      additionsFound.add(tags.addition)

      const variant: PropertyVariantAsset = {
        id: `var-proj-${idx}-${targetDir}-${tags.style}-${tags.event}-${tags.addition}`,
        style: tags.style,
        lighting: tags.lighting,
        lifestyle: tags.event !== 'none' ? 'entertaining' : 'architectural',
        event: tags.event,
        addition: tags.addition,
        imageUrl: primaryImg || '/images/property-tours/demo/great-room-n-coastal.jpg',
        motionVideoUrl: primaryVid,
        isVirtuallyModified: tags.style !== 'as_is' || tags.event !== 'none' || tags.addition !== 'none',
        promptSummary: heading.replace(/\[[^\]]+\]/g, '').trim().slice(0, 140),
        generatedAt: now,
      }
      persp.variants.push(variant)
      totalVisualPlates += 1
      if (primaryVid) totalVideoClips += 1
    }

    // Also distribute additional unique scene segment keyframes across remaining empty N/E/S/W walls
    media.imageUrls.slice(1, 4).forEach((extraImg, extraIdx) => {
      const altDir = COMPASS_DIRECTIONS[(COMPASS_DIRECTIONS.indexOf(targetDir) + extraIdx + 1) % 4]
      const altPersp = room!.perspectives[altDir]
      if (!altPersp.originalImageUrl) {
        altPersp.originalImageUrl = extraImg
      }
      if (altPersp.variants.length === 0) {
        const extraVid = media.videoUrls[extraIdx + 1] || null
        altPersp.variants.push({
          id: `var-proj-${idx}-${altDir}-extra-${extraIdx}`,
          style: tags.style,
          lighting: tags.lighting,
          lifestyle: 'architectural',
          event: 'none',
          addition: 'none',
          imageUrl: extraImg,
          motionVideoUrl: extraVid,
          isVirtuallyModified: tags.style !== 'as_is',
          promptSummary: `${roomName} (${altDir} perspective)`,
          generatedAt: now,
        })
        totalVisualPlates += 1
        if (extraVid) totalVideoClips += 1
      }
    })

    // Merge localized Narration & In-Scene Agent Sync tracks
    const localized = extractLocalizedAudioAndScripts(scene, idx, metadata, prodData)
    for (const lang of localized.languages) {
      allLanguages.add(lang)
      if (localized.narrationByLanguage?.[lang] && !room.narrationByLanguage?.[lang]) {
        room.narrationByLanguage = {
          ...(room.narrationByLanguage || {}),
          [lang]: localized.narrationByLanguage[lang],
        }
        totalNarrationTracks += 1
      }
      if (localized.agentSyncByLanguage?.[lang] && !room.agentSyncByLanguage?.[lang]) {
        room.agentSyncByLanguage = {
          ...(room.agentSyncByLanguage || {}),
          [lang]: {
            ...localized.agentSyncByLanguage[lang]!,
            videoUrl: primaryVid || localized.agentSyncByLanguage[lang]!.videoUrl || null,
          },
        }
      }
    }

    if (!room.narrationScript && room.narrationByLanguage?.en?.script) {
      room.narrationScript = room.narrationByLanguage.en.script
      room.narrationAudioUrl = room.narrationByLanguage.en.audioUrl || null
    }
  })

  // Ensure ambient music defaults exist if project had no standalone music file
  if (musicTracks.length === 0) {
    musicTracks.push(
      {
        id: 'coastal_ambient',
        label: 'Coastal Acoustic',
        mood: 'Warm daytime architectural guitar & pad',
        audioUrl: '/media/property-tours/demo/music-coastal-ambient.wav',
      },
      {
        id: 'twilight_lounge',
        label: 'Twilight Lounge',
        mood: 'Evening entertaining lounge score',
        audioUrl: '/media/property-tours/demo/music-twilight-lounge.wav',
      }
    )
  }

  const rooms = Array.from(roomsByKey.values())
  const firstCharacterName =
    visionPhase?.characters?.[0]?.name ||
    metadata?.filmTreatmentVariant?.character_descriptions?.[0]?.name ||
    null

  const tour: PropertyTourDTO = {
    id: `proj-tour-${input.projectId}`,
    userId: input.userId || 'sceneflow-producer',
    producerProfileId: null,
    slug,
    title: tourTitle,
    propertyAddress: input.propertyAddress ?? null,
    propertySpecs: {
      ...(input.specsOverrides || {}),
    },
    status: 'published',
    hostingTier: 'standard',
    monthlyHostingCredits: EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
    publishedAt: now,
    hostingRenewedAt: now,
    branding: {
      agencyName: 'SceneFlow Property Showcase',
      primaryColor: '#06b6d4',
      agentName: firstCharacterName || 'Listing Advisor',
      ctaLabel: 'Schedule Private Showing',
      hideSceneFlowBranding: false,
      disclosureText: 'Virtually Staged · Concept Visualization',
      ...(input.brandingOverrides || {}),
    },
    defaultRoomId: rooms[0]?.id ?? null,
    availableStyles: Array.from(stylesFound),
    availableLighting: Array.from(lightingFound),
    availableLifestyles: ['architectural', 'quiet_morning', 'entertaining', 'family_gathering'],
    availableEvents: Array.from(eventsFound),
    availableAdditions: Array.from(additionsFound),
    availableLanguages: Array.from(allLanguages),
    musicTracks,
    rooms,
    viewCount: 0,
    leadCount: 0,
    totalGenerationCredits: 0,
    createdAt: now,
    updatedAt: now,
  }

  return {
    tour,
    stats: {
      totalRooms: rooms.length,
      totalVisualPlates,
      totalVideoClips,
      totalNarrationTracks,
      estimatedMinutes: Math.max(1, Math.round(totalSeconds / 60)),
      languagesDetected: Array.from(allLanguages),
    },
  }
}
