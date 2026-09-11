/**
 * Time budgeting for the scene image route.
 *
 * A 120s function was spending ~54s on its first generate-and-validate pass and
 * then starting a likeness auto-retry against a flat 45s reserve. A real retry —
 * cache-busted prompt, fresh image, second validation — has never fit in 45s, so
 * the retry ran past the wall and Vercel killed the function, losing the
 * perfectly usable first image with it.
 *
 * Every decision here is made against what the first round actually cost, so a
 * slow project reserves more and a fast one reserves less.
 */

/** Floor for the retry reserve: a cheap round 0 usually just had a warm cache. */
export const LIKENESS_RETRY_MIN_RESERVE_MS = 45_000
/** The retry busts the prompt cache, so it costs more than the round it repeats. */
export const LIKENESS_RETRY_COST_MARGIN = 1.25
/** Validation is two image fetches plus a vision call. */
export const LIKENESS_VALIDATION_MIN_RESERVE_MS = 20_000
/** Blob upload and likeness validation still have to run after an image returns. */
export const POST_IMAGE_RESERVE_MS = 25_000
/** Share of the remaining budget the retry's prompt step may take. */
export const RETRY_PROMPT_BUDGET_SHARE = 0.25
/** Below this the prompt step cannot return, so the rules-based optimizer runs. */
export const RETRY_PROMPT_MIN_DEADLINE_MS = 5_000

/** What a likeness retry should be expected to cost, given the round it repeats. */
export function projectLikenessRetryCostMs(round0CostMs: number): number {
  return Math.max(
    LIKENESS_RETRY_MIN_RESERVE_MS,
    Math.round(Math.max(0, round0CostMs) * LIKENESS_RETRY_COST_MARGIN)
  )
}

/** Only start a second round if the budget can hold a whole one. */
export function canStartLikenessRetry(remainingMs: number, round0CostMs: number): boolean {
  return remainingMs >= projectLikenessRetryCostMs(round0CostMs)
}

/** What a likeness validation pass should be expected to cost. */
export function projectLikenessValidationCostMs(round0ValidationMs: number): number {
  return Math.max(
    LIKENESS_VALIDATION_MIN_RESERVE_MS,
    Math.round(Math.max(0, round0ValidationMs) * LIKENESS_RETRY_COST_MARGIN)
  )
}

/**
 * Round 0 always validates — its result is what decides whether to retry at
 * all. A retry's validation is skipped when it would not finish; the retry then
 * scores zero and loses to the measured first round, which is the safe outcome.
 */
export function canValidateLikeness(
  likenessRound: number,
  remainingMs: number,
  round0ValidationMs: number
): boolean {
  if (likenessRound === 0) return true
  return remainingMs >= projectLikenessValidationCostMs(round0ValidationMs)
}

/** Cap the retry's prompt step so it cannot eat the budget for the image. */
export function resolveRetryPromptDeadlineMs(remainingMs: number, maxDeadlineMs: number): number {
  return Math.max(
    RETRY_PROMPT_MIN_DEADLINE_MS,
    Math.min(maxDeadlineMs, Math.round(remainingMs * RETRY_PROMPT_BUDGET_SHARE))
  )
}

/**
 * Absolute cutoff for an image call, leaving room for the upload and the
 * validation that follow it. The image client shortens its own request timeout
 * and stops its retry ladder at this instant.
 */
export function resolveImageDeadlineAt(routeStart: number, routeBudgetMs: number): number {
  return routeStart + routeBudgetMs - POST_IMAGE_RESERVE_MS
}
