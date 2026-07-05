import { describe, expect, it, vi, beforeEach } from 'vitest'
import { isAggregatorEnabled } from '@/lib/aggregator/config'

vi.mock('@/config/database', () => ({
  sequelize: { authenticate: vi.fn() },
}))

vi.mock('@/models/AssetProvenanceLog', () => ({
  default: { create: vi.fn() },
}))

vi.mock('@/lib/audio/stemSeparation', () => ({
  separateAudioStemsWithRetry: vi.fn(),
}))

vi.mock('@/lib/audio/stemJobs', () => ({
  computeSourceHash: vi.fn(() => 'hash'),
}))

vi.mock('@/lib/provenance/c2paWorkflow', () => ({
  enqueueC2paSigning: vi.fn(),
}))

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  downloadProductionVideo: vi.fn(),
}))

vi.mock('@/lib/gemini/geminiStudioVideoClient', () => ({
  isVeoVideoRefValid: vi.fn(() => true),
}))

vi.mock('@/lib/aggregator/generateVideoWithAggregator', () => ({
  generateVideoWithAggregator: vi.fn(),
}))

vi.mock('@/lib/generation/veoWithKlingFallback', () => ({
  generateVideoWithVeoKlingFallback: vi.fn(),
}))

vi.mock('@/lib/generation/preflightPromptGuard', () => ({
  neutralizePromptForVeo: vi.fn(async ({ prompt }: { prompt: string }) => ({
    prompt,
    wasRewritten: false,
    riskScore: { level: 'low', triggers: [] },
  })),
}))

vi.mock('@/lib/moderation/klingSafetyGuard', () => ({
  moderateKlingVideoBuffer: vi.fn(),
  KlingSafetyGuardBlockedError: class extends Error {},
}))

vi.mock('@/services/AssetProvenanceService', () => ({
  AssetProvenanceService: {
    stampVideoAsset: vi.fn(async () => ({
      provenanceId: 'p1',
      contentHash: 'hash',
      gcsMetadata: {},
    })),
    attachAssetUrl: vi.fn(),
    scheduleC2paSigning: vi.fn(),
  },
}))

vi.mock('@/lib/storage/blob', () => ({
  uploadVideoToBlob: vi.fn(async () => 'https://blob.example/v.mp4'),
}))

vi.mock('@/lib/storage/gcsAssets', () => ({
  uploadVideo: vi.fn(async () => 'https://storage.googleapis.com/v.mp4'),
}))

vi.mock('@/lib/videoUtils', () => ({
  extractAndStoreLastFrame: vi.fn(async () => null),
}))

vi.mock('@/lib/video/serverVideoDuration', () => ({
  getVideoDurationFromBuffer: vi.fn(async () => 8),
}))

import { generateVideoWithAggregator } from '@/lib/aggregator/generateVideoWithAggregator'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import { neutralizePromptForVeo } from '@/lib/generation/preflightPromptGuard'
import { generateSegmentVideoCore, SegmentVideoAggregatorNotConfiguredError } from '@/lib/video/generateSegmentVideo'

const baseInput = {
  segmentId: 'seg-1',
  projectId: 'proj-1',
  sceneId: 'scene-1',
  userId: 'user-1',
  prompt: 'A calm interview scene.',
  genType: 'T2V' as const,
  generationMethod: 'T2V' as const,
}

describe('generateSegmentVideoCore aggregator routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VIDEO_AGGREGATOR_API_KEY = 'test-key'
    process.env.VIDEO_AGGREGATOR_ENABLED = 'true'
    process.env.STEM_SEPARATION_ENABLED = 'false'

    vi.mocked(generateVideoWithAggregator).mockResolvedValue({
      mode: 'sync',
      videoBuffer: Buffer.from('fake-video'),
      vendor: 'renderful',
      vendorModelId: 'kling/kling-2.6',
      jobId: 'gen-1',
    })

    vi.mocked(generateVideoWithVeoKlingFallback).mockResolvedValue({
      status: 'COMPLETED',
      videoBuffer: Buffer.from('veo-video'),
      generationProvider: 'vertex',
      wasPolicyFallback: false,
      vertexAttempts: 1,
    } as never)
  })

  it('uses aggregator and skips preflight when videoProvider is aggregator', async () => {
    const result = await generateSegmentVideoCore({
      ...baseInput,
      videoProvider: 'aggregator',
      videoModel: 'kling-2.6',
    })

    expect(generateVideoWithAggregator).toHaveBeenCalledTimes(1)
    expect(neutralizePromptForVeo).not.toHaveBeenCalled()
    expect(generateVideoWithVeoKlingFallback).not.toHaveBeenCalled()
    expect(result.generationProvider).toBe('aggregator')
    expect(result.videoModel).toBe('kling-2.6')
  })

  it('uses Vertex path when videoProvider is vertex', async () => {
    await generateSegmentVideoCore({
      ...baseInput,
      videoProvider: 'vertex',
    })

    expect(generateVideoWithVeoKlingFallback).toHaveBeenCalledTimes(1)
    expect(generateVideoWithAggregator).not.toHaveBeenCalled()
    expect(neutralizePromptForVeo).toHaveBeenCalled()
  })

  it('throws instead of falling back to Vertex when aggregator requested without API key', async () => {
    process.env.VIDEO_AGGREGATOR_API_KEY = ''

    await expect(
      generateSegmentVideoCore({
        ...baseInput,
        videoProvider: 'aggregator',
        videoModel: 'kling-2.6',
      })
    ).rejects.toBeInstanceOf(SegmentVideoAggregatorNotConfiguredError)

    expect(generateVideoWithAggregator).not.toHaveBeenCalled()
    expect(generateVideoWithVeoKlingFallback).not.toHaveBeenCalled()
    expect(neutralizePromptForVeo).not.toHaveBeenCalled()
  })

  it('isAggregatorEnabled respects API key', () => {
    expect(isAggregatorEnabled()).toBe(true)
    process.env.VIDEO_AGGREGATOR_API_KEY = ''
    expect(isAggregatorEnabled()).toBe(false)
  })
})
