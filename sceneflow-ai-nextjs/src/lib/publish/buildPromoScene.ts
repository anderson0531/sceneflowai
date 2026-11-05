/**
 * Build / upsert a cinematic promo scene from a trailer beat plan.
 */

import { getSceneBeats, mintBeatId } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type {
  PromoCampaignPresetId,
  PromoFrameAspect,
  PromoTrailerBeatPlan,
} from '@/types/publishingAssets'
import type { SceneSegment, SceneProductionData } from '@/components/vision/scene-production/types'

export const PROMO_SCENE_CINEMATIC_TYPE = 'promo' as const
export const PROMO_SCENE_HEADING = 'PROMO TRAILER'

export interface PromoCampaignPresetDefinition {
  id: PromoCampaignPresetId
  name: string
  badge: string
  description: string
  defaultDurationSec: number
  defaultAspect: PromoFrameAspect
  defaultAudienceHint: string
  directorStrategyPrompt: string
  recommendedLanguages?: string[]
}

export const PROMO_CAMPAIGN_PRESETS: PromoCampaignPresetDefinition[] = [
  {
    id: 'theatrical_trailer',
    name: 'Theatrical Main Trailer',
    badge: '16:9 · Main Arc',
    description:
      'Classic 4-act trailer structure: world hook, rising stakes, emotional & dramatic peak, and title card button.',
    defaultDurationSec: 60,
    defaultAspect: '16:9',
    defaultAudienceHint:
      'Broad theatrical and streaming audiences looking for a compelling story hook, clear stakes, and cinematic scale.',
    directorStrategyPrompt:
      'Compose a flagship theatrical trailer: open with an arresting establishing hook, build character stakes in the rise, hit a dramatic peak without spoiling the resolution, and land on the title reveal.',
  },
  {
    id: 'social_vertical_hook',
    name: 'Social Hook Teaser (Reels / TikTok / Shorts)',
    badge: '9:16 · Fast Hook',
    description:
      'High-retention vertical teaser engineered to stop the scroll in the first 3 seconds with punchy cuts.',
    defaultDurationSec: 30,
    defaultAspect: '9:16',
    defaultAudienceHint:
      'Mobile-first social media viewers (TikTok, Instagram Reels, YouTube Shorts) who respond to immediate visual intrigue and fast pacing.',
    directorStrategyPrompt:
      'Compose a high-retention vertical social teaser: lead immediately with the most visually striking or emotionally charged shot as a 3-second scroll-stopper, keep cuts tight (4–5s), and end on a cliffhanger question before the title card.',
  },
  {
    id: 'character_spotlight',
    name: 'Character & Emotion Spotlight',
    badge: '16:9 · Character',
    description:
      'Intimate, performance-driven cut spotlighting the protagonist’s emotional journey and signature dialogue.',
    defaultDurationSec: 60,
    defaultAspect: '16:9',
    defaultAudienceHint:
      'Drama and character-focused viewers drawn to emotional depth, relatable conflict, and standout performances.',
    directorStrategyPrompt:
      'Compose a character-driven spotlight promo: prioritize expressive close-ups, pivotal spoken dialogue lines, and interpersonal turning points that reveal the protagonist’s inner conflict.',
  },
  {
    id: 'high_octane_action',
    name: 'High-Impact Action & Thrill Cut',
    badge: '16:9 · Kinetic',
    description:
      'Adrenaline-fueled kinetic cut emphasizing visual momentum, set-pieces, and escalating tension.',
    defaultDurationSec: 30,
    defaultAspect: '16:9',
    defaultAudienceHint:
      'Genre, thriller, sci-fi, and action fans energized by dynamic movement, spectacle, and high-stakes urgency.',
    directorStrategyPrompt:
      'Compose a high-octane kinetic promo: favor dynamic action shots, high-energy movement, urgent stakes, and rapid escalation toward a thrilling peak.',
  },
  {
    id: 'mystery_cliffhanger',
    name: 'Mystery & Intrigue Teaser',
    badge: '16:9 · Suspense',
    description:
      'Atmospheric slow-burn teaser built around unanswered questions, tension, and a haunting reveal.',
    defaultDurationSec: 60,
    defaultAspect: '16:9',
    defaultAudienceHint:
      'Mystery, thriller, and prestige-drama audiences intrigued by secrets, atmospheric tension, and puzzles.',
    directorStrategyPrompt:
      'Compose a suspenseful mystery teaser: juxtapose enigmatic visuals with cryptic or revealing dialogue lines, withhold full explanations, and leave the audience with an unforgettable dramatic question.',
  },
  {
    id: 'global_multilanguage',
    name: 'Global Multilanguage Launch',
    badge: 'Multi-Lang · Global',
    description:
      'International campaign cut balancing universal visual storytelling with localized voiceover and dialogue across target markets.',
    defaultDurationSec: 60,
    defaultAspect: '16:9',
    defaultAudienceHint:
      'Global international audiences across multiple language markets; relies on universally resonant visuals paired with localized narration and key dialogue.',
    directorStrategyPrompt:
      'Compose an international global-launch trailer: balance universally legible visual storytelling and iconic action moments with clear, high-impact spoken lines and narration that localize cleanly across multiple languages.',
    recommendedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'pt'],
  },
]

