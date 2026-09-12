/**
 * Keep a beat's persisted still prompt aligned with still-relevant direction.
 * Does not touch storyboardImageUrl — frame regen stays optional.
 */

import {
  composeBeatActionFraming,
  composePersistedBeatStillPrompt,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import {
  beatStillDirectionFingerprint,
  storedStillDirectionKeyMatches,
} from '@/lib/script/beatDirectionFingerprint'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export interface SyncBeatStillPromptOptions {
  lookbook?: ProjectLookbook
  sceneIndex?: number
  artStyleAnchor?: string
}

/**
 * Recompose `storyboardImagePrompt` when still-relevant direction has moved on.
 * Preserves the current image and stamps `storyboardImageDirectionKey` from the
 * previous prompt key so the frame can show as optional-regen stale.
 */
export function syncBeatStillPromptToDirection(
  beat: SceneBeat,
  options: SyncBeatStillPromptOptions = {}
): SceneBeat {
  if (
    beat.storyboardImagePrompt?.trim() &&
    storedStillDirectionKeyMatches(beat.storyboardImagePromptDirectionKey, beat.beatDirection)
  ) {
    return beat
  }

  const next: SceneBeat = { ...beat }
  if (next.storyboardImageUrl?.trim() && next.storyboardImageDirectionKey === undefined) {
    next.storyboardImageDirectionKey = next.storyboardImagePromptDirectionKey ?? ''
  }

  // Composed without a lookbook too — the style anchor is the only part a
  // lookbook contributes, and a prompt stored as bare prose gets rewritten by
  // the rules optimizer on its way to the image model.
  const composed = composePersistedBeatStillPrompt({
    lookbook: options.lookbook,
    sceneIndex: options.sceneIndex ?? 0,
    beat: next,
    artStyleAnchor: options.artStyleAnchor,
  })
  const prompt = composed ?? composeBeatActionFraming(next)
  if (prompt.trim()) {
    next.storyboardImagePrompt = prompt
  }
  next.storyboardImagePromptDirectionKey = beatStillDirectionFingerprint(next.beatDirection)
  return next
}

/** True when a generated frame no longer matches the current still direction. */
export function isBeatFrameStale(beat: SceneBeat): boolean {
  if (!beat.storyboardImageUrl?.trim()) return false
  const imageKey = beat.storyboardImageDirectionKey ?? beat.storyboardImagePromptDirectionKey
  if (imageKey === undefined) return false
  return !storedStillDirectionKeyMatches(imageKey, beat.beatDirection)
}
