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
import { applyDerivedSfxToScene } from '@/lib/script/deriveSfxFromSceneContent'
import { generateSceneContentHash } from '@/lib/utils/contentHash'
import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'
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

/** Hash of script content that drives pre-vis frame prompts. */
export function generatePreVisContentHash(scene: Record<string, unknown>): string {
  const beats = getSceneBeats(scene).map((beat) => beatContentFingerprint(beat))
  return djb2Hash(
    JSON.stringify({
      script: generateSceneContentHash(scene),
      beats,
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

/** True when pre-vis exists but was generated from different script content. */
export function isPreVisStale(scene: Record<string, unknown>): boolean {
  if (!sceneHasPreVisOutput(scene)) return false
  const stored = scene[PRE_VIS_CONTENT_HASH_FIELD]
  if (typeof stored !== 'string' || !stored.trim()) return false
  return stored !== generatePreVisContentHash(scene)
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

  const plans = buildFallbackBeatPlans({
    scene: working,
    beats: beatsForPlanning,
    sceneNumber: options.sceneNumber ?? (Number(scene.sceneNumber) || 1),
    totalScenes: options.totalScenes,
    filmContext: options.filmTitle ? { title: options.filmTitle } : undefined,
    artStyle: options.artStyle,
  })
  working = applyBeatKeyframePlansToScene(working, plans)

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