export function getPromoCampaignPreset(
  presetId?: string | null
): PromoCampaignPresetDefinition | undefined {
  if (!presetId) return undefined
  return PROMO_CAMPAIGN_PRESETS.find((preset) => preset.id === presetId)
}

export interface PromoSceneBeat extends SceneBeat {
  sourceSceneId?: string
  sourceBeatId?: string
  sourceSceneIndex?: number
  /** Copied production clip URL for trailer stitch / seeded segments. */
  promoVideoUrl?: string
}

export interface PromoSceneRecord {
  id: string
  promoId?: string
  campaignName?: string
  campaignPreset?: PromoCampaignPresetId
  campaignObjective?: string
  campaignLanguages?: string[]
  promoAspect?: PromoFrameAspect
  sceneNumber: number
  heading: string
  location: string
  timeOfDay: string
  interior: boolean
  action: string
  dialogue: unknown[]
  characters: unknown[]
  duration: number
  cinematicType: typeof PROMO_SCENE_CINEMATIC_TYPE
  beats: PromoSceneBeat[]
  music?: string
  musicAudio?: string
  dialogueAudio?: Record<string, unknown[]>
  promoBeatPlan?: PromoTrailerBeatPlan[]
}

export function isPromoCinematicScene(scene: unknown): boolean {
  if (!scene || typeof scene !== 'object') return false
  const s = scene as Record<string, unknown>
  if (s.cinematicType === PROMO_SCENE_CINEMATIC_TYPE) return true
  const heading = String(s.heading || '').toUpperCase()
  return heading.includes('PROMO TRAILER') || heading.startsWith('PROMO:') || heading.startsWith('PROMO —')
}

function matchesPromoSceneId(scene: unknown, promoId: string): boolean {
  if (!isPromoCinematicScene(scene)) return false
  const s = scene as Record<string, unknown>
  const id = String(s.promoId || s.id || s.sceneId || '').trim()
  return Boolean(id && id === promoId.trim())
}

export function findPromoSceneIndex(scenes: unknown[], promoId?: string): number {
  if (!Array.isArray(scenes)) return -1
  if (promoId && promoId.trim()) {
    const exact = scenes.findIndex((s) => matchesPromoSceneId(s, promoId))
    if (exact >= 0) return exact
  }
  return scenes.findIndex((s) => isPromoCinematicScene(s))
}

export function promoSceneDisplayName(scene: unknown, promoNumber = 1): string {
  if (!scene || typeof scene !== 'object') return promoNumber > 1 ? `Promo ${promoNumber}` : 'Promo'
  const s = scene as Record<string, unknown>
  const explicitName = typeof s.campaignName === 'string' ? s.campaignName.trim() : ''
  if (explicitName) return explicitName
  const rawHeading = typeof s.heading === 'string' ? s.heading.trim() : ''
  if (rawHeading) {
    const stripped = rawHeading
      .replace(/^PROMO\s*(TRAILER)?\s*[:—\-–]?\s*/i, '')
      .trim()
    if (stripped && stripped.toUpperCase() !== 'PROMO TRAILER') {
      return stripped
    }
  }
  return promoNumber > 1 ? `Promo ${promoNumber}` : 'Promo Trailer'
}

