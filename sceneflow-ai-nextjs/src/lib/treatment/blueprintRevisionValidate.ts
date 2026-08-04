/**
 * Client-side guard before a revision overwrites a stored blueprint.
 *
 * A model response cut off mid-beat parses into a beats array holding a title
 * with no synopsis. Applying that replaced a complete beat sheet with a stub,
 * so reject it rather than persisting the loss.
 */

export type BeatsPatchIssue = 'empty' | 'missing_synopsis'

export type BeatsPatchCheck = {
  ok: boolean
  issue?: BeatsPatchIssue
  message?: string
}

const OK: BeatsPatchCheck = { ok: true }

export function checkBeatsPatch(patch: Record<string, unknown> | null | undefined): BeatsPatchCheck {
  if (!patch || !('beats' in patch)) return OK

  const beats = patch.beats
  if (!Array.isArray(beats) || beats.length === 0) {
    return {
      ok: false,
      issue: 'empty',
      message: 'The revision came back with no beats, so it was not applied. Try again.',
    }
  }

  const incomplete = beats.some((beat) => {
    const record = beat && typeof beat === 'object' ? (beat as Record<string, unknown>) : null
    if (!record) return true
    const synopsis = record.synopsis
    return typeof synopsis !== 'string' || synopsis.trim().length === 0
  })

  if (incomplete) {
    return {
      ok: false,
      issue: 'missing_synopsis',
      message:
        'The revision was cut off before every beat was written, so it was not applied. Try again, or narrow the focus.',
    }
  }

  return OK
}
