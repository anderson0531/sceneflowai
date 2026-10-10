/**
 * Every shot the promo may use.
 *
 * A still or a clip is a production note. It does not decide whether the shot
 * belongs in the trailer.
 */

import { isPromoCinematicScene } from '@/lib/publish/buildPromoScene'
import {
  resolveBeatSpokenDuration,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { PromoTrailerRole } from '@/types/publishingAssets'

const DEFAULT_CLIP_SEC = 5
const CLIMAX_CLIP_SEC = 6
export const MIN_PROMO_CLIP_SEC = 4
export const MAX_PROMO_CLIP_SEC = 6

export interface PromoShotCatalogProduction {
  segments?: Array<{
    beatId?: string
    activeAssetUrl?: string | null
    startTime?: number
    endTime?: number
    status?: string
  }>
}

export interface PromoShotCatalogInput {
  scenes: unknown[]
  sceneProductionState?: Record<string, PromoShotCatalogProduction | unknown>
  sceneScores?: Record<number, number>
  heroBeatIds?: string[]
}

export interface PromoShotCatalogEntry {
  sceneId: string
  sceneIndex: number
  beatId: string
  beatIndex: number
  heading?: string
  label: string
  beatRole?: string
  beatKind?: string
  direction?: string
  audienceScore?: number
  hero: boolean
  hasStill: boolean
  hasClip: boolean
  frameUrl?: string
  videoUrl?: string
  durationSec: number
  /** Spoken length for a dialogue beat, before the promo clamp. */
  spokenDurationSec?: number
  /** Title, outro, or story. A credit on an outro is not the title card. */
  cinematicType?: string
  /** English on-screen title or credit. */
  overlayText?: string
  blueprintBeatIndex?: number
  /** Opening or character-intro subject. Repeated names are redundant intros. */
  introCharacter?: string
  /** Direct Shot or the shot-direction agent has rewritten this beat. */
  directionOptimized?: boolean
}

export function isPromoHeroBeat(
  sceneIndex: number,
  beatIndex: number,
  beatId: string,
  heroBeatIds: string[] | undefined
): boolean {
  if (!heroBeatIds?.length) return false
  return heroBeatIds.some(
    (id) =>
      id === beatId ||
      id === `${sceneIndex}:${beatIndex}` ||
      id === `${sceneIndex}:${beatId}`
  )
}

export function trailerRoleForBeatRole(beatRole?: string): PromoTrailerRole {
  if (beatRole === 'opening') return 'hook'
  if (beatRole === 'climax') return 'peak'
  if (beatRole === 'title_reveal') return 'button'
  return 'rise'
}

/** True after Direct Shot or the shot-direction agent has saved a rewrite. */
export function isOptimizedShotDirection(direction?: { generatedBy?: string } | null): boolean {
  return direction?.generatedBy === 'user' || direction?.generatedBy === 'director'
}

export function snapPromoClipDuration(opts: {
  beatRole?: string
  beatKind?: string
  beatDuration?: number
  spokenDurationSec?: number
  segmentStart?: number
  segmentEnd?: number
}): number {
  const editorial = snapEditorialClip(opts)
  if (opts.beatKind === 'dialogue') {
    const spoken =
      typeof opts.spokenDurationSec === 'number' && opts.spokenDurationSec > 0
        ? opts.spokenDurationSec
        : undefined
    if (spoken) {
      return Math.min(VEO_DIALOGUE_CLIP_MAX_SEC, Math.max(editorial, Math.round(spoken)))
    }
  }
  return editorial
}

/** Action, title, and credit stay in the 4–6s editorial window. */
function snapEditorialClip(opts: {
  beatRole?: string
  beatDuration?: number
  segmentStart?: number
  segmentEnd?: number
}): number {
  const { beatRole, beatDuration, segmentStart, segmentEnd } = opts
  if (
    typeof segmentStart === 'number' &&
    typeof segmentEnd === 'number' &&
    segmentEnd > segmentStart
  ) {
    return Math.min(MAX_PROMO_CLIP_SEC, Math.max(MIN_PROMO_CLIP_SEC, segmentEnd - segmentStart))
  }
  if (typeof beatDuration === 'number' && beatDuration > 0) {
    return Math.min(MAX_PROMO_CLIP_SEC, Math.max(MIN_PROMO_CLIP_SEC, beatDuration))
  }
  if (beatRole === 'climax' || beatRole === 'title_reveal') return CLIMAX_CLIP_SEC
  return DEFAULT_CLIP_SEC
}

function resolveSceneId(scene: Record<string, unknown>, sceneIndex: number): string {
  return String(scene.id || scene.sceneId || `scene-${sceneIndex}`)
}

function resolveProduction(
  sceneProductionState: PromoShotCatalogInput['sceneProductionState'],
  sceneId: string,
  sceneIndex: number
): PromoShotCatalogProduction | undefined {
  if (!sceneProductionState) return undefined
  const byId = sceneProductionState[sceneId]
  if (byId && typeof byId === 'object') return byId as PromoShotCatalogProduction
  const byIndex = sceneProductionState[`scene-${sceneIndex}`]
  if (byIndex && typeof byIndex === 'object') return byIndex as PromoShotCatalogProduction
  return undefined
}

function findSegmentForBeat(
  production: PromoShotCatalogProduction | undefined,
  beatId: string
) {
  const segments = production?.segments
  if (!Array.isArray(segments)) return undefined
  return segments.find((segment) => segment.beatId === beatId && segment.activeAssetUrl)
}

function primarySceneCharacter(scene: Record<string, unknown>): string | undefined {
  const listed = scene.characters
  if (Array.isArray(listed)) {
    for (const entry of listed) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim()
      if (entry && typeof entry === 'object') {
        const name = (entry as { name?: string }).name?.trim()
        if (name) return name
      }
    }
  }
  const dialogue = scene.dialogue
  if (Array.isArray(dialogue)) {
    for (const line of dialogue) {
      const name = (line as { character?: string } | null)?.character?.trim()
      if (name) return name
    }
  }
  return undefined
}

