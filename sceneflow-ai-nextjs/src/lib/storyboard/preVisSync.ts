/**
 * Pre-vis sync: detect script drift and refresh frame prompts / enable Express.
 */

import { cleanupStaleAudio } from '@/lib/audio/cleanupAudio'
import {
  applyBeatKeyframePlansToScene,
  buildFallbackBeatPlans,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  applyBeatsToScene,
  beatContentFingerprint,
  getSceneBeats,
  reconcileBeatsWithScriptContent,
} from '@/lib/script/beatMigration'
import { beatDirectionFingerprint } from '@/lib/script/beatDirectionFingerprint'
import { applyDerivedSfxToScene } from '@/lib/script/deriveSfxFromSceneContent'
import { generateSceneContentHash } from '@/lib/utils/contentHash'
import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export const PRE_VIS_CONTENT_HASH_FIELD = 'preVisBasedOnContentHash'

function djb2Hash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function hashPreVisPayload(scene: Record<string, unknown>, beats: string[]): string {
  return djb2Hash(
    JSON.stringify({
      script: generateSceneContentHash(scene),
      beats,
    })
  )
}

/** Hash of script prose that drives pre-vis frame prompts (direction excluded). */
export function generatePreVisContentHash(scene: Record<string, unknown>): string {
  return hashPreVisPayload(
    scene,
    getSceneBeats(scene).map((beat) => beatContentFingerprint(beat))
  )
}

/** Pre-deploy hash that mixed beat direction into the stamp. */
export function generateLegacyPreVisContentHash(scene: Record<string, unknown>): string {
  return hashPreVisPayload(
    scene,
    getSceneBeats(scene).map((beat) => {
      const directionFingerprint = beatDirectionFingerprint(beat.beatDirection)
      const directionSuffix = directionFingerprint ? `||direction:${directionFingerprint}` : ''
      return `${beatContentFingerprint(beat)}${directionSuffix}`
    })
  )
}

export function sceneHasPreVisOutput(scene: Record<string, unknown>): boolean {
  if (isValidStoryboardMediaUrl(scene.imageUrl)) return true
  if (typeof scene.imagePrompt === 'string' && scene.imagePrompt.trim()) return true

  const beats = getSceneBeats(scene)
  return beats.some(
    (beat) =>
      isValidStoryboardMediaUrl(beat.storyboardImageUrl) ||
      !!(beat.storyboardImagePrompt && beat.storyboardImagePrompt.trim())
  )
}

/** True when pre-vis exists but was generated from different script prose. */
export function isPreVisStale(scene: Record<string, unknown>): boolean {
  if (!sceneHasPreVisOutput(scene)) return false
  const stored = scene[PRE_VIS_CONTENT_HASH_FIELD]
  if (typeof stored !== 'string' || !stored.trim()) return false
  if (stored === generatePreVisContentHash(scene)) return false
  // Existing stamps included beat direction. Matching that hash means the
  // script prose has not drifted — do not force Update Frames.
  return stored !== generateLegacyPreVisContentHash(scene)
}

/**
 * After a direction-only edit, rewrite the stamp to the prose-only hash so
 * later direction edits stay off the Update Frames path. Leaves a truly
 * script-stale hash alone.
 */
export function restampPreVisHashIfScriptCurrent(
  previousScene: Record<string, unknown>,
  nextScene: Record<string, unknown>
): Record<string, unknown> {
  const stored = previousScene[PRE_VIS_CONTENT_HASH_FIELD]
  if (typeof stored !== 'string' || !stored.trim()) return nextScene
  if (isPreVisStale(previousScene)) return nextScene
  return stampPreVisContentHash(nextScene)
}

export interface SyncPreVisOptions {
  sceneNumber?: number
  totalScenes?: number
  filmTitle?: string
  artStyle?: string
}

export interface SyncPreVisResult {
  scene: Record<string, unknown>
  promptsUpdated: number
  imagesCleared: number
  audioCleared: boolean
}

function beatContentChanged(
  beat: SceneBeat,
  priorFingerprints: Map<string, string>,
  newFingerprints: Map<string, string>
): boolean {
  const prior = priorFingerprints.get(beat.beatId)
  const next = newFingerprints.get(beat.beatId)
  if (prior === undefined || next === undefined) return true
  return prior !== next
}

function clearBeatStoryboardMedia(beat: SceneBeat): SceneBeat {
  const next = { ...beat }
  delete next.storyboardImageUrl
  delete next.storyboardImageGcsPath
  return next
}

/**
 * Intentional sync: reconcile beats, refresh prompts, clear stale images/audio.
 * Does not set preVisBasedOnContentHash — Express does that after regeneration.
 */
export function syncPreVisToScript(
  scene: Record<string, unknown>,
  options: SyncPreVisOptions = {}
): SyncPreVisResult {
  const { beats, priorFingerprints, newFingerprints } = reconcileBeatsWithScriptContent(scene)
  let working = applyBeatsToScene(scene, beats)
  const beatsForPlanning = getSceneBeats(working)

  const sceneNumber = options.sceneNumber ?? (Number(scene.sceneNumber) || 1)
  const plans = buildFallbackBeatPlans({
    scene: working,
    beats: beatsForPlanning,
    sceneNumber,
    totalScenes: options.totalScenes,
    filmContext: options.filmTitle ? { title: options.filmTitle } : undefined,
    artStyle: options.artStyle,
  })
  // Planning fills direction gaps from the edited script; recomposing turns
  // that into the prompts this sync exists to refresh. Forced, because a script
  // edit moves the beat's prose without moving the direction the stored prompt
  // is keyed to.
  working = applyBeatKeyframePlansToScene(working, plans)
  working = applyBeatsToScene(
    working,
    getSceneBeats(working).map((beat) =>
      syncBeatStillPromptToDirection(beat, {
        sceneIndex: sceneNumber - 1,
        artStyleAnchor: options.artStyle,
        force: true,
      })
    )
  )

  let imagesCleared = 0
  const updatedBeats = getSceneBeats(working).map((beat) => {
    if (!beatContentChanged(beat, priorFingerprints, newFingerprints)) {
      return beat
    }
    if (isValidStoryboardMediaUrl(beat.storyboardImageUrl)) {
      imagesCleared++
    }
    return clearBeatStoryboardMedia(beat)
  })
  working = applyBeatsToScene(working, updatedBeats)

  const priorAction = String(scene.action ?? scene.visualDescription ?? '').trim()
  const nextAction = String(working.action ?? working.visualDescription ?? '').trim()
  if (priorAction !== nextAction || !priorFingerprints.size) {
    if (isValidStoryboardMediaUrl(working.imageUrl)) imagesCleared++
    delete working.imageUrl
    delete working.imageGcsPath
    delete working.imagePrompt
    delete working.imageGeneratedAt
  }

  const { cleanedScene, deletedUrls } = cleanupStaleAudio(scene, working)
  working = cleanedScene

  if (Array.isArray(working.segments)) {
    delete working.segments
  }

  delete working[PRE_VIS_CONTENT_HASH_FIELD]
  working = applyDerivedSfxToScene(working, getSceneBeats(working))
  working = {
    ...working,
    storyboardStatus: 'pending_review',
    preVisSyncedAt: new Date().toISOString(),
  }

  return {
    scene: working,
    promptsUpdated: plans.length,
    imagesCleared,
    audioCleared: deletedUrls.length > 0,
  }
}

/** Stamp scene after successful pre-vis image generation. */
export function stampPreVisContentHash(scene: Record<string, unknown>): Record<string, unknown> {
  return {
    ...scene,
    [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash(scene),
  }
}
