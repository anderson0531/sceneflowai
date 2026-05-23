/**
 * Shared narration heuristics for Vision script + batch audio.
 * Production UI avoids treating duplicated description text as real VO; batch
 * generation must follow the same rules or it synthesizes "narration" the user
 * never authored as separate voiceover.
 */

import { toCanonicalName } from '@/lib/character/canonical'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
} from '@/lib/script/segmentTypes'

function normalizeForDedup(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

export type SceneLikeForNarration = {
  narration?: unknown
  visualDescription?: unknown
  action?: unknown
  summary?: unknown
}

/**
 * True when `scene.narration` looks like intentional voiceover, not a copy of
 * the scene's visual/action block (a common generator artifact).
 */
export function isLikelyNarration(scene: SceneLikeForNarration): boolean {
  const narration = scene?.narration
  if (narration == null) return false
  const nTrim = String(narration).trim()
  if (!nTrim) return false
  const visual = String(scene.visualDescription || scene.action || scene.summary || '').trim()
  if (!visual) return true
  if (normalizeForDedup(nTrim) === normalizeForDedup(visual)) return false
  return true
}

/**
 * Text to send to TTS for scene narration in batch jobs.
 * Stored translations win; otherwise only narrate when `isLikelyNarration`.
 */
export function getBatchNarrationTtsText(
  scene: SceneLikeForNarration,
  storedNarration?: string | null
): string | null {
  const stored = storedNarration?.trim()
  if (stored) return stored
  if (!scene?.narration || !isLikelyNarration(scene)) return null
  const raw = String(scene.narration).trim()
  return raw.length > 0 ? raw : null
}

/** Scene has a separate narration audio asset (not narrator-as-dialogue only). */
export function hasStandaloneNarrationAudio(
  scene: SceneLikeForNarration & Record<string, unknown>
): boolean {
  if (!scene || typeof scene !== 'object') return false
  const na = scene.narrationAudio
  if (na && typeof na === 'object') {
    for (const k of Object.keys(na as object)) {
      const entry = (na as Record<string, { url?: string; audioUrl?: string }>)[k]
      if (entry && typeof entry === 'object' && (entry.url || entry.audioUrl)) return true
    }
  }
  const a = scene.narrationAudioUrl
  const b = scene.narrationUrl
  if (typeof a === 'string' && a.trim()) return true
  if (typeof b === 'string' && b.trim()) return true
  return false
}

/** True when narrator lines live in `scene.dialogue` (integrated narrator-as-character model). */
export function sceneHasNarratorInDialogue(
  scene: SceneLikeForNarration & Record<string, unknown>
): boolean {
  const dialogueArr = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  return dialogueArr.some((d: unknown) => {
    if (!d || typeof d !== 'object') return false
    const line = d as Record<string, unknown>
    if (line.kind === 'narration') return true
    if (line.characterId === NARRATOR_CHARACTER_ID) return true
    if (
      typeof line.character === 'string' &&
      toCanonicalName(line.character) === toCanonicalName(NARRATOR_CHARACTER)
    ) {
      return true
    }
    return false
  })
}

/**
 * True when a separate `narrationAudio` track should exist / play (not narrator-as-dialogue).
 * Mirrors the generation contract in generateSceneAudio / generate-all-audio.
 */
export function shouldScheduleStandaloneNarration(
  scene: SceneLikeForNarration & Record<string, unknown>,
  storedNarration?: string | null
): boolean {
  if (sceneHasNarratorInDialogue(scene)) return false
  return getBatchNarrationTtsText(scene, storedNarration) !== null
}

/** Resolve standalone narration URL for playback, or undefined when ghost / not intentional. */
export function resolveStandaloneNarrationUrl(
  scene: SceneLikeForNarration & Record<string, unknown>,
  language: string,
  storedNarration?: string | null
): string | undefined {
  if (!shouldScheduleStandaloneNarration(scene, storedNarration)) return undefined

  const narrationAudio = scene.narrationAudio as
    | Record<string, { url?: string; audioUrl?: string }>
    | undefined
  const langEntry = narrationAudio?.[language] ?? narrationAudio?.en
  const fromObject = langEntry?.url || langEntry?.audioUrl
  if (typeof fromObject === 'string' && fromObject.trim()) return fromObject

  const legacy = scene.narrationAudioUrl
  if (typeof legacy === 'string' && legacy.trim()) return legacy

  const legacyUrl = scene.narrationUrl
  if (typeof legacyUrl === 'string' && legacyUrl.trim()) return legacyUrl

  return undefined
}

export type StripGhostNarrationResult = {
  cleanedScene: SceneLikeForNarration & Record<string, unknown>
  deletedUrls: string[]
}

/** Remove orphan standalone narration audio when narration is not intentional. */
export function stripGhostStandaloneNarration(
  scene: SceneLikeForNarration & Record<string, unknown>
): StripGhostNarrationResult {
  const cleanedScene = { ...scene }
  const deletedUrls: string[] = []

  if (!hasStandaloneNarrationAudio(cleanedScene)) {
    return { cleanedScene, deletedUrls }
  }

  if (shouldScheduleStandaloneNarration(cleanedScene)) {
    return { cleanedScene, deletedUrls }
  }

  const na = cleanedScene.narrationAudio
  if (na && typeof na === 'object') {
    for (const langAudio of Object.values(na as Record<string, { url?: string; audioUrl?: string }>)) {
      const url = langAudio?.url || langAudio?.audioUrl
      if (typeof url === 'string' && url.trim()) deletedUrls.push(url)
    }
  }
  if (
    typeof cleanedScene.narrationAudioUrl === 'string' &&
    cleanedScene.narrationAudioUrl.trim() &&
    !deletedUrls.includes(cleanedScene.narrationAudioUrl)
  ) {
    deletedUrls.push(cleanedScene.narrationAudioUrl)
  }
  if (
    typeof cleanedScene.narrationUrl === 'string' &&
    cleanedScene.narrationUrl.trim() &&
    !deletedUrls.includes(cleanedScene.narrationUrl)
  ) {
    deletedUrls.push(cleanedScene.narrationUrl)
  }

  delete cleanedScene.narrationAudio
  delete cleanedScene.narrationAudioUrl
  delete cleanedScene.narrationUrl
  delete cleanedScene.narrationDuration
  delete cleanedScene.narrationAudioDuration
  delete cleanedScene.narrationAudioGeneratedAt

  return { cleanedScene, deletedUrls: [...new Set(deletedUrls)] }
}

export type ResolveNarrationTimelineOptions = {
  narrationText?: string | null
  /**
   * True when the API payload included `narrationText` (even `null`).
   * Prevents falling back to `scene.narration` when the UI means “no separate VO timeline”.
   */
  narrationTextKeyProvided?: boolean
  narrationDriven?: boolean
}

/**
 * Text expanded into generate-segments “combined audio timeline” narration rows (before dialogue lines).
 * Narrator-only dialogue stays on dialogue rows; do not duplicate `scene.narration` unless there is
 * real standalone narration audio or narration-driven mode (unless client overrides via `narrationText`).
 */
export function resolveNarrationTextForAudioTimeline(
  scene: SceneLikeForNarration & Record<string, unknown>,
  options?: ResolveNarrationTimelineOptions
): string {
  if (options?.narrationTextKeyProvided) {
    const t = options.narrationText
    if (t == null) return ''
    return String(t).trim()
  }
  const raw = String(scene?.narration ?? '').trim()
  if (!raw) return ''
  if (options?.narrationDriven) return raw
  if (hasStandaloneNarrationAudio(scene) && shouldScheduleStandaloneNarration(scene)) return raw
  return ''
}