function introCharacterForBeat(beat: SceneBeat, scene: Record<string, unknown>): string | undefined {
  if (beat.beatRole !== 'opening' && beat.beatRole !== 'character_intro') return undefined
  const named =
    beat.character?.trim() ||
    beat.beatDirection?.castInFrame?.find((name) => name.trim())?.trim()
  return named || primarySceneCharacter(scene)
}

function directionSummary(beat: SceneBeat): string | undefined {
  const direction = beat.beatDirection
  if (!direction) return undefined
  const parts = [
    direction.shotType,
    direction.coveragePurpose,
    direction.cameraMovement,
    direction.emotion,
    direction.frozenMoment,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
  return parts.length > 0 ? parts.join('; ') : undefined
}

/** Keep only the fields the planner reads, so a plan request is not the whole production blob. */
export function slimPromoProductionState(
  state: PromoShotCatalogInput['sceneProductionState']
): PromoShotCatalogInput['sceneProductionState'] {
  if (!state) return undefined
  const slim: NonNullable<PromoShotCatalogInput['sceneProductionState']> = {}
  for (const [sceneId, raw] of Object.entries(state)) {
    if (!raw || typeof raw !== 'object') continue
    const segments = (raw as PromoShotCatalogProduction).segments
    if (!Array.isArray(segments) || segments.length === 0) continue
    slim[sceneId] = {
      segments: segments.map((segment) => ({
        beatId: segment.beatId,
        activeAssetUrl: segment.activeAssetUrl,
        startTime: segment.startTime,
        endTime: segment.endTime,
      })),
    }
  }
  return slim
}

/** Non-excluded shots from every non-promo scene, including scenes that only have prose. */
export function buildPromoShotCatalog(input: PromoShotCatalogInput): PromoShotCatalogEntry[] {
  const catalog: PromoShotCatalogEntry[] = []

  input.scenes.forEach((rawScene, sceneIndex) => {
    const scene = rawScene as Record<string, unknown>
    if (isPromoCinematicScene(scene)) return

    const sceneId = resolveSceneId(scene, sceneIndex)
    const production = resolveProduction(input.sceneProductionState, sceneId, sceneIndex)
    const beats = getSceneBeats(scene)
    const heading = typeof scene.heading === 'string' ? scene.heading : undefined
    const audienceScore = input.sceneScores?.[sceneIndex]

    beats.forEach((beat, beatIndex) => {
      if (isBeatExcluded(beat)) return
      const frameUrl = beat.storyboardImageUrl || beat.storyboardEndImageUrl || undefined
      const segment = findSegmentForBeat(production, beat.beatId)
      const videoUrl = segment?.activeAssetUrl || undefined
      const label =
        beat.line || beat.actionDescription || beat.kind || `Shot ${beatIndex + 1}`
      const spokenDurationSec =
        beat.kind === 'dialogue' ? resolveBeatSpokenDuration(beat, scene) : undefined

      catalog.push({
        sceneId,
        sceneIndex,
        beatId: beat.beatId,
        beatIndex,
        heading,
        label,
        beatRole: beat.beatRole,
        beatKind: beat.kind,
        direction: directionSummary(beat),
        audienceScore,
        hero: isPromoHeroBeat(sceneIndex, beatIndex, beat.beatId, input.heroBeatIds),
        hasStill: Boolean(frameUrl),
        hasClip: Boolean(videoUrl),
        frameUrl,
        videoUrl,
        spokenDurationSec: spokenDurationSec && spokenDurationSec > 0 ? spokenDurationSec : undefined,
        cinematicType: typeof scene.cinematicType === 'string' ? scene.cinematicType : undefined,
        overlayText: beat.overlayText?.trim() || undefined,
        blueprintBeatIndex:
          typeof scene.blueprintBeatIndex === 'number' ? scene.blueprintBeatIndex : undefined,
        introCharacter: introCharacterForBeat(beat, scene),
        directionOptimized: isOptimizedShotDirection(beat.beatDirection),
        durationSec: snapPromoClipDuration({
          beatRole: beat.beatRole,
          beatKind: beat.kind,
          beatDuration: beat.durationSeconds,
          spokenDurationSec,
          segmentStart: segment?.startTime,
          segmentEnd: segment?.endTime,
        }),
      })
    })
  })

  return catalog
}
