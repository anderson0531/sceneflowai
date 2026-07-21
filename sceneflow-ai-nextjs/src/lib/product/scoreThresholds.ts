/**
 * Shared score thresholds for Audience Resonance and related UI.
 * ≥80 emerald (ready), ≥60 amber (needs work), else red.
 */

export const SCORE_READY_THRESHOLD = 80
export const SCORE_WARNING_THRESHOLD = 60

export type ScoreTier = 'ready' | 'warning' | 'critical'

export function getScoreTier(score: number): ScoreTier {
  if (score >= SCORE_READY_THRESHOLD) return 'ready'
  if (score >= SCORE_WARNING_THRESHOLD) return 'warning'
  return 'critical'
}

export const scoreTierStyles: Record<
  ScoreTier,
  { chip: string; text: string; bar: string }
> = {
  ready: {
    chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  warning: {
    chip: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
  },
  critical: {
    chip: 'border-red-500/35 bg-red-500/10 text-red-200',
    text: 'text-red-400',
    bar: 'bg-red-500',
  },
}

export function getScoreChipClassName(score: number): string {
  return scoreTierStyles[getScoreTier(score)].chip
}

export function getScoreTextClassName(score: number): string {
  return scoreTierStyles[getScoreTier(score)].text
}
