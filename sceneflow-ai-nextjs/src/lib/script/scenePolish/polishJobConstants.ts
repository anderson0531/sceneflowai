export const POLISH_PROGRESS_QUEUED = 8
export const POLISH_PROGRESS_ANALYZING = 40
export const POLISH_PROGRESS_PERSISTING = 90
export const POLISH_PROGRESS_DONE = 100

export function polishActivityLabel(
  beatCount: number,
  phase: 'queued' | 'analyzing' | 'saving' = 'analyzing'
): string {
  if (phase === 'queued') return 'Queued'
  if (phase === 'saving') return 'Saving polish results…'
  const n = Math.max(0, beatCount)
  return n === 1
    ? 'Walking 1 beat for continuity…'
    : `Walking ${n} beats for continuity…`
}
