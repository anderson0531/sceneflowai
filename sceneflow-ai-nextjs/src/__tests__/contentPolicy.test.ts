import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  isVertexContentPolicyError,
  getVeoPolicyMaxAttempts,
  isFalKlingFallbackEnabled,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'

describe('contentPolicy', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.FAL_KEY = process.env.FAL_KEY
    envBackup.FAL_KLING_POLICY_FALLBACK_ENABLED = process.env.FAL_KLING_POLICY_FALLBACK_ENABLED
    envBackup.VEO_POLICY_MAX_ATTEMPTS = process.env.VEO_POLICY_MAX_ATTEMPTS
  })

  afterEach(() => {
    process.env.FAL_KEY = envBackup.FAL_KEY
    process.env.FAL_KLING_POLICY_FALLBACK_ENABLED = envBackup.FAL_KLING_POLICY_FALLBACK_ENABLED
    process.env.VEO_POLICY_MAX_ATTEMPTS = envBackup.VEO_POLICY_MAX_ATTEMPTS
  })

  it('detects Vertex RAI messages', () => {
    expect(isVertexContentPolicyError('Content Safety Filter Triggered')).toBe(true)
    expect(isVertexContentPolicyError('rai media filtered')).toBe(true)
    expect(isVertexContentPolicyError('quota exceeded')).toBe(false)
  })

  it('defaults policy max attempts to 3', () => {
    delete process.env.VEO_POLICY_MAX_ATTEMPTS
    expect(getVeoPolicyMaxAttempts()).toBe(3)
  })

  it('enables Fal fallback when FAL_KEY is set', () => {
    process.env.FAL_KEY = 'test-key'
    delete process.env.FAL_KLING_POLICY_FALLBACK_ENABLED
    expect(isFalKlingFallbackEnabled()).toBe(true)
  })

  it('disables Fal fallback when explicitly off', () => {
    process.env.FAL_KEY = 'test-key'
    process.env.FAL_KLING_POLICY_FALLBACK_ENABLED = 'false'
    expect(isFalKlingFallbackEnabled()).toBe(false)
  })

  it('ContentPolicyExhaustedError carries attempt count', () => {
    const err = new ContentPolicyExhaustedError('blocked', 3, 'rai')
    expect(err.attempts).toBe(3)
    expect(err.lastError).toBe('rai')
  })
})