export interface PromoSceneSummary {
  scene: Record<string, unknown>
  index: number
  promoNumber: number
  promoId: string
  name: string
  preset?: PromoCampaignPresetId
  aspect?: PromoFrameAspect
  languages?: string[]
}

export function findPromoScenes(scenes: unknown[] | undefined): PromoSceneSummary[] {
  if (!Array.isArray(scenes)) return []
  const list: PromoSceneSummary[] = []
  scenes.forEach((raw, index) => {
    if (!isPromoCinematicScene(raw)) return
    const scene = raw as Record<string, unknown>
    const promoNumber = list.length + 1
    const promoId = String(scene.promoId || scene.id || scene.sceneId || `promo-${promoNumber}`)
    const name = promoSceneDisplayName(scene, promoNumber)
    const preset =
      typeof scene.campaignPreset === 'string'
        ? (scene.campaignPreset as PromoCampaignPresetId)
        : undefined
    const aspect =
      scene.promoAspect === '9:16' || scene.promoAspect === '16:9'
        ? (scene.promoAspect as PromoFrameAspect)
        : undefined
    const languages = Array.isArray(scene.campaignLanguages)
      ? scene.campaignLanguages.filter((l): l is string => typeof l === 'string' && Boolean(l.trim()))
      : undefined
    list.push({
      scene,
      index,
      promoNumber,
      promoId,
      name,
      preset,
      aspect,
      languages,
    })
  })
  return list
}

export function filterOutPromoScenes<T>(scenes: T[]): T[] {
  return scenes.filter((s) => !isPromoCinematicScene(s))
}

/** Source shots the current promo cut points at, as `sceneIndex:beatId`. */
export function promoSourceShotKeys(scenes: unknown[] | undefined): Set<string> {
  const keys = new Set<string>()
  if (!Array.isArray(scenes)) return keys
  for (const scene of scenes) {
    if (!isPromoCinematicScene(scene)) continue
    for (const beat of getSceneBeats(scene as Record<string, unknown>)) {
      const source = beat as PromoSceneBeat
      if (source.sourceBeatId && typeof source.sourceSceneIndex === 'number') {
        keys.add(`${source.sourceSceneIndex}:${source.sourceBeatId}`)
      }
    }
  }
  return keys
}

export function filmSceneIndices(scenes: unknown[]): number[] {
  return scenes
    .map((scene, index) => (isPromoCinematicScene(scene) ? -1 : index))
    .filter((index) => index >= 0)
}

export interface BuildPromoSceneInput {
  beatPlan: PromoTrailerBeatPlan[]
  targetDurationSec: number
  projectTitle?: string
  existingPromoScene?: Record<string, unknown> | null
  narrationLine?: string
  promoId?: string
  campaignName?: string
  campaignPreset?: PromoCampaignPresetId
  campaignObjective?: string
  campaignLanguages?: string[]
  promoAspect?: PromoFrameAspect
}

export interface BuildPromoSceneResult {
  scene: PromoSceneRecord
  productionSeed: Partial<SceneProductionData> & {
    sceneId: string
    segments: SceneSegment[]
  }
}

