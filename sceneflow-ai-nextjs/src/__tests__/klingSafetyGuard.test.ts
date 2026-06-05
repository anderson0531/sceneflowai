import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  evaluateKlingHiveResult,
  isKlingHiveGuardEnabled,
  KlingSafetyGuardBlockedError,
  moderateKlingVideoBuffer,
} from '@/lib/moderation/klingSafetyGuard'
import type { HiveModerationResult } from '@/services/HiveModerationService'

vi.mock('@/services/HiveModerationService', () => ({
  HiveModerationService: {
    isConfigured: vi.fn(() => true),
    moderateVideo: vi.fn(),
  },
}))

vi.mock('@/lib/storage/gcsAssets', () => ({
  uploadToGCS: vi.fn(async () => ({
    url: 'https://storage.googleapis.com/bucket/staging.mp4',
    gcsPath: 'gs://bucket/staging.mp4',
    publicUrl: 'https://storage.googleapis.com/bucket/staging.mp4',
  })),
  deleteFromGCS: vi.fn(async () => undefined),
}))

vi.mock('@/lib/moderation/userModerationViolations', () => ({
  recordUserModerationViolation: vi.fn(async () => undefined),
}))

import { HiveModerationService } from '@/services/HiveModerationService'
import { recordUserModerationViolation } from '@/lib/moderation/userModerationViolations'

describe('klingSafetyGuard', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.FAL_KEY = process.env.FAL_KEY
    envBackup.KLING_HIVE_GUARD_ENABLED = process.env.KLING_HIVE_GUARD_ENABLED
    process.env.FAL_KEY = 'test-fal-key'
    vi.clearAllMocks()
    vi.mocked(HiveModerationService.isConfigured).mockReturnValue(true)
  })

  afterEach(() => {
    process.env.FAL_KEY = envBackup.FAL_KEY
    process.env.KLING_HIVE_GUARD_ENABLED = envBackup.KLING_HIVE_GUARD_ENABLED
  })

  it('evaluateKlingHiveResult blocks disallowed Hive results', () => {
    const result: HiveModerationResult = {
      allowed: false,
      action: 'blocked',
      flaggedCategories: ['violence'],
      categoryScores: { violence: 0.9 },
      highestScore: 0.9,
      threshold: 0.7,
    }
    const evaluation = evaluateKlingHiveResult(result)
    expect(evaluation.blocked).toBe(true)
    expect(evaluation.categories).toContain('violence')
  })

  it('evaluateKlingHiveResult blocks high likeness scores on Kling path', () => {
    const result: HiveModerationResult = {
      allowed: true,
      action: 'allowed',
      flaggedCategories: [],
      categoryScores: {},
      highestScore: 0.5,
      threshold: 0.7,
      hiveClasses: [{ class: 'likeness_detection', score: 0.9 }],
    }
    const evaluation = evaluateKlingHiveResult(result)
    expect(evaluation.blocked).toBe(true)
    expect(evaluation.categories).toContain('non_consensual_likeness')
  })

  it('isKlingHiveGuardEnabled defaults on when Fal + Hive configured', () => {
    delete process.env.KLING_HIVE_GUARD_ENABLED
    expect(isKlingHiveGuardEnabled()).toBe(true)
  })

  it('moderateKlingVideoBuffer throws and records strike on Hive block', async () => {
    vi.mocked(HiveModerationService.moderateVideo).mockResolvedValue({
      allowed: false,
      action: 'blocked',
      flaggedCategories: ['sexual/minors'],
      categoryScores: {},
      highestScore: 0.95,
      threshold: 0.7,
    })

    await expect(
      moderateKlingVideoBuffer(Buffer.from('fake-video'), {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        projectId: '660e8400-e29b-41d4-a716-446655440000',
        segmentId: 'seg-1',
      })
    ).rejects.toBeInstanceOf(KlingSafetyGuardBlockedError)

    expect(recordUserModerationViolation).toHaveBeenCalled()
  })

  it('moderateKlingVideoBuffer passes clean Hive result', async () => {
    vi.mocked(HiveModerationService.moderateVideo).mockResolvedValue({
      allowed: true,
      action: 'allowed',
      flaggedCategories: [],
      categoryScores: {},
      highestScore: 0.1,
      threshold: 0.7,
      hiveClasses: [],
    })

    await expect(
      moderateKlingVideoBuffer(Buffer.from('fake-video'), {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        projectId: '660e8400-e29b-41d4-a716-446655440000',
        segmentId: 'seg-1',
      })
    ).resolves.toBeUndefined()
  })
})
