/**
 * A background analysis can finish after the user has kept editing. Scene
 * numbers and content may no longer match what was scored, so results are
 * flagged rather than silently presented as current.
 */

export type StaleCheckInput = {
  /** scriptUpdatedAt captured when analysis started. */
  baseScriptUpdatedAt?: string | null
  /** scriptUpdatedAt as it stands now. */
  currentScriptUpdatedAt?: string | null
  /** Server-computed flag, set when the job detected drift on write. */
  stale?: boolean
}

function toTime(value?: string | null): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

/**
 * True when the script moved after analysis started.
 *
 * The server flag is trusted when set, since it was computed under a row lock
 * at write time. Otherwise timestamps are compared, which also catches edits
 * made after the review was saved.
 */
export function isReviewStale(input: StaleCheckInput): boolean {
  if (input.stale) return true

  const base = toTime(input.baseScriptUpdatedAt)
  const current = toTime(input.currentScriptUpdatedAt)
  if (base === null || current === null) return false

  return current > base
}

/** Review shape needed for a staleness check, kept loose for stored reviews. */
export type StaleCheckableReview = {
  baseScriptUpdatedAt?: string | null
  stale?: boolean
} | null | undefined

export function isStoredReviewStale(
  review: StaleCheckableReview,
  currentScriptUpdatedAt?: string | null
): boolean {
  if (!review) return false
  return isReviewStale({
    baseScriptUpdatedAt: review.baseScriptUpdatedAt,
    currentScriptUpdatedAt,
    stale: review.stale,
  })
}
