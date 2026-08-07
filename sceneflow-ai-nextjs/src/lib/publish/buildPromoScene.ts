/**
 * Build / upsert a cinematic promo scene from a trailer beat plan.
 */

import { mintBeatId } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { PromoTrailerBeatPlan } from '@/types/publishingAssets'
import type { SceneSegment, SceneProductionData } from '@/components/vision/scene-production/types'

export const PROMO_SCENE_CINEMATIC_TYPE = 'promo' as const
export const PROMO_SCENE_HEADING = 'PROMO TRAILER'

export interface PromoSceneBeat extends SceneBeat {
  sourceSceneId?: string
  sourceBeatId?: string
  sourceSceneIndex?: number
  /** Copied production clip URL for trailer stitch / seeded segments. */
  promoVideoUrl?: string
}

export interface PromoSceneRecord {
  id: string
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
  return heading.includes('PROMO TRAILER')
}

export function findPromoSceneIndex(scenes: unknown[]): number {
  return scenes.findIndex((s) => isPromoCinematicScene(s))
}

export function filterOutPromoScenes<T>(scenes: T[]): T[] {
  return scenes.filter((s) => !isPromoCinematicScene(s))
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
    return {
      beatId: mintBeatId(),
      sequenceIndex: narrationLine ? index + 1 : index,
      kind: plan.beatKind === 'dialogue' ? 'dialogue' : 'action',
      actionDescription: plan.label || `Promo moment ${index + 1}`,
      beatRole: plan.beatRole || 'progression',
      storyboardImageUrl: plan.frameUrl,
      durationSeconds: durationSec,
      musicEnabled: true,
      sourceSceneId: plan.sceneId,
      sourceBeatId: plan.beatId,
      sourceSceneIndex: plan.sceneIndex,
      promoVideoUrl: plan.videoUrl,
    }
  })

  if (narrationLine?.trim()) {
    beats.unshift({
      beatId: mintBeatId(),
      sequenceIndex: 0,
      kind: 'narration',
      character: 'NARRATOR',
      characterId: 'narrator',
      line: narrationLine.trim(),
      actionDescription: 'Promo trailer voice-over',
      beatRole: 'opening',
      durationSeconds: Math.min(12, Math.max(6, narrationLine.trim().split(/\s+/).length * 0.35)),
      musicEnabled: true,
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
    typeof input.existingPromoScene?.id === 'string'
      ? input.existingPromoScene.id
      : typeof input.existingPromoScene?.sceneId === 'string'
        ? String(input.existingPromoScene.sceneId)
        : `promo-${Date.now()}`

  const title = input.projectTitle?.trim() || 'Untitled'
  const beats = buildPromoBeats(input.beatPlan, input.narrationLine)
  const scene: PromoSceneRecord = {
    id: existingId,
    sceneNumber: 9999,
    heading: PROMO_SCENE_HEADING,
    location: 'PROMO TRAILER',
    timeOfDay: 'DAY',
    interior: true,
    action: `[PROMO TRAILER — ${input.targetDurationSec}s]\nCaptivating highlights for ${title}.`,
    dialogue: [],
    characters: [],
    duration: input.targetDurationSec,
    cinematicType: PROMO_SCENE_CINEMATIC_TYPE,
    beats,
    promoBeatPlan: input.beatPlan,
    music:
      typeof input.existingPromoScene?.music === 'string'
        ? input.existingPromoScene.music
        : `Cinematic promotional trailer score for "${title}", building tension, emotional swell, memorable theme, no vocals`,
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

/** Upsert promo scene at end of script scene list (after outro/credits). */
export function upsertPromoSceneInScenes(
  scenes: unknown[],
  promoScene: PromoSceneRecord
): unknown[] {
  const next = [...scenes]
  const existingIdx = findPromoSceneIndex(next)
  const sceneWithNumber = {
    ...promoScene,
    sceneNumber: existingIdx >= 0 ? existingIdx + 1 : next.length + 1,
  }
  if (existingIdx >= 0) {
    next[existingIdx] = sceneWithNumber
    return next
  }
  next.push(sceneWithNumber)
  return next
}
