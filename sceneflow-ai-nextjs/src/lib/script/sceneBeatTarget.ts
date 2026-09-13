/**
 * Per-scene target beat count for Assistant revisions.
 *
 * `TARGET_BEATS_PER_SCENE` is a script-wide planning figure, and asking every
 * scene for it is what makes an opening title sequence come back with twenty
 * beats of invented business. A scene can now carry its own target, which the
 * revision prompts read instead of the constant.
 *
 * A target, not a cap. `MAX_BEATS_PER_SCENE` is still the absolute ceiling and
 * `enforceMaxBeatsPerScene` still enforces it.
 *
 * Kept free of server and AI imports so the scene editor can seed its control
 * from the same function the route resolves with.
 */

import { isCreditsScene, isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import { MAX_BEATS_PER_SCENE, TARGET_BEATS_PER_SCENE } from '@/lib/script/sceneDecomposition'

/** Scene field holding an author-chosen target. Persisted, unlike `__revisionDepth`. */
export const SCENE_BEAT_TARGET_KEY = 'targetBeatCount'

/**
 * Floor for a chosen target.
 *
 * Below this there is no scene left to revise — a beginning, a turn, and an end
 * is three, and the fourth is the reaction that makes the turn land.
 */
export const MIN_SCENE_BEAT_TARGET = 4

/**
 * Default for a title, promo, or credits scene.
 *
 * These carry a logo, a card, and a couple of establishing images; the story
 * beats they would need to reach twenty do not exist, so the model invents
 * them. `computeTargetBeatCountForScene` already derives 2-4 beats for a
 * title scene with no beats at all, and this keeps a revision in the same
 * single digits rather than jumping to the script-wide figure.
 */
export const CINEMATIC_SCENE_BEAT_TARGET = 6

export interface SceneBeatTargetPreset {
  value: number
  label: string
  hint: string
}

export const SCENE_BEAT_TARGET_PRESETS: SceneBeatTargetPreset[] = [
  { value: CINEMATIC_SCENE_BEAT_TARGET, label: 'Minimal', hint: 'Titles, cards, stingers' },
  { value: 12, label: 'Short', hint: 'A single turn or exchange' },
  { value: TARGET_BEATS_PER_SCENE, label: 'Standard', hint: 'Full dramatic scene' },
  { value: MAX_BEATS_PER_SCENE, label: 'Full', hint: 'Room for every reaction' },
]

/**
 * A usable target, or null when the caller should fall back.
 *
 * Strings are accepted because the value arrives over JSON, but the coercion is
 * deliberately narrow: `Number(null)` and `Number('')` are both 0, which would
 * clamp to the floor and quietly turn a scene with no stored target into a
 * four-beat one.
 */
export function clampSceneBeatTarget(value: unknown): number | null {
  let n: number
  if (typeof value === 'number') {
    n = value
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value)
  } else {
    return null
  }
  if (!Number.isFinite(n)) return null
  return Math.min(MAX_BEATS_PER_SCENE, Math.max(MIN_SCENE_BEAT_TARGET, Math.round(n)))
}

/**
 * The target a revision of this scene should write to.
 *
 * An author's stored choice wins. Failing that, a title or credits scene gets
 * the cinematic default and everything else gets the script-wide target, so an
 * untouched project behaves exactly as before except where 20 was never
 * plausible.
 */
export function resolveSceneTargetBeatCount(scene?: Record<string, unknown> | null): number {
  if (!scene) return TARGET_BEATS_PER_SCENE

  const stored = clampSceneBeatTarget(scene[SCENE_BEAT_TARGET_KEY])
  if (stored !== null) return stored

  if (isTitleOrCinematicScene(scene) || isCreditsScene(scene)) {
    return CINEMATIC_SCENE_BEAT_TARGET
  }

  return TARGET_BEATS_PER_SCENE
}

/** True when the scene carries an explicit author choice rather than a default. */
export function hasStoredSceneBeatTarget(scene?: Record<string, unknown> | null): boolean {
  return scene ? clampSceneBeatTarget(scene[SCENE_BEAT_TARGET_KEY]) !== null : false
}
