/**
 * Build / upsert a cinematic promo scene from a trailer beat plan.
 */

import { beatsToLegacyFields, getSceneBeats, mintBeatId } from '@/lib/script/beatMigration'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { mediaBlobUrlTimestamp } from '@/lib/storyboard/mediaVersions'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import type {
  PromoCampaignPresetId,
  PromoFrameAspect,
  PromoTrailerBeatPlan,
} from '@/types/publishingAssets'
import type { SceneSegment, SceneProductionData } from '@/components/vision/scene-production/types'
import type { DetailedSceneDirection } from '@/types/scene-direction'

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
  /** 1-based scene number of the shared source scene (e.g. 2 for Scene 2). */
  sourceSceneNumber?: number
  /** 1-based shot number inside the shared source scene (e.g. 3 for Shot 3). */
  sourceShotNumber?: number
  /** Copied production clip URL for trailer stitch / seeded segments. */
  promoVideoUrl?: string
}

/** Compact pill badge for a shared promo beat, e.g. `"S2 · Shot 3"` (or `"S2"` if shot number is unknown). */
export function formatPromoSourceBadge(
  beat?: {
    sourceSceneIndex?: number
    sourceSceneNumber?: number
    sourceShotNumber?: number
    sourceBeatId?: string
  } | null
): string | undefined {
  if (!beat || typeof beat.sourceSceneIndex !== 'number') return undefined
  const sceneNum =
    typeof beat.sourceSceneNumber === 'number' && beat.sourceSceneNumber > 0
      ? beat.sourceSceneNumber
      : beat.sourceSceneIndex + 1
  if (typeof beat.sourceShotNumber === 'number' && beat.sourceShotNumber > 0) {
    return `S${sceneNum} · Shot ${beat.sourceShotNumber}`
  }
  return `S${sceneNum}`
}

/** Descriptive source label for headers/toasts, e.g. `"Scene 2 · Shot 3"`. */
export function formatPromoSourceLongLabel(
  beat?: {
    sourceSceneIndex?: number
    sourceSceneNumber?: number
    sourceShotNumber?: number
    sourceBeatId?: string
  } | null
): string | undefined {
  if (!beat || typeof beat.sourceSceneIndex !== 'number') return undefined
  const sceneNum =
    typeof beat.sourceSceneNumber === 'number' && beat.sourceSceneNumber > 0
      ? beat.sourceSceneNumber
      : beat.sourceSceneIndex + 1
  if (typeof beat.sourceShotNumber === 'number' && beat.sourceShotNumber > 0) {
    return `Scene ${sceneNum} · Shot ${beat.sourceShotNumber}`
  }
  return `Scene ${sceneNum}`
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
  sceneMusicCues?: SceneMusicCue[]
  dialogueAudio?: Record<string, unknown[]>
  promoBeatPlan?: PromoTrailerBeatPlan[]
}

