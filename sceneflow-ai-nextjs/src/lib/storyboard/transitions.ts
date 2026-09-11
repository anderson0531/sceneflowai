/**
 * Translating authored transitions into effects the animatic can actually play.
 *
 * `BeatDirection.transition` and the scene-level `transitionToNext` are
 * editorial vocabulary — five names a writer recognises. Playback and the
 * ffmpeg renderer between them know three things: hold the cut, cross-dissolve,
 * or go through black. Doing that translation in one place is what keeps the
 * Screening Room and the exported MP4 showing the same film.
 */

import type { BeatDirectionTransition } from '@/lib/script/segmentTypes'

/** What a join between two frames actually does on screen. */
export type PlayableTransition = 'cut' | 'dissolve' | 'fade'

/** Fade-to-black duration between scenes in playback and animatic export. */
export const SCENE_FADE_TO_BLACK_SEC = 1

/** Cross-dissolve length at a beat-to-beat join. */
export const BEAT_DISSOLVE_SEC = 0.5

/** Fade-through-black length at a beat-to-beat join, per half. */
export const BEAT_FADE_SEC = 0.5

/**
 * Most of a beat that its outgoing transition may occupy.
 *
 * A four-second beat can afford half a second of dissolve; a one-second one
 * cannot, and would otherwise spend its whole life mid-fade with no moment
 * where the frame simply reads.
 */
const MAX_TRANSITION_FRACTION = 0.3

/** Below this a transition is imperceptible and costs a render pass. */
const MIN_TRANSITION_SEC = 0.1

export interface ResolvedTransition {
  effect: PlayableTransition
  /** Seconds the effect runs for. Always 0 for a cut. */
  durationSec: number
}

export const HARD_CUT: ResolvedTransition = { effect: 'cut', durationSec: 0 }

/**
 * Map an authored transition name onto the effect that plays.
 *
 * `MATCH_CUT` is a cut whose two frames rhyme, and `CONTINUE` instructs the
 * image model to shoot this frame straight out of the previous one. Both are
 * notes about the *frames*; neither asks the join between them to do anything,
 * so both play as a hard cut.
 */
export function resolveTransitionEffect(
  transition: BeatDirectionTransition | string | null | undefined
): PlayableTransition {
  switch (transition) {
    case 'DISSOLVE':
      return 'dissolve'
    case 'FADE':
      return 'fade'
    default:
      return 'cut'
  }
}

/** Clamp an effect's nominal length to what the outgoing frame can spare. */
function fitToFrame(
  effect: PlayableTransition,
  nominalSec: number,
  frameDurationSec: number | undefined
): ResolvedTransition {
  if (effect === 'cut') return HARD_CUT
  const available =
    typeof frameDurationSec === 'number' && frameDurationSec > 0
      ? frameDurationSec * MAX_TRANSITION_FRACTION
      : nominalSec
  const durationSec = Math.min(nominalSec, available)
  if (durationSec < MIN_TRANSITION_SEC) return HARD_CUT
  return { effect, durationSec }
}

/**
 * The transition out of one beat and into the next one in the same scene.
 *
 * Unset means a cut, which is what every beat has done until now.
 */
export function resolveBeatTransition(
  transition: BeatDirectionTransition | string | null | undefined,
  frameDurationSec?: number
): ResolvedTransition {
  const effect = resolveTransitionEffect(transition)
  return fitToFrame(
    effect,
    effect === 'dissolve' ? BEAT_DISSOLVE_SEC : BEAT_FADE_SEC,
    frameDurationSec
  )
}

/**
 * The transition out of one scene and into the next.
 *
 * Unset means a fade through black: every scene boundary has faded since the
 * animatic existed, and a scene that never opted into anything should keep
 * playing the way its author last saw it.
 */
export function resolveSceneTransition(
  transition: BeatDirectionTransition | string | null | undefined
): ResolvedTransition {
  if (transition === null || transition === undefined || transition === '') {
    return { effect: 'fade', durationSec: SCENE_FADE_TO_BLACK_SEC }
  }
  const effect = resolveTransitionEffect(transition)
  if (effect === 'cut') return HARD_CUT
  return { effect, durationSec: SCENE_FADE_TO_BLACK_SEC }
}

/**
 * Extra running time a frame needs so its outgoing transition has room.
 *
 * A fade through black has to hold the black, so the scene genuinely runs
 * longer. A dissolve overlaps the next frame instead of following it and adds
 * nothing, and a cut is instantaneous.
 */
export function transitionTailSec(resolved: ResolvedTransition): number {
  return resolved.effect === 'fade' ? resolved.durationSec : 0
}