function buildPromoBeats(
  beatPlan: PromoTrailerBeatPlan[],
  narrationLine?: string
): PromoSceneBeat[] {
  const beats: PromoSceneBeat[] = beatPlan.map((plan, index) => {
    const durationSec = plan.durationSec ?? plan.endSec - plan.startSec
    const label = plan.label || `Promo moment ${index + 1}`
    const kind = plan.beatKind === 'dialogue' ? 'dialogue' : 'action'
    const isClimax = Boolean(plan.isClimaxCandidate)
    return {
      beatId: `bt_promo_${plan.sceneIndex}_${plan.beatId || 'shot'}_${index}`,
      sequenceIndex: narrationLine ? index + 1 : index,
      kind,
      actionDescription: label,
      ...(kind === 'dialogue'
        ? {
            line: label,
            lineId: `ln_promo_${plan.sceneIndex}_${index}`,
          }
        : {}),
      beatRole: plan.beatRole || 'progression',
      storyboardImageUrl: plan.frameUrl,
      durationSeconds: durationSec,
      musicEnabled: true,
      sourceSceneId: plan.sceneId,
      sourceBeatId: plan.beatId,
      sourceSceneIndex: plan.sceneIndex,
      promoVideoUrl: plan.videoUrl,
      beatDirection: {
        shotType: isClimax ? 'Dynamic medium close-up' : 'Medium cinematic shot',
        cameraAngle: isClimax ? 'Low heroic angle' : 'Eye-level cinematic framing',
        cameraMovement: isClimax ? 'Rapid dramatic push-in' : 'Controlled tracking movement',
        frozenMoment: label,
        blocking: label,
        emotion: isClimax ? 'Peak dramatic tension' : 'Heightened trailer momentum',
        lightingAccent: 'High-contrast cinematic lighting',
        transition: 'CUT',
        generatedBy: 'planner',
      },
    }
  })

  if (narrationLine?.trim()) {
    const cleanNarration = narrationLine.trim()
    const firstShotLabel = beatPlan[0]?.label?.trim()
    beats.unshift({
      beatId: 'bt_promo_narration_0',
      sequenceIndex: 0,
      kind: 'narration',
      character: 'NARRATOR',
      characterId: 'narrator',
      line: cleanNarration,
      lineId: 'ln_promo_narration_0',
      actionDescription: 'Promo trailer voice-over',
      beatRole: 'opening',
      storyboardImageUrl: beatPlan[0]?.frameUrl,
      durationSeconds: Math.min(12, Math.max(6, cleanNarration.split(/\s+/).length * 0.35)),
      musicEnabled: true,
      beatDirection: {
        shotType: 'Wide establishing shot',
        cameraAngle: 'Eye-level cinematic framing',
        cameraMovement: 'Slow push-in establishing trailer tone',
        frozenMoment: firstShotLabel
          ? `Opening trailer montage image: ${firstShotLabel}`
          : `Trailer opening frame accompanying voice-over: "${cleanNarration}"`,
        blocking: 'Voice-over narration plays over the opening promotional montage sequence.',
        emotion: 'Anticipation and cinematic intrigue',
        lightingAccent: 'High-contrast dramatic trailer lighting',
        audioCue: 'Trailer voice-over with atmospheric score swell',
        transition: 'DISSOLVE',
        castInFrame: [],
        generatedBy: 'planner',
      },
    })
    beats.forEach((b, i) => {
      b.sequenceIndex = i
    })
  }

  return beats
}

