import { describe, it, expect } from 'vitest'
import {
  getProjectCreditsUsed,
  getProjectCreditsBudget,
  isProjectIdRef,
  resolveProjectIdFromCharge,
} from '@/lib/credits/projectBudgetShared'

describe('projectBudget', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000'

  it('reads creditsUsed with creationHub fallback', () => {
    expect(getProjectCreditsUsed({ creditsUsed: 120 })).toBe(120)
    expect(
      getProjectCreditsUsed({
        creationHub: { metrics: { creditsUsed: 80 } },
      })
    ).toBe(80)
    expect(getProjectCreditsUsed(undefined)).toBe(0)
  })

  it('reads creditsBudget from metadata', () => {
    expect(getProjectCreditsBudget({ creditsBudget: 500 })).toBe(500)
    expect(getProjectCreditsBudget({})).toBe(0)
  })

  it('detects project UUID refs', () => {
    expect(isProjectIdRef(projectId)).toBe(true)
    expect(isProjectIdRef('segment-123')).toBe(false)
  })

  it('resolves project id from charge ref/meta', () => {
    expect(resolveProjectIdFromCharge(projectId, null)).toBe(projectId)
    expect(resolveProjectIdFromCharge('segment-1', { projectId })).toBe(projectId)
    expect(resolveProjectIdFromCharge('segment-1', null)).toBeUndefined()
  })
})
