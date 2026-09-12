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
  isBeatExcluded,
  reconcileBeatsWithScriptContent,
} from '@/lib/script/beatMigration'
import {
  beatDirectionFingerprint,
  beatStillDirectionFingerprint,
  storedStillDirectionKeyMatches,
} from '@/lib/script/beatDirectionFingerprint'
import { applyDerivedSfxToScene } from '@/lib/script/deriveSfxFromSceneContent'
import { generateSceneContentHash } from '@/lib/utils/contentHash'
import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'
import { syncBeatStillPromptToDirection } from '@/lib/storyboard/syncBeatStillPrompt'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
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
 * A beat whose stored still prompt no longer describes its direction, or which
 * has direction and no prompt at all.
 *
 * Excluded beats are skipped: nothing composes a frame for them, so a prompt
 * they will never render from is not something to offer to refresh.
 */
export function beatHasStalePromptKey(beat: SceneBeat): boolean {
  if (isBeatExcluded(beat)) return false

  const hasDirection = !!beatStillDirectionFingerprint(beat.beatDirection)
  const hasPrompt = !!beat.storyboardImagePrompt?.trim()

  if (!hasPrompt) return hasDirection
  return !storedStillDirectionKeyMatches(
    beat.storyboardImagePromptDirectionKey,
    beat.beatDirection
  )
}

/**
 * True when the scene is carrying beats whose prompts need recomposing.
 *
 * `isPreVisStale` only sees *prose* drift, and only for scenes that already
 * have a stamp — so after the still fingerprint version was bumped, beats read
 * as "Prompt changed" in the frame viewer while the one control that would fix
 * them was hidden. This is the other half of that question.
 */
export function sceneHasStalePromptKeys(scene: Record<string, unknown>): boolean {
  return getSceneBeats(scene).some(beatHasStalePromptKey)
}

/** How many beats a prompts-only refresh would actually touch. */
export function countStalePromptKeys(scene: Record<string, unknown>): number {
  return getSceneBeats(scene).filter(beatHasStalePromptKey).length
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

export interface RefreshStillPromptsResult {
  scene: Record<string, unknown>
  promptsUpdated: number
}

/**
 * Recompose only the beat prompts whose direction key has gone stale.
 *
 * The prompt half of `syncPreVisToScript`, without the rest of it: no images
 * cleared, no audio cleanup, no `segments` drop, no stamp reset. Those are all
 * answers to the script prose having moved, and a beat carrying a prompt from
 * an older composer is not that — charging a user's Director's Console segments
 * for a wording refresh is not a trade they asked for.
 *
 * Leaves `storyboardImageUrl` alone throughout: a refreshed prompt makes the
 * existing frame show as out of sync, which is the user's call to re-render.
 */
export function refreshSceneBeatStillPrompts(
  scene: Record<string, unknown>,
  options: SyncPreVisOptions & { lookbook?: ProjectLookbook } = {}
): RefreshStillPromptsResult {
  const beats = getSceneBeats(scene)
  if (beats.length === 0) return { scene, promptsUpdated: 0 }

  const sceneNumber = options.sceneNumber ?? (Number(scene.sceneNumber) || 1)
  let promptsUpdated = 0

  const nextBeats = beats.map((beat) => {
    if (!beatHasStalePromptKey(beat)) return beat
    const synced = syncBeatStillPromptToDirection(beat, {
      sceneIndex: sceneNumber - 1,
      artStyleAnchor: options.artStyle,
      lookbook: options.lookbook,
      force: true,
    })
    if (
      synced.storyboardImagePrompt !== beat.storyboardImagePrompt ||
      synced.storyboardImagePromptDirectionKey !== beat.storyboardImagePromptDirectionKey
    ) {
      promptsUpdated++
      return synced
    }
    return beat
  })

  if (promptsUpdated === 0) return { scene, promptsUpdated: 0 }
  return { scene: applyBeatsToScene(scene, nextBeats), promptsUpdated }
}

/** Stamp scene after successful pre-vis image generation. */
export function stampPreVisContentHash(scene: Record<string, unknown>): Record<string, unknown> {
  return {
    ...scene,
    [PRE_VIS_CONTENT_HASH_FIELD]: generatePreVisContentHash(scene),
  }
}
