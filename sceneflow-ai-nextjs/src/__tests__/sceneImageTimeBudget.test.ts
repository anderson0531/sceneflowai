import { describe, it, expect } from 'vitest'
import {
  LIKENESS_RETRY_MIN_RESERVE_MS,
  LIKENESS_VALIDATION_MIN_RESERVE_MS,
  POST_IMAGE_RESERVE_MS,
  canStartLikenessRetry,
  canValidateLikeness,
  projectLikenessRetryCostMs,
  projectLikenessValidationCostMs,
  resolveImageDeadlineAt,
  resolveRetryPromptDeadlineMs,
} from '@/lib/scene/sceneImageTimeBudget'

const ROUTE_BUDGET_MS = 300_000 - 20_000

describe('projectLikenessRetryCostMs', () => {
  it('projects a retry as costing more than the round it repeats', () => {
    expect(projectLikenessRetryCostMs(60_000)).toBe(75_000)
  })

  it('never projects below the floor, however cheap the first round looked', () => {
    expect(projectLikenessRetryCostMs(4_000)).toBe(LIKENESS_RETRY_MIN_RESERVE_MS)
    expect(projectLikenessRetryCostMs(0)).toBe(LIKENESS_RETRY_MIN_RESERVE_MS)
  })
})

describe('canStartLikenessRetry', () => {
  // The production timeout: a 120s function, 100s budget, 45s flat reserve. The
  // first round took 53.9s, cleared the 55s gate, and the retry then ran ~66s.
  const round0CostMs = 53_900

  it('would have refused the retry that killed the 120s function', () => {
    const oldBudgetMs = 100_000
    expect(canStartLikenessRetry(oldBudgetMs - round0CostMs, round0CostMs)).toBe(false)
  })

  it('allows the same retry once the route has a 300s ceiling', () => {
    expect(canStartLikenessRetry(ROUTE_BUDGET_MS - round0CostMs, round0CostMs)).toBe(true)
  })

  it('refuses a retry of a slow round that would not fit', () => {
    const slowRoundMs = 150_000
    expect(canStartLikenessRetry(ROUTE_BUDGET_MS - slowRoundMs, slowRoundMs)).toBe(false)
  })

  it('refuses once the budget is spent', () => {
    expect(canStartLikenessRetry(0, 30_000)).toBe(false)
    expect(canStartLikenessRetry(-5_000, 30_000)).toBe(false)
  })
})

describe('canValidateLikeness', () => {
  it('always validates the first round, whose score decides the retry', () => {
    expect(canValidateLikeness(0, 1_000, 40_000)).toBe(true)
  })

  it('skips the retry validation when it would not finish', () => {
    expect(canValidateLikeness(1, 10_000, 30_000)).toBe(false)
  })

  it('validates the retry when there is room for it', () => {
    expect(canValidateLikeness(1, 60_000, 30_000)).toBe(true)
  })

  it('holds a floor for validation even when round 0 validated instantly', () => {
    expect(projectLikenessValidationCostMs(0)).toBe(LIKENESS_VALIDATION_MIN_RESERVE_MS)
    expect(canValidateLikeness(1, 15_000, 0)).toBe(false)
  })
})

describe('resolveRetryPromptDeadlineMs', () => {
  it('caps the prompt step at the normal deadline when time is plentiful', () => {
    expect(resolveRetryPromptDeadlineMs(200_000, 35_000)).toBe(35_000)
  })

  it('gives the prompt step a quarter of a tight remaining budget', () => {
    expect(resolveRetryPromptDeadlineMs(80_000, 35_000)).toBe(20_000)
  })

  it('never returns a deadline too short to be worth waiting on', () => {
    expect(resolveRetryPromptDeadlineMs(4_000, 35_000)).toBe(5_000)
    expect(resolveRetryPromptDeadlineMs(-1_000, 35_000)).toBe(5_000)
  })
})

describe('resolveImageDeadlineAt', () => {
  it('stops the image call early enough for the upload and validation after it', () => {
    const routeStart = 1_000_000
    expect(resolveImageDeadlineAt(routeStart, ROUTE_BUDGET_MS)).toBe(
      routeStart + ROUTE_BUDGET_MS - POST_IMAGE_RESERVE_MS
    )
  })
})