function buildSeedSegments(
  sceneId: string,
  beats: PromoSceneBeat[]
): SceneSegment[] {
  let cursor = 0
  return beats
    .filter((b) => b.kind !== 'narration' || b.promoVideoUrl || b.storyboardImageUrl)
    .map((beat, index) => {
      const duration = beat.durationSeconds || 5
      const startTime = cursor
      const endTime = cursor + duration
      cursor = endTime
      const segment: SceneSegment = {
        segmentId: `${sceneId}-seg-${index}`,
        sequenceIndex: index,
        startTime,
        endTime,
        status: beat.promoVideoUrl ? 'COMPLETE' : 'DRAFT',
        activeAssetUrl: beat.promoVideoUrl || null,
        assetType: beat.promoVideoUrl ? 'video' : beat.storyboardImageUrl ? 'image' : null,
        references: {
          startFrameUrl: beat.storyboardImageUrl || null,
          endFrameUrl: beat.storyboardEndImageUrl || null,
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
        takes: beat.promoVideoUrl
          ? [
              {
                id: `${sceneId}-take-${index}`,
                assetUrl: beat.promoVideoUrl,
                videoUrl: beat.promoVideoUrl,
                createdAt: new Date().toISOString(),
                status: 'COMPLETE',
                notes: 'Promo reuse',
              },
            ]
          : [],
        beatId: beat.beatId,
        visualFrame: beat.storyboardImageUrl,
        action: beat.actionDescription,
      }
      return segment
    })
}

/** Convert a trailer plan into a script promo scene + production seed. */
export function buildPromoSceneFromPlan(input: BuildPromoSceneInput): BuildPromoSceneResult {
  const existingId =
    (typeof input.promoId === 'string' && input.promoId.trim() ? input.promoId.trim() : '') ||
    (typeof input.existingPromoScene?.id === 'string'
      ? input.existingPromoScene.id
      : typeof input.existingPromoScene?.sceneId === 'string'
        ? String(input.existingPromoScene.sceneId)
        : `promo-${Date.now()}`)

  const title = input.projectTitle?.trim() || 'Untitled'
  const presetDef = getPromoCampaignPreset(
    input.campaignPreset ??
      (typeof input.existingPromoScene?.campaignPreset === 'string'
        ? input.existingPromoScene.campaignPreset
        : undefined)
  )
  const campaignName =
    input.campaignName?.trim() ||
    (typeof input.existingPromoScene?.campaignName === 'string'
      ? input.existingPromoScene.campaignName.trim()
      : '') ||
    presetDef?.name ||
    ''
  const heading = campaignName ? `${PROMO_SCENE_HEADING} — ${campaignName}` : PROMO_SCENE_HEADING
  const campaignPreset =
    input.campaignPreset ??
    (typeof input.existingPromoScene?.campaignPreset === 'string'
      ? (input.existingPromoScene.campaignPreset as PromoCampaignPresetId)
      : undefined)
  const campaignObjective =
    input.campaignObjective?.trim() ||
    (typeof input.existingPromoScene?.campaignObjective === 'string'
      ? input.existingPromoScene.campaignObjective.trim()
      : undefined)
  const campaignLanguages =
    Array.isArray(input.campaignLanguages) && input.campaignLanguages.length > 0
      ? input.campaignLanguages
      : Array.isArray(input.existingPromoScene?.campaignLanguages)
        ? (input.existingPromoScene?.campaignLanguages as string[])
        : undefined
  const promoAspect =
    input.promoAspect ||
    (input.existingPromoScene?.promoAspect === '9:16' ||
    input.existingPromoScene?.promoAspect === '16:9'
      ? (input.existingPromoScene.promoAspect as PromoFrameAspect)
      : presetDef?.defaultAspect)

  const beats = buildPromoBeats(input.beatPlan, input.narrationLine)
  const defaultSceneDirection =
    input.existingPromoScene?.sceneDirection &&
    typeof input.existingPromoScene.sceneDirection === 'object'
      ? input.existingPromoScene.sceneDirection
      : {
          sceneDescription:
            campaignObjective ||
            presetDef?.description ||
            `High-impact promotional trailer montage for "${title}".`,
          scene: {
            location: campaignName || 'PROMO TRAILER MONTAGE',
            atmosphere: 'Dynamic trailer pacing with high-contrast cinematic continuity',
          },
          camera: {
            shots: input.beatPlan.map((p) => p.label).filter(Boolean).slice(0, 6),
            angle: 'Cinematic multi-angle montage coverage',
            movement: 'Rhythmic push-ins and kinetic trailer cuts',
          },
          lighting: {
            overallMood: 'High-contrast promotional trailer grade',
            timeOfDay: 'MULTI-SCENE MONTAGE',
            colorTemperature: 'Rich cinematic contrast',
          },
          talent: {
            emotionalBeat: campaignObjective || 'Escalating intrigue and emotional hook',
            blocking: 'Montage cross-cutting key character and action highlights',
          },
          audio: {
            priorities: 'Voice-over hook, dramatic score swell, and crisp transition hits',
          },
        }
  const scene: PromoSceneRecord = {
    id: existingId,
    promoId: existingId,
    ...(campaignName ? { campaignName } : {}),
    ...(campaignPreset ? { campaignPreset } : {}),
    ...(campaignObjective ? { campaignObjective } : {}),
    ...(campaignLanguages ? { campaignLanguages } : {}),
    ...(promoAspect ? { promoAspect } : {}),
    sceneNumber: 9999,
    heading,
    location: campaignName || 'PROMO TRAILER',
    timeOfDay: 'DAY',
    interior: true,
    action: `[${heading} — ${input.targetDurationSec}s${promoAspect ? ` · ${promoAspect}` : ''}]\n${
      campaignObjective || presetDef?.description || `Captivating highlights for ${title}.`
    }`,
    dialogue: [],
    characters: [],
    duration: input.targetDurationSec,
    cinematicType: PROMO_SCENE_CINEMATIC_TYPE,
    sceneDirection: defaultSceneDirection,
    beats,
    promoBeatPlan: input.beatPlan,
    music:
      typeof input.existingPromoScene?.music === 'string'
        ? input.existingPromoScene.music
        : `Cinematic promotional trailer score for "${title}"${
            campaignName ? ` (${campaignName})` : ''
          }, building tension, emotional swell, memorable theme, no vocals`,
    musicAudio:
      typeof input.existingPromoScene?.musicAudio === 'string'
        ? input.existingPromoScene.musicAudio
        : undefined,
    dialogueAudio:
      input.existingPromoScene?.dialogueAudio &&
      typeof input.existingPromoScene.dialogueAudio === 'object'
        ? (input.existingPromoScene.dialogueAudio as Record<string, unknown[]>)
        : undefined,
  }

  const segments = buildSeedSegments(existingId, beats)
  const productionSeed = {
    sceneId: existingId,
    segments,
  }

  return { scene, productionSeed }
}

/** Upsert promo scene at end of script scene list (supports multiple promo scenes by promoId). */
export function upsertPromoSceneInScenes(
  scenes: unknown[],
  promoScene: PromoSceneRecord,
  options?: { promoId?: string; createNew?: boolean }
): unknown[] {
  const next = [...scenes]
  const targetPromoId = options?.promoId?.trim() || promoScene.promoId || promoScene.id
  let existingIdx = -1
  if (!options?.createNew) {
    if (options?.promoId) {
      existingIdx = next.findIndex((s) => matchesPromoSceneId(s, targetPromoId))
    } else {
      const byOwnId = targetPromoId
        ? next.findIndex((s) => matchesPromoSceneId(s, targetPromoId))
        : -1
      existingIdx = byOwnId >= 0 ? byOwnId : findPromoSceneIndex(next)
    }
  }
  const sceneWithNumber = {
    ...promoScene,
    id: promoScene.id || targetPromoId,
    promoId: promoScene.promoId || promoScene.id || targetPromoId,
    sceneNumber: existingIdx >= 0 ? existingIdx + 1 : next.length + 1,
  }
  if (existingIdx >= 0) {
    next[existingIdx] = sceneWithNumber
    return next
  }
  next.push(sceneWithNumber)
  return next
}

export function removePromoSceneFromScenes(
  scenes: unknown[],
  promoId: string
): unknown[] {
  if (!Array.isArray(scenes) || !promoId.trim()) return scenes
  return scenes
    .filter((s) => !matchesPromoSceneId(s, promoId))
    .map((scene, index) =>
      scene && typeof scene === 'object'
        ? { ...(scene as Record<string, unknown>), sceneNumber: index + 1 }
        : scene
    )
}

/**
 * Hydrate a Promo scene and its production segments dynamically from their shared source scenes.
 * This ensures that when viewing or producing a Promo scene on the Production Stage workflow,
 * stills, shot direction, and video clips are live-shared with their respective source scenes.
 */
export function hydratePromoSceneWithSharedShots(
  promoScene: Record<string, unknown>,
  scenes: unknown[] | undefined,
  sceneProductionState: Record<string, SceneProductionData> | undefined
): {
  scene: Record<string, unknown>
  productionData: SceneProductionData | undefined
} {
  if (!isPromoCinematicScene(promoScene) || !Array.isArray(scenes)) {
    const id = String(promoScene?.sceneId || promoScene?.id || '')
    return {
      scene: promoScene,
      productionData: id && sceneProductionState ? sceneProductionState[id] : undefined,
    }
  }

  const promoSceneId = String(promoScene.sceneId || promoScene.id || 'promo-main')
  const rawBeats = getSceneBeats(promoScene) as PromoSceneBeat[]
  const firstAvailableSharedFrame = rawBeats
    .map((beat) => {
      if (typeof beat.sourceSceneIndex === 'number' && beat.sourceBeatId) {
        const srcScene = scenes[beat.sourceSceneIndex] as Record<string, unknown> | undefined
        const srcBeat = srcScene
          ? getSceneBeats(srcScene).find((candidate) => candidate.beatId === beat.sourceBeatId)
          : undefined
        return srcBeat?.storyboardImageUrl || beat.storyboardImageUrl
      }
      return beat.storyboardImageUrl
    })
    .find((url): url is string => typeof url === 'string' && url.trim().length > 0)

  const hydratedBeats: PromoSceneBeat[] = rawBeats.map((beat) => {
    if (beat.kind === 'narration' && (typeof beat.sourceSceneIndex !== 'number' || !beat.sourceBeatId)) {
      const hasDir = beat.beatDirection && Object.keys(beat.beatDirection).length > 0
      return {
        ...beat,
        storyboardImageUrl: beat.storyboardImageUrl || firstAvailableSharedFrame,
        ...(hasDir
          ? {}
          : {
              beatDirection: {
                shotType: 'Wide establishing shot',
                cameraAngle: 'Eye-level cinematic framing',
                cameraMovement: 'Slow push-in establishing trailer tone',
                frozenMoment:
                  beat.line?.trim() || 'Promo trailer opening voice-over sequence',
                blocking: 'Voice-over narration plays over the opening promotional montage sequence.',
                emotion: 'Anticipation and cinematic intrigue',
                lightingAccent: 'High-contrast dramatic trailer lighting',
                audioCue: 'Trailer voice-over with atmospheric score swell',
                transition: 'DISSOLVE',
                castInFrame: [],
                generatedBy: 'planner',
              },
            }),
      }
    }
    if (typeof beat.sourceSceneIndex !== 'number' || !beat.sourceBeatId) {
      return beat
    }
    const sourceScene = scenes[beat.sourceSceneIndex] as Record<string, unknown> | undefined
    if (!sourceScene) return beat
    const sourceBeat = getSceneBeats(sourceScene).find(
      (candidate) => candidate.beatId === beat.sourceBeatId
    )
    if (!sourceBeat) return beat

    return {
      ...sourceBeat,
      ...beat,
      beatId: beat.beatId,
      sequenceIndex: beat.sequenceIndex,
      durationSeconds: beat.durationSeconds ?? sourceBeat.durationSeconds,
      sourceSceneId:
        beat.sourceSceneId ||
        String(sourceScene.id || sourceScene.sceneId || `scene-${beat.sourceSceneIndex}`),
      sourceSceneIndex: beat.sourceSceneIndex,
      sourceBeatId: beat.sourceBeatId,
      // Live-share still frames, versions, prompts, direction, and references from the source shot:
      storyboardImageUrl: sourceBeat.storyboardImageUrl || beat.storyboardImageUrl,
      storyboardEndImageUrl: sourceBeat.storyboardEndImageUrl || beat.storyboardEndImageUrl,
      storyboardImagePrompt: sourceBeat.storyboardImagePrompt || beat.storyboardImagePrompt,
      storyboardEndImagePrompt:
        sourceBeat.storyboardEndImagePrompt || beat.storyboardEndImagePrompt,
      storyboardImagePromptDirectionKey:
        sourceBeat.storyboardImagePromptDirectionKey || beat.storyboardImagePromptDirectionKey,
      beatDirection: sourceBeat.beatDirection || beat.beatDirection,
      referenceSelection: sourceBeat.referenceSelection || beat.referenceSelection,
      stillVersions: sourceBeat.stillVersions || beat.stillVersions,
      endStillVersions: sourceBeat.endStillVersions || beat.endStillVersions,
      characterIds: sourceBeat.characterIds || beat.characterIds,
      locationId: sourceBeat.locationId || beat.locationId,
      propIds: sourceBeat.propIds || beat.propIds,
      actionDescription:
        sourceBeat.actionDescription || beat.actionDescription,
      line: beat.kind === 'narration' ? beat.line : sourceBeat.line || beat.line,
      character:
        beat.kind === 'narration' ? beat.character : sourceBeat.character || beat.character,
    }
  })

  const ownProd = sceneProductionState?.[promoSceneId]
  let cursor = 0
  const hydratedSegments: SceneSegment[] = hydratedBeats
    .filter((b) => b.kind !== 'narration' || b.promoVideoUrl || b.storyboardImageUrl)
    .map((beat, index) => {
      const duration = beat.durationSeconds || 5
      const startTime = cursor
      const endTime = cursor + duration
      cursor = endTime

      const existingPromoSeg = ownProd?.segments?.find((s) => s.beatId === beat.beatId) || ownProd?.segments?.[index]
      let sourceSeg: SceneSegment | undefined
      if (typeof beat.sourceSceneIndex === 'number' && beat.sourceBeatId && sceneProductionState) {
        const sourceScene = scenes[beat.sourceSceneIndex] as Record<string, unknown> | undefined
        const sourceKeyCandidates = [
          beat.sourceSceneId,
          typeof sourceScene?.id === 'string' ? sourceScene.id : undefined,
          typeof sourceScene?.sceneId === 'string' ? sourceScene.sceneId : undefined,
          `scene-${beat.sourceSceneIndex}`,
        ].filter((k): k is string => Boolean(k))
        for (const key of sourceKeyCandidates) {
          const prod = sceneProductionState[key]
          const found = prod?.segments?.find((s) => s.beatId === beat.sourceBeatId)
          if (found) {
            sourceSeg = found
            break
          }
        }
      }

      const activeVideoUrl =
        sourceSeg?.activeAssetUrl ||
        existingPromoSeg?.activeAssetUrl ||
        beat.promoVideoUrl ||
        null
      const startFrame =
        sourceSeg?.startFrameUrl ||
        sourceSeg?.references?.startFrameUrl ||
        beat.storyboardImageUrl ||
        existingPromoSeg?.references?.startFrameUrl ||
        null
      const endFrame =
        sourceSeg?.endFrameUrl ||
        sourceSeg?.references?.endFrameUrl ||
        beat.storyboardEndImageUrl ||
        existingPromoSeg?.references?.endFrameUrl ||
        null

      return {
        ...(sourceSeg || {}),
        ...(existingPromoSeg || {}),
        segmentId: existingPromoSeg?.segmentId || `${promoSceneId}-seg-${index}`,
        sequenceIndex: index,
        startTime,
        endTime,
        duration,
        beatId: beat.beatId,
        status: activeVideoUrl ? 'COMPLETE' : sourceSeg?.status || existingPromoSeg?.status || 'DRAFT',
        activeAssetUrl: activeVideoUrl,
        assetType: activeVideoUrl ? 'video' : startFrame ? 'image' : null,
        startFrameUrl: startFrame || undefined,
        endFrameUrl: endFrame || undefined,
        references: {
          ...(sourceSeg?.references || existingPromoSeg?.references || {
            characterIds: [],
            sceneRefIds: [],
            objectRefIds: [],
          }),
          startFrameUrl: startFrame,
          endFrameUrl: endFrame,
        },
        takes:
          sourceSeg?.takes && sourceSeg.takes.length > 0
            ? sourceSeg.takes
            : existingPromoSeg?.takes || [],
        visualFrame: startFrame || undefined,
        action: beat.actionDescription,
      } as SceneSegment
    })

  const hydratedSceneDirection =
    promoScene.sceneDirection && typeof promoScene.sceneDirection === 'object'
      ? promoScene.sceneDirection
      : {
          sceneDescription:
            typeof promoScene.campaignObjective === 'string' && promoScene.campaignObjective.trim()
              ? promoScene.campaignObjective.trim()
              : typeof promoScene.action === 'string' && promoScene.action.trim()
                ? promoScene.action.trim()
                : 'Promotional trailer cut assembling key shared shots across scenes.',
          scene: {
            location: String(promoScene.location || promoScene.campaignName || 'PROMO TRAILER'),
            atmosphere: 'Dynamic trailer pacing with high-contrast cinematic continuity',
          },
          camera: {
            shots: hydratedBeats
              .map((b) => b.actionDescription || b.line)
              .filter((s): s is string => Boolean(s && s.trim()))
              .slice(0, 6),
            angle: 'Cinematic multi-angle montage coverage',
            movement: 'Rhythmic push-ins and kinetic trailer cuts',
          },
          lighting: {
            overallMood: 'High-contrast promotional trailer grade',
            timeOfDay: 'MULTI-SCENE MONTAGE',
            colorTemperature: 'Rich cinematic contrast',
          },
        }

  return {
    scene: {
      ...promoScene,
      sceneDirection: hydratedSceneDirection,
      beats: hydratedBeats,
    },
    productionData: {
      ...(ownProd || { isSegmented: true, targetDuration: Number(promoScene.duration) || cursor }),
      isSegmented: true,
      segments: hydratedSegments,
    } as SceneProductionData,
  }
}
