/**
 * A shot needs its own sound effect only when direction tagged a distinct cue.
 * Everything else is carried by the score.
 */
export function beatRequiresDistinctSfx(beat: {
  beatDirection?: { audioCue?: string | null } | null
}): boolean {
  return !!beat.beatDirection?.audioCue?.trim()
}

export function distinctSfxCue(beat: {
  beatDirection?: { audioCue?: string | null } | null
}): string {
  return beat.beatDirection?.audioCue?.trim() ?? ''
}
