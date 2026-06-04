import { describe, expect, it } from 'vitest'
import {
  isVertexContentPolicyError,
  getVeoPolicyMaxAttempts,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'

describe('contentPolicy', () => {
  it('detects Vertex RAI messages', () => {
    expect(isVertexContentPolicyError('Content Safety Filter Triggered')).toBe(true)
    expect(isVertexContentPolicyError('rai media filtered')).toBe(true)
    expect(isVertexContentPolicyError('quota exceeded')).toBe(false)
  })

  it('defaults policy max attempts to 3', () => {
    const prev = process.env.VEO_POLICY_MAX_ATTEMPTS
    delete process.env.VEO_POLICY_MAX_ATTEMPTS
    expect(getVeoPolicyMaxAttempts()).toBe(3)
    process.env.VEO_POLICY_MAX_ATTEMPTS = prev
  })

  it('ContentPolicyExhaustedError carries attempt count', () => {
    const err = new ContentPolicyExhaustedError('blocked', 3, 'rai')
    expect(err.attempts).toBe(3)
    expect(err.lastError).toBe('rai')
  })
})
