import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  isVertexContentPolicyError,
  getVeoPolicyMaxAttempts,
  isFalKlingFallbackEnabled,
  getKlingFallbackProvider,
  isVeoPolicyFastFallbackEnabled,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'

describe('contentPolicy', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.FAL_KEY = process.env.FAL_KEY
    envBackup.KLING_API_KEY = process.env.KLING_API_KEY
    envBackup.FAL_KLING_POLICY_FALLBACK_ENABLED = process.env.FAL_KLING_POLICY_FALLBACK_ENABLED
    envBackup.VEO_POLICY_MAX_ATTEMPTS = process.env.VEO_POLICY_MAX_ATTEMPTS
    envBackup.VEO_POLICY_FAST_FALLBACK = process.env.VEO_POLICY_FAST_FALLBACK
  })

  afterEach(() => {
    process.env.FAL_KEY = envBackup.FAL_KEY
    process.env.KLING_API_KEY = envBackup.KLING_API_KEY
    process.env.FAL_KLING_POLICY_FALLBACK_ENABLED = envBackup.FAL_KLING_POLICY_FALLBACK_ENABLED
    process.env.VEO_POLICY_MAX_ATTEMPTS = envBackup.VEO_POLICY_MAX_ATTEMPTS
    process.env.VEO_POLICY_FAST_FALLBACK = envBackup.VEO_POLICY_FAST_FALLBACK
  })

  it('detects Vertex RAI messages', () => {
    expect(isVertexContentPolicyError('Content Safety Filter Triggered')).toBe(true)
    expect(isVertexContentPolicyError('rai media filtered')).toBe(true)
    expect(isVertexContentPolicyError('quota exceeded')).toBe(false)
  })

  it('detects bare safety-blocked errors via isContentBlockedError', () => {
    expect(isVertexContentPolicyError('Request blocked by safety systems')).toBe(true)
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

  it('prefers direct Kling over Fal in getKlingFallbackProvider', () => {
    process.env.KLING_API_KEY = 'api-key-kling-test'
    process.env.FAL_KEY = 'fal-key'
    expect(getKlingFallbackProvider()).toBe('kling')
  })

  it('falls back to Fal when direct Kling is not configured', () => {
    delete process.env.KLING_API_KEY
    process.env.FAL_KEY = 'fal-key'
    expect(getKlingFallbackProvider()).toBe('fal')
  })

  it('returns null when no Kling provider is configured', () => {
    delete process.env.KLING_API_KEY
    delete process.env.FAL_KEY
    expect(getKlingFallbackProvider()).toBeNull()
  })

  it('reads VEO_POLICY_FAST_FALLBACK flag', () => {
    process.env.VEO_POLICY_FAST_FALLBACK = 'true'
    expect(isVeoPolicyFastFallbackEnabled()).toBe(true)
  })

  it('ContentPolicyExhaustedError carries attempt count', () => {
    const err = new ContentPolicyExhaustedError('blocked', 3, 'rai')
    expect(err.attempts).toBe(3)
    expect(err.lastError).toBe('rai')
  })
})