export function buildPromoSceneMusicCues(opts: {
  beatsCount: number
  musicPrompt: string
  musicAudio?: string
  durationSec?: number
  existingCues?: unknown
}): SceneMusicCue[] {
  const endIdx = Math.max(0, opts.beatsCount - 1)
  if (Array.isArray(opts.existingCues) && opts.existingCues.length > 0) {
    const valid = opts.existingCues.filter(
      (c): c is Record<string, unknown> => Boolean(c && typeof c === 'object')
    )
    if (valid.length > 0) {
      return valid.map((cue, idx) => {
        const cueUrl =
          (typeof cue.url === 'string' && cue.url.trim()) ||
          (idx === 0 && opts.musicAudio?.trim()) ||
          undefined
        const cueDesc =
          (typeof cue.description === 'string' && cue.description.trim()) ||
          opts.musicPrompt
        return {
          cueId:
            typeof cue.cueId === 'string' && cue.cueId.trim()
              ? cue.cueId.trim()
              : `cue-0-${endIdx}`,
          beatStart:
            typeof cue.beatStart === 'number' && cue.beatStart >= 0
              ? Math.min(endIdx, cue.beatStart)
              : 0,
          beatEnd:
            idx === valid.length - 1
              ? endIdx
              : typeof cue.beatEnd === 'number' && cue.beatEnd >= 0
                ? Math.min(endIdx, cue.beatEnd)
                : endIdx,
          description: cueDesc,
          intent:
            (typeof cue.intent === 'string' && cue.intent.trim()) ||
            'Escalating promotional trailer momentum and emotional hook',
          entry: (cue.entry === 'fade' || cue.entry === 'hard' || cue.entry === 'swell'
            ? cue.entry
            : 'swell') as SceneMusicCue['entry'],
          exit: (cue.exit === 'fade' || cue.exit === 'hard' || cue.exit === 'tail'
            ? cue.exit
            : 'tail') as SceneMusicCue['exit'],
          ...(cueUrl ? { url: cueUrl } : {}),
          ...(typeof cue.duration === 'number' && cue.duration > 0
            ? { duration: cue.duration }
            : opts.durationSec && opts.durationSec > 0
              ? { duration: opts.durationSec }
              : {}),
          generatedBy:
            cue.generatedBy === 'llm' || cue.generatedBy === 'user' || cue.generatedBy === 'derived'
              ? cue.generatedBy
              : 'derived',
          volume: typeof cue.volume === 'number' ? cue.volume : 0.35,
        }
      })
    }
  }
  return [
    {
      cueId: `cue-0-${endIdx}`,
      beatStart: 0,
      beatEnd: endIdx,
      description: opts.musicPrompt,
      intent: 'Escalating promotional trailer momentum and emotional hook',
      entry: 'swell',
      exit: 'tail',
      ...(opts.musicAudio?.trim() ? { url: opts.musicAudio.trim() } : {}),
      ...(opts.durationSec && opts.durationSec > 0 ? { duration: opts.durationSec } : {}),
      generatedBy: 'derived',
      volume: 0.35,
    },
  ]
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
  musicAudioUrl?: string
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
      sequenceIndex: index,
      kind,
      actionDescription: label,
      ...(kind === 'dialogue'
        ? {
            line: label,
            lineId: plan.lineId?.trim() || `ln_promo_${plan.sceneIndex}_${index}`,
            ...(plan.character?.trim() ? { character: plan.character.trim() } : {}),
            ...(plan.characterId?.trim() ? { characterId: plan.characterId.trim() } : {}),
            ...(plan.voiceDirection?.trim() ? { voiceDirection: plan.voiceDirection.trim() } : {}),
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
    // Dub the voice-over narration onto the first actual non-dialogue (establishing / action) shot
    // instead of inserting a synthetic duplicate shot.
    const targetIdx = beats.findIndex((b) => b.kind !== 'dialogue')
    if (targetIdx >= 0) {
      const targetBeat = beats[targetIdx]!
      beats[targetIdx] = {
        ...targetBeat,
        kind: 'narration',
        character: 'NARRATOR',
        characterId: 'narrator',
        line: cleanNarration,
        lineId: 'ln_promo_narration_0',
        beatDirection: {
          ...(targetBeat.beatDirection || {}),
          shotType: targetBeat.beatDirection?.shotType || 'Wide establishing shot',
          cameraAngle: targetBeat.beatDirection?.cameraAngle || 'Eye-level cinematic framing',
          cameraMovement:
            targetBeat.beatDirection?.cameraMovement ||
            'Slow push-in establishing trailer tone',
          frozenMoment:
            targetBeat.beatDirection?.frozenMoment ||
            targetBeat.actionDescription ||
            cleanNarration,
          blocking:
            targetBeat.beatDirection?.blocking ||
            targetBeat.actionDescription ||
            'Voice-over narration dubbed over establishing shot.',
          emotion:
            targetBeat.beatDirection?.emotion || 'Anticipation and cinematic intrigue',
          lightingAccent:
            targetBeat.beatDirection?.lightingAccent ||
            'High-contrast dramatic trailer lighting',
          audioCue:
            'Trailer voice-over narration dubbed over establishing shot with atmospheric score swell',
          transition: targetBeat.beatDirection?.transition || 'DISSOLVE',
          generatedBy: targetBeat.beatDirection?.generatedBy || 'planner',
        },
      }
    }
  }

  return beats
}

function buildSegmentDialogueLinesForBeat(
  beat: PromoSceneBeat,
  existing?: SceneSegment['dialogueLines']
): {
  dialogueLines?: SceneSegment['dialogueLines']
  dialogueLineIds?: string[]
} {
  const spokenText = beat.line?.trim()
  if ((beat.kind === 'dialogue' || beat.kind === 'narration') && spokenText) {
    const id = beat.lineId?.trim() || `${beat.beatId}-line-0`
    const character =
      beat.character?.trim() || (beat.kind === 'narration' ? 'NARRATOR' : 'CHARACTER')
    return {
      dialogueLines: [
        {
          id,
          character,
          line: spokenText,
          covered: false,
        },
      ],
      dialogueLineIds: [id],
    }
  }
  return existing && existing.length > 0 ? { dialogueLines: existing } : {}
}

function resolveSegmentGeneratedPromptForBeat(
  beat: PromoSceneBeat,
  previousBeat: PromoSceneBeat | undefined,
  sceneDirection: DetailedSceneDirection | null | undefined,
  existingPrompt?: string
): string {
  const compiled = compileBeatVideoPromptFromDirection(beat, sceneDirection ?? null, {
    previousBeat,
  }).prompt
  const stored = existingPrompt?.trim()
  if (!stored) return compiled
  const spoken = beat.line?.trim()
  if ((beat.kind === 'narration' || beat.kind === 'dialogue') && spoken) {
    const snippet = spoken.slice(0, Math.min(20, spoken.length))
    if (
      /no spoken dialogue/i.test(stored) ||
      /^medium shot,\s*promo trailer voice-over/i.test(stored) ||
      !stored.includes(snippet)
    ) {
      return compiled
    }
  }
  return stored
}

function buildSeedSegments(
  sceneId: string,
  beats: PromoSceneBeat[],
  sceneDirection?: DetailedSceneDirection | null
): SceneSegment[] {
  let cursor = 0
  const activeBeats = beats.filter((b) => !b.excluded)
  return activeBeats.map((beat, index) => {
    const duration = beat.durationSeconds || 5
    const startTime = cursor
    const endTime = cursor + duration
    cursor = endTime
    const previousBeat = index > 0 ? activeBeats[index - 1] : undefined
    const generatedPrompt = resolveSegmentGeneratedPromptForBeat(
      beat,
      previousBeat,
      sceneDirection
    )
    const dialogueMeta = buildSegmentDialogueLinesForBeat(beat)
    const segment: SceneSegment = {
      segmentId: `${sceneId}-seg-${index}`,
      sequenceIndex: index,
      startTime,
      endTime,
      status: beat.promoVideoUrl ? 'COMPLETE' : 'DRAFT',
      activeAssetUrl: beat.promoVideoUrl || null,
      assetType: beat.promoVideoUrl ? 'video' : beat.storyboardImageUrl ? 'image' : null,
      generatedPrompt,
      ...dialogueMeta,
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
      action:
        beat.kind === 'narration' && beat.line?.trim()
          ? beat.actionDescription?.trim() &&
            beat.actionDescription.trim() !== 'Promo trailer voice-over'
            ? `${beat.actionDescription.trim()} — Voiceover narration: "${beat.line.trim()}"`
            : `Voiceover narration: "${beat.line.trim()}"`
          : beat.actionDescription,
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
  const existingDialogueAudio =
    input.existingPromoScene?.dialogueAudio &&
    typeof input.existingPromoScene.dialogueAudio === 'object'
      ? (input.existingPromoScene.dialogueAudio as Record<string, unknown[]>)
      : undefined
  if (existingDialogueAudio) {
    const narrBeat = beats.find((b) => b.kind === 'narration')
    if (narrBeat && !narrBeat.audioUrl) {
      for (const list of Object.values(existingDialogueAudio)) {
        if (!Array.isArray(list)) continue
        const found = list.find(
          (row) =>
            row &&
            typeof row === 'object' &&
            ((row as { kind?: unknown }).kind === 'narration' ||
              String((row as { character?: unknown }).character || '')
                .trim()
                .toUpperCase() === 'NARRATOR') &&
            typeof (row as { audioUrl?: unknown }).audioUrl === 'string' &&
            String((row as { audioUrl?: unknown }).audioUrl).trim()
        ) as { audioUrl?: string } | undefined
        if (found?.audioUrl) {
          narrBeat.audioUrl = found.audioUrl.trim()
          break
        }
      }
    }
  }
  const legacyFromBeats = beatsToLegacyFields(beats)
  const resolvedNarrationText =
    legacyFromBeats.narration ||
    (typeof input.narrationLine === 'string' && input.narrationLine.trim()
      ? input.narrationLine.trim()
      : undefined)
  const promoCharacters = Array.from(
    new Set(
      beats
        .map((b) => (b.kind === 'dialogue' ? b.character?.trim() : undefined))
        .filter((name): name is string => Boolean(name))
    )
  )
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
  const musicPrompt =
    typeof input.existingPromoScene?.music === 'string' && input.existingPromoScene.music.trim()
      ? input.existingPromoScene.music.trim()
      : `Cinematic promotional trailer score for "${title}"${
          campaignName ? ` (${campaignName})` : ''
        }, building tension, emotional swell, memorable theme, no vocals`
  const existingCues = Array.isArray(input.existingPromoScene?.sceneMusicCues)
    ? (input.existingPromoScene?.sceneMusicCues as Array<Record<string, unknown>>)
    : undefined
  const existingCueAudio = existingCues?.find(
    (c) => c && typeof c.url === 'string' && c.url.trim()
  )?.url as string | undefined
  const musicAudio =
    (typeof input.musicAudioUrl === 'string' && input.musicAudioUrl.trim()) ||
    (typeof input.existingPromoScene?.musicAudio === 'string' &&
      input.existingPromoScene.musicAudio.trim()) ||
    existingCueAudio ||
    undefined
  const sceneMusicCues = buildPromoSceneMusicCues({
    beatsCount: beats.length,
    musicPrompt,
    musicAudio,
    durationSec: input.targetDurationSec,
    existingCues,
  })
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
    dialogue: legacyFromBeats.dialogue,
    ...(resolvedNarrationText ? { narration: resolvedNarrationText } : {}),
    characters: promoCharacters,
    duration: input.targetDurationSec,
    cinematicType: PROMO_SCENE_CINEMATIC_TYPE,
    sceneDirection: defaultSceneDirection,
    beats,
    promoBeatPlan: input.beatPlan,
    music: musicPrompt,
    musicAudio,
    sceneMusicCues,
    dialogueAudio:
      input.existingPromoScene?.dialogueAudio &&
      typeof input.existingPromoScene.dialogueAudio === 'object'
        ? (input.existingPromoScene.dialogueAudio as Record<string, unknown[]>)
        : undefined,
  }

  const segments = buildSeedSegments(
    existingId,
    beats,
    defaultSceneDirection as DetailedSceneDirection
  )
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

function latestStillCreatedAtMs(beat?: SceneBeat | null): number {
  const b = beat as Record<string, unknown> | null | undefined
  const storyboardVersions = Array.isArray(b?.storyboardImageVersions)
    ? (b!.storyboardImageVersions as Array<{ createdAt?: string }>)
    : []
  const legacyVersions = Array.isArray(beat?.stillVersions) ? beat!.stillVersions : []
  let max = 0
  for (const v of [...storyboardVersions, ...legacyVersions]) {
    if (v?.createdAt) {
      const t = Date.parse(v.createdAt)
      if (Number.isFinite(t) && t > max) max = t
    }
  }
  const urlTs = mediaBlobUrlTimestamp(
    typeof beat?.storyboardImageUrl === 'string' ? beat.storyboardImageUrl : ''
  )
  if (urlTs > max) max = urlTs
  return max
}

function preferBeatDirection(
  sourceDir?: SceneBeat['beatDirection'],
  promoDir?: SceneBeat['beatDirection']
): SceneBeat['beatDirection'] {
  if (!sourceDir) return promoDir
  if (!promoDir) return sourceDir
  const srcTime = sourceDir.updatedAt ? Date.parse(sourceDir.updatedAt) : 0
  const promoTime = promoDir.updatedAt ? Date.parse(promoDir.updatedAt) : 0
  if (Number.isFinite(promoTime) && promoTime > 0 && promoTime > (Number.isFinite(srcTime) ? srcTime : 0)) {
    return promoDir
  }
  return sourceDir
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
  const parsedBeats = getSceneBeats(promoScene) as PromoSceneBeat[]

  // Self-heal legacy Promo scenes that inserted an unlinked synthetic `bt_promo_narration_0` shot:
  // fold its narration line/audio onto the first actual non-dialogue shared shot and drop the duplicate beat.
  const unlinkedNarrationBeats = parsedBeats.filter(
    (b) => b.kind === 'narration' && (typeof b.sourceSceneIndex !== 'number' || !b.sourceBeatId)
  )
  const linkedOrNonNarrationBeats = parsedBeats.filter((b) => !unlinkedNarrationBeats.includes(b))
  const rawBeats: PromoSceneBeat[] = (() => {
    if (unlinkedNarrationBeats.length === 0 || linkedOrNonNarrationBeats.length === 0) {
      return parsedBeats
    }
    const legacyNarr = unlinkedNarrationBeats[0]!
    const next = [...linkedOrNonNarrationBeats]
    if (!next.some((b) => b.kind === 'narration')) {
      const targetIdx = next.findIndex((b) => b.kind !== 'dialogue')
      if (targetIdx >= 0) {
        const target = next[targetIdx]!
        next[targetIdx] = {
          ...target,
          kind: 'narration',
          character: legacyNarr.character?.trim() || 'NARRATOR',
          characterId: legacyNarr.characterId?.trim() || 'narrator',
          line: legacyNarr.line?.trim() || target.line,
          lineId: legacyNarr.lineId?.trim() || 'ln_promo_narration_0',
          ...(legacyNarr.voiceDirection?.trim()
            ? { voiceDirection: legacyNarr.voiceDirection.trim() }
            : {}),
          ...(legacyNarr.audioUrl?.trim() ? { audioUrl: legacyNarr.audioUrl.trim() } : {}),
        }
      }
    }
    return next.map((b, idx) => ({ ...b, sequenceIndex: idx }))
  })()

  let promoNarrationAudioUrl: string | undefined
  if (promoScene.dialogueAudio && typeof promoScene.dialogueAudio === 'object') {
    for (const list of Object.values(promoScene.dialogueAudio as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue
      for (const item of list) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        if (
          row.kind === 'narration' ||
          String(row.character || '').trim().toUpperCase() === 'NARRATOR'
        ) {
          const url = String(row.audioUrl ?? row.url ?? '').trim()
          if (url) {
            promoNarrationAudioUrl = url
            break
          }
        }
      }
      if (promoNarrationAudioUrl) break
    }
  }

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
        ...(beat.audioUrl || promoNarrationAudioUrl
          ? { audioUrl: beat.audioUrl || promoNarrationAudioUrl }
          : {}),
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
    const sourceSceneBeats = getSceneBeats(sourceScene)
    const sourceShotIdx = sourceSceneBeats.findIndex(
      (candidate) => candidate.beatId === beat.sourceBeatId
    )
    const sourceBeat = sourceShotIdx >= 0 ? sourceSceneBeats[sourceShotIdx] : undefined
    const sourceSceneNumber =
      typeof sourceScene.sceneNumber === 'number' && sourceScene.sceneNumber > 0
        ? sourceScene.sceneNumber
        : beat.sourceSceneIndex + 1
    const sourceShotNumber = sourceShotIdx >= 0 ? sourceShotIdx + 1 : undefined
    if (!sourceBeat) {
      return {
        ...beat,
        sourceSceneNumber,
        ...(sourceShotNumber ? { sourceShotNumber } : {}),
      }
    }

    const sourceDialogue = Array.isArray(sourceScene.dialogue)
      ? (sourceScene.dialogue as Array<Record<string, unknown>>)
      : []
    const matchedSourceDialogue = sourceDialogue.find((entry) => {
      if (!entry || typeof entry !== 'object') return false
      if (sourceBeat.lineId?.trim() && entry.lineId === sourceBeat.lineId.trim()) return true
      const entryLine = String(entry.line ?? entry.text ?? '').trim()
      const beatLine = String(sourceBeat.line ?? beat.line ?? '').trim()
      return Boolean(beatLine && entryLine && entryLine === beatLine)
    })
    const castFallback =
      sourceBeat.beatDirection?.castInFrame?.find(
        (name) => typeof name === 'string' && name.trim().length > 0
      )?.trim() ||
      beat.beatDirection?.castInFrame?.find(
        (name) => typeof name === 'string' && name.trim().length > 0
      )?.trim()
    const sourceScenePrimaryCharacter = Array.isArray(sourceScene.characters)
      ? sourceScene.characters
          .map((entry) =>
            typeof entry === 'string'
              ? entry.trim()
              : entry && typeof entry === 'object'
                ? String((entry as { name?: unknown }).name ?? '').trim()
                : ''
          )
          .find((name) => name.length > 0)
      : undefined
    const resolvedCharacter =
      beat.kind === 'narration'
        ? beat.character?.trim() || 'NARRATOR'
        : sourceBeat.character?.trim() ||
          beat.character?.trim() ||
          (typeof matchedSourceDialogue?.character === 'string' &&
            matchedSourceDialogue.character.trim()) ||
          castFallback ||
          (beat.kind === 'dialogue' || sourceBeat.kind === 'dialogue'
            ? sourceScenePrimaryCharacter
            : undefined)
    const resolvedCharacterId =
      beat.kind === 'narration'
        ? beat.characterId?.trim() || 'narrator'
        : sourceBeat.characterId?.trim() ||
          beat.characterId?.trim() ||
          (typeof matchedSourceDialogue?.characterId === 'string' &&
            matchedSourceDialogue.characterId.trim()) ||
          undefined
    const preferredBeatDirection = preferBeatDirection(sourceBeat.beatDirection, beat.beatDirection)
    const sourceDirectionNewer = preferredBeatDirection === sourceBeat.beatDirection
    const resolvedVoiceDirection =
      beat.kind === 'narration'
        ? beat.voiceDirection?.trim() ||
          sourceBeat.voiceDirection?.trim() ||
          (typeof matchedSourceDialogue?.voiceDirection === 'string' &&
            matchedSourceDialogue.voiceDirection.trim()) ||
          undefined
        : (sourceDirectionNewer
            ? sourceBeat.voiceDirection?.trim() || beat.voiceDirection?.trim()
            : beat.voiceDirection?.trim() || sourceBeat.voiceDirection?.trim()) ||
          (typeof matchedSourceDialogue?.voiceDirection === 'string' &&
            matchedSourceDialogue.voiceDirection.trim()) ||
          undefined
    let promoDialogueAudioUrl: string | undefined
    if (promoScene.dialogueAudio && typeof promoScene.dialogueAudio === 'object') {
      const langEntries = Array.isArray(promoScene.dialogueAudio)
        ? [promoScene.dialogueAudio]
        : Object.values(promoScene.dialogueAudio as Record<string, unknown>)
      for (const list of langEntries) {
        if (!Array.isArray(list)) continue
        for (const item of list) {
          if (!item || typeof item !== 'object') continue
          const row = item as Record<string, unknown>
          const rowLineId = typeof row.lineId === 'string' ? row.lineId.trim() : ''
          const rowLine = String(row.line ?? row.text ?? '').trim()
          const targetLine = String(sourceBeat.line ?? beat.line ?? '').trim()
          if (
            (beat.lineId?.trim() && rowLineId === beat.lineId.trim()) ||
            (sourceBeat.lineId?.trim() && rowLineId === sourceBeat.lineId.trim()) ||
            (targetLine && rowLine && rowLine === targetLine)
          ) {
            const url = String(row.audioUrl ?? row.url ?? '').trim()
            if (url) {
              promoDialogueAudioUrl = url
              break
            }
          }
        }
        if (promoDialogueAudioUrl) break
      }
    }
    let sourceDialogueAudioUrl: string | undefined
    if (sourceScene.dialogueAudio && typeof sourceScene.dialogueAudio === 'object') {
      const langEntries = Object.values(sourceScene.dialogueAudio as Record<string, unknown>)
      for (const list of langEntries) {
        if (!Array.isArray(list)) continue
        for (const item of list) {
          if (!item || typeof item !== 'object') continue
          const row = item as Record<string, unknown>
          const rowLineId = typeof row.lineId === 'string' ? row.lineId.trim() : ''
          const rowLine = String(row.line ?? row.text ?? '').trim()
          const targetLine = String(sourceBeat.line ?? beat.line ?? '').trim()
          if (
            (sourceBeat.lineId?.trim() && rowLineId === sourceBeat.lineId.trim()) ||
            (targetLine && rowLine && rowLine === targetLine)
          ) {
            const url = String(row.audioUrl ?? row.url ?? '').trim()
            if (url) {
              sourceDialogueAudioUrl = url
              break
            }
          }
        }
        if (sourceDialogueAudioUrl) break
      }
    }
    const resolvedAudioUrl =
      promoDialogueAudioUrl ||
      beat.audioUrl?.trim() ||
      (beat.kind === 'narration' ? promoNarrationAudioUrl : undefined) ||
      sourceBeat.audioUrl?.trim() ||
      (typeof matchedSourceDialogue?.audioUrl === 'string' &&
        matchedSourceDialogue.audioUrl.trim()) ||
      sourceDialogueAudioUrl ||
      undefined

    const promoStillNewer =
      latestStillCreatedAtMs(beat) > 0 &&
      latestStillCreatedAtMs(beat) > latestStillCreatedAtMs(sourceBeat)
    const srcAny = sourceBeat as Record<string, unknown>
    const beatAny = beat as Record<string, unknown>

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
      sourceSceneNumber,
      ...(sourceShotNumber ? { sourceShotNumber } : {}),
      // Live-share still frames, versions, prompts, direction, and references between source and promo shot:
      storyboardImageUrl: promoStillNewer
        ? beat.storyboardImageUrl || sourceBeat.storyboardImageUrl
        : sourceBeat.storyboardImageUrl || beat.storyboardImageUrl,
      storyboardImageTier: promoStillNewer
        ? beatAny.storyboardImageTier || srcAny.storyboardImageTier
        : srcAny.storyboardImageTier || beatAny.storyboardImageTier,
      storyboardImageGcsPath: promoStillNewer
        ? beatAny.storyboardImageGcsPath || srcAny.storyboardImageGcsPath
        : srcAny.storyboardImageGcsPath || beatAny.storyboardImageGcsPath,
      storyboardImageVersions: promoStillNewer
        ? beatAny.storyboardImageVersions || srcAny.storyboardImageVersions
        : srcAny.storyboardImageVersions || beatAny.storyboardImageVersions,
      storyboardImageVersionId: promoStillNewer
        ? beatAny.storyboardImageVersionId || srcAny.storyboardImageVersionId
        : srcAny.storyboardImageVersionId || beatAny.storyboardImageVersionId,
      storyboardStartImageUrl:
        srcAny.storyboardStartImageUrl || beatAny.storyboardStartImageUrl,
      storyboardStartImageVersions:
        srcAny.storyboardStartImageVersions || beatAny.storyboardStartImageVersions,
      storyboardEndImageUrl:
        sourceBeat.storyboardEndImageUrl || beat.storyboardEndImageUrl,
      storyboardEndImageVersions:
        srcAny.storyboardEndImageVersions || beatAny.storyboardEndImageVersions,
      storyboardImagePrompt: promoStillNewer
        ? beat.storyboardImagePrompt || sourceBeat.storyboardImagePrompt
        : sourceBeat.storyboardImagePrompt || beat.storyboardImagePrompt,
      storyboardEndImagePrompt:
        sourceBeat.storyboardEndImagePrompt || beat.storyboardEndImagePrompt,
      storyboardImagePromptDirectionKey: promoStillNewer
        ? beat.storyboardImagePromptDirectionKey || sourceBeat.storyboardImagePromptDirectionKey
        : sourceBeat.storyboardImagePromptDirectionKey || beat.storyboardImagePromptDirectionKey,
      beatDirection: preferredBeatDirection,
      referenceSelection: sourceBeat.referenceSelection || beat.referenceSelection,
      stillVersions: promoStillNewer
        ? beat.stillVersions || sourceBeat.stillVersions
        : sourceBeat.stillVersions || beat.stillVersions,
      endStillVersions: sourceBeat.endStillVersions || beat.endStillVersions,
      characterIds: sourceBeat.characterIds || beat.characterIds,
      locationId: sourceBeat.locationId || beat.locationId,
      propIds: sourceBeat.propIds || beat.propIds,
      actionDescription:
        sourceBeat.actionDescription || beat.actionDescription,
      line: beat.kind === 'narration' ? beat.line : sourceBeat.line || beat.line,
      character: resolvedCharacter,
      ...(resolvedCharacterId ? { characterId: resolvedCharacterId } : {}),
      ...(resolvedVoiceDirection ? { voiceDirection: resolvedVoiceDirection } : {}),
      ...(resolvedAudioUrl ? { audioUrl: resolvedAudioUrl } : {}),
    }
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

  const ownProd = sceneProductionState?.[promoSceneId]
  let cursor = 0
  const activeHydratedBeats = hydratedBeats.filter((b) => !b.excluded)
  const hydratedSegments: SceneSegment[] = activeHydratedBeats.map((beat, index) => {
    const duration = beat.durationSeconds || 5
    const startTime = cursor
    const endTime = cursor + duration
    cursor = endTime

    const existingPromoSeg =
      ownProd?.segments?.find((s) => s.beatId === beat.beatId) ||
      (ownProd?.segments?.[index] && !ownProd.segments[index].beatId
        ? ownProd.segments[index]
        : undefined)
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

    const mergedTakes = (() => {
      const srcTakes = Array.isArray(sourceSeg?.takes) ? sourceSeg!.takes : []
      const promoTakes = Array.isArray(existingPromoSeg?.takes) ? existingPromoSeg!.takes : []
      if (srcTakes.length === 0) return promoTakes
      if (promoTakes.length === 0) return srcTakes
      const byUrl = new Map<string, (typeof srcTakes)[number]>()
      for (const t of [...srcTakes, ...promoTakes]) {
        const key = t.assetUrl || t.videoUrl || t.id
        if (key && !byUrl.has(key)) byUrl.set(key, t)
      }
      return Array.from(byUrl.values())
    })()

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

    const previousBeat = index > 0 ? activeHydratedBeats[index - 1] : undefined
    const generatedPrompt = resolveSegmentGeneratedPromptForBeat(
      beat,
      previousBeat,
      hydratedSceneDirection as DetailedSceneDirection,
      sourceSeg?.generatedPrompt || existingPromoSeg?.generatedPrompt
    )
    const dialogueMeta = buildSegmentDialogueLinesForBeat(
      beat,
      sourceSeg?.dialogueLines || existingPromoSeg?.dialogueLines
    )

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
      generatedPrompt,
      ...dialogueMeta,
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
      takes: mergedTakes,
      visualFrame: startFrame || undefined,
      action:
        beat.kind === 'narration' && beat.line?.trim()
          ? beat.actionDescription?.trim() &&
            beat.actionDescription.trim() !== 'Promo trailer voice-over'
            ? `${beat.actionDescription.trim()} — Voiceover narration: "${beat.line.trim()}"`
            : `Voiceover narration: "${beat.line.trim()}"`
          : beat.actionDescription,
    } as SceneSegment
  })

  const hydratedLegacy = beatsToLegacyFields(hydratedBeats)
  const existingDialogue = Array.isArray(promoScene.dialogue)
    ? (promoScene.dialogue as Array<Record<string, unknown>>)
    : []
  const syncedDialogue = hydratedLegacy.dialogue.map((derivedLine, idx) => {
    const existingLine =
      (typeof derivedLine.lineId === 'string' &&
        existingDialogue.find((d) => d && d.lineId === derivedLine.lineId)) ||
      existingDialogue[idx]
    const existingChar =
      typeof existingLine?.character === 'string' ? existingLine.character.trim() : ''
    const derivedChar =
      typeof derivedLine.character === 'string' ? derivedLine.character.trim() : ''
    return {
      ...(existingLine || {}),
      ...derivedLine,
      character: derivedChar || existingChar || '',
      characterId: derivedLine.characterId || existingLine?.characterId,
      line: derivedLine.line || existingLine?.line || '',
      lineId: derivedLine.lineId || existingLine?.lineId,
      voiceDirection: derivedLine.voiceDirection || existingLine?.voiceDirection,
      audioUrl: derivedLine.audioUrl || existingLine?.audioUrl,
    }
  })

  const hydratedDialogueAudio: Record<string, Array<Record<string, unknown>>> = (() => {
    const rawMap = promoScene.dialogueAudio
    const base: Record<string, Array<Record<string, unknown>>> = {}
    if (Array.isArray(rawMap)) {
      base.en = rawMap.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'))
    } else if (rawMap && typeof rawMap === 'object') {
      for (const [lang, list] of Object.entries(rawMap as Record<string, unknown>)) {
        if (Array.isArray(list)) {
          base[lang] = list.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'))
        }
      }
    }
    const enList = [...(base.en ?? [])]
    syncedDialogue.forEach((d, idx) => {
      const url = typeof d.audioUrl === 'string' ? d.audioUrl.trim() : ''
      if (!url) return
      const lineId = typeof d.lineId === 'string' ? d.lineId.trim() : ''
      const alreadyPresent = enList.some(
        (entry) =>
          (lineId && entry.lineId === lineId) ||
          entry.dialogueIndex === idx
      )
      if (!alreadyPresent) {
        enList.push({
          character: d.character || '',
          dialogueIndex: idx,
          ...(lineId ? { lineId } : {}),
          ...(d.kind ? { kind: d.kind } : {}),
          ...(d.characterId ? { characterId: d.characterId } : {}),
          audioUrl: url,
          ...(typeof d.duration === 'number' && d.duration > 0 ? { duration: d.duration } : {}),
        })
      }
    })
    if (enList.length > 0) {
      base.en = enList
    }
    return base
  })()

  const hydratedMusicPrompt =
    typeof promoScene.music === 'string' && promoScene.music.trim()
      ? promoScene.music.trim()
      : 'Cinematic promotional trailer score, building tension, emotional swell, memorable theme, no vocals'
  const existingPromoCues = Array.isArray(promoScene.sceneMusicCues)
    ? (promoScene.sceneMusicCues as Array<Record<string, unknown>>)
    : undefined
  const cueTrackUrl = existingPromoCues?.find(
    (c) => c && typeof c.url === 'string' && c.url.trim()
  )?.url as string | undefined
  const hydratedMusicAudio =
    (typeof promoScene.musicAudio === 'string' && promoScene.musicAudio.trim()) ||
    cueTrackUrl ||
    undefined
  const hydratedMusicCues = buildPromoSceneMusicCues({
    beatsCount: hydratedBeats.length,
    musicPrompt: hydratedMusicPrompt,
    musicAudio: hydratedMusicAudio,
    durationSec: typeof promoScene.duration === 'number' ? promoScene.duration : cursor,
    existingCues: promoScene.sceneMusicCues,
  })

  return {
    scene: {
      ...promoScene,
      sceneDirection: hydratedSceneDirection,
      beats: hydratedBeats,
      dialogue: syncedDialogue,
      ...(Object.keys(hydratedDialogueAudio).length > 0
        ? { dialogueAudio: hydratedDialogueAudio }
        : {}),
      music: hydratedMusicPrompt,
      ...(hydratedMusicAudio ? { musicAudio: hydratedMusicAudio } : {}),
      sceneMusicCues: hydratedMusicCues,
      ...(hydratedLegacy.narration && !promoScene.narration
        ? { narration: hydratedLegacy.narration }
        : {}),
    },
    productionData: {
      ...(ownProd || { isSegmented: true, targetDuration: Number(promoScene.duration) || cursor }),
      isSegmented: true,
      segments: hydratedSegments,
    } as SceneProductionData,
  }
}

/**
 * Bidirectionally synchronize shared Promo beats (`sourceSceneIndex`, `sourceBeatId`)
 * with their canonical source scene beats across a `scenes` array.
 *
 * When Stills Agent, Direction Agent, or frame edits run on the Promo scene, this writes
 * updated stills, versions, prompts, and `beatDirection` back to the canonical source scene
 * (e.g. Scene 2 Shot 3), and vice versa, based on newest timestamps.
 */
export function syncPromoSharedBeatsToSourceScenes<T = Record<string, unknown>>(
  scenes: T[]
): T[] {
  if (!Array.isArray(scenes) || scenes.length === 0) return scenes
  const hasPromo = scenes.some((s) => isPromoCinematicScene(s))
  if (!hasPromo) return scenes

  const cloned = scenes.map((s) =>
    s && typeof s === 'object' ? ({ ...(s as Record<string, unknown>) } as Record<string, unknown>) : s
  )

  for (let pIdx = 0; pIdx < cloned.length; pIdx++) {
    const promoScene = cloned[pIdx]
    if (!promoScene || typeof promoScene !== 'object' || !isPromoCinematicScene(promoScene)) {
      continue
    }
    const promoBeats = Array.isArray(promoScene.beats)
      ? ([...(promoScene.beats as PromoSceneBeat[])] as PromoSceneBeat[])
      : ([] as PromoSceneBeat[])
    if (promoBeats.length === 0) continue

    let promoMutated = false
    for (let bIdx = 0; bIdx < promoBeats.length; bIdx++) {
      const promoBeat = promoBeats[bIdx]
      if (
        !promoBeat ||
        typeof promoBeat.sourceSceneIndex !== 'number' ||
        !promoBeat.sourceBeatId
      ) {
        continue
      }
      const srcSceneIdx = promoBeat.sourceSceneIndex
      const srcScene = cloned[srcSceneIdx]
      if (!srcScene || typeof srcScene !== 'object' || isPromoCinematicScene(srcScene)) {
        continue
      }
      const srcBeats = Array.isArray(srcScene.beats)
        ? ([...(srcScene.beats as SceneBeat[])] as SceneBeat[])
        : getSceneBeats(srcScene)
      const srcBeatIdx = srcBeats.findIndex((b) => b.beatId === promoBeat.sourceBeatId)
      if (srcBeatIdx < 0) continue

      const srcBeat = srcBeats[srcBeatIdx]
      const srcTs = latestStillCreatedAtMs(srcBeat)
      const promoTs = latestStillCreatedAtMs(promoBeat)
      const promoStillWins =
        (promoTs > 0 && promoTs > srcTs) ||
        (!srcBeat.storyboardImageUrl && Boolean(promoBeat.storyboardImageUrl))

      const srcAny = srcBeat as Record<string, unknown>
      const promoAny = promoBeat as Record<string, unknown>

      const resolvedImageUrl = promoStillWins
        ? promoBeat.storyboardImageUrl || srcBeat.storyboardImageUrl
        : srcBeat.storyboardImageUrl || promoBeat.storyboardImageUrl
      const resolvedImagePrompt = promoStillWins
        ? promoBeat.storyboardImagePrompt || srcBeat.storyboardImagePrompt
        : srcBeat.storyboardImagePrompt || promoBeat.storyboardImagePrompt
      const resolvedImageTier = promoStillWins
        ? promoAny.storyboardImageTier || srcAny.storyboardImageTier
        : srcAny.storyboardImageTier || promoAny.storyboardImageTier
      const resolvedImageGcsPath = promoStillWins
        ? promoAny.storyboardImageGcsPath || srcAny.storyboardImageGcsPath
        : srcAny.storyboardImageGcsPath || promoAny.storyboardImageGcsPath
      const resolvedImageVersions = promoStillWins
        ? promoAny.storyboardImageVersions || srcAny.storyboardImageVersions
        : srcAny.storyboardImageVersions || promoAny.storyboardImageVersions
      const resolvedImageVersionId = promoStillWins
        ? promoAny.storyboardImageVersionId || srcAny.storyboardImageVersionId
        : srcAny.storyboardImageVersionId || promoAny.storyboardImageVersionId
      const resolvedStillVersions = promoStillWins
        ? promoBeat.stillVersions || srcBeat.stillVersions
        : srcBeat.stillVersions || promoBeat.stillVersions
      const resolvedDirKey = promoStillWins
        ? promoBeat.storyboardImagePromptDirectionKey || srcBeat.storyboardImagePromptDirectionKey
        : srcBeat.storyboardImagePromptDirectionKey || promoBeat.storyboardImagePromptDirectionKey

      const resolvedDirection = preferBeatDirection(srcBeat.beatDirection, promoBeat.beatDirection)
      const promoDirectionWins = resolvedDirection === promoBeat.beatDirection
      const resolvedVoiceDirection =
        promoBeat.kind === 'narration'
          ? srcBeat.voiceDirection
          : promoDirectionWins
            ? promoBeat.voiceDirection || srcBeat.voiceDirection
            : srcBeat.voiceDirection || promoBeat.voiceDirection
      const resolvedEndImageUrl =
        promoBeat.storyboardEndImageUrl || srcBeat.storyboardEndImageUrl
      const resolvedEndImagePrompt =
        promoBeat.storyboardEndImagePrompt || srcBeat.storyboardEndImagePrompt
      const resolvedStartImageUrl =
        promoAny.storyboardStartImageUrl || srcAny.storyboardStartImageUrl

      const sourceSceneNumber =
        typeof srcScene.sceneNumber === 'number' && srcScene.sceneNumber > 0
          ? srcScene.sceneNumber
          : srcSceneIdx + 1
      const sourceShotNumber = srcBeatIdx + 1

      const sharedFields: Record<string, unknown> = {
        ...(resolvedImageUrl ? { storyboardImageUrl: resolvedImageUrl } : {}),
        ...(resolvedImagePrompt ? { storyboardImagePrompt: resolvedImagePrompt } : {}),
        ...(resolvedImageTier ? { storyboardImageTier: resolvedImageTier } : {}),
        ...(resolvedImageGcsPath ? { storyboardImageGcsPath: resolvedImageGcsPath } : {}),
        ...(resolvedImageVersions ? { storyboardImageVersions: resolvedImageVersions } : {}),
        ...(resolvedImageVersionId ? { storyboardImageVersionId: resolvedImageVersionId } : {}),
        ...(resolvedStillVersions ? { stillVersions: resolvedStillVersions } : {}),
        ...(resolvedDirKey ? { storyboardImagePromptDirectionKey: resolvedDirKey } : {}),
        ...(resolvedDirection ? { beatDirection: resolvedDirection } : {}),
        ...(resolvedVoiceDirection ? { voiceDirection: resolvedVoiceDirection } : {}),
        ...(resolvedEndImageUrl ? { storyboardEndImageUrl: resolvedEndImageUrl } : {}),
        ...(resolvedEndImagePrompt ? { storyboardEndImagePrompt: resolvedEndImagePrompt } : {}),
        ...(resolvedStartImageUrl ? { storyboardStartImageUrl: resolvedStartImageUrl } : {}),
      }

      srcBeats[srcBeatIdx] = {
        ...srcBeat,
        ...sharedFields,
      } as SceneBeat
      const firstSrcImage = srcBeats.find((b) => !b.excluded && b.storyboardImageUrl)?.storyboardImageUrl
      cloned[srcSceneIdx] = {
        ...srcScene,
        beats: srcBeats,
        ...(firstSrcImage && !srcScene.imageUrl ? { imageUrl: firstSrcImage } : {}),
      }

      promoBeats[bIdx] = {
        ...promoBeat,
        ...sharedFields,
        sourceSceneNumber,
        sourceShotNumber,
      } as PromoSceneBeat
      promoMutated = true
    }

    if (promoMutated) {
      const firstPromoImage = promoBeats.find((b) => !b.excluded && b.storyboardImageUrl)?.storyboardImageUrl
      cloned[pIdx] = {
        ...promoScene,
        beats: promoBeats,
        ...(firstPromoImage ? { imageUrl: firstPromoImage } : {}),
      }
    }
  }

  return cloned as T[]
}
