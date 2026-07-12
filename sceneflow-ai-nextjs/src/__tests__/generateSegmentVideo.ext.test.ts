import { describe, expect, it, vi, beforeEach } from 'vitest'

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

vi.mock('@/lib/kling/config', () => ({
  isKlingConfigured: vi.fn(() => true),
  getKlingDefaultModel: vi.fn(() => 'kling-v3-omni'),
  resolveKlingQuality: vi.fn(() => 'pro'),
  getKlingAggregatorFallbackModelId: vi.fn(() => 'kling-2.6'),
  isKlingAggregatorFallbackEnabled: vi.fn(() => false),
}))

vi.mock('@/lib/kling/klingWithVeoFallback', () => ({
  generateVideoWithKlingVeoFallback: vi.fn(),
  generateVertexVideoFallbackOnly: vi.fn(),
  KlingVideoAsyncSubmittedError: class extends Error {},
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

vi.mock('@/lib/gemini/geminiStudioVideoClient', () => ({
  isVeoVideoRefValid: vi.fn(() => true),
}))

vi.mock('@/lib/moderation/klingSafetyGuard', () => ({
  moderateKlingVideoBuffer: vi.fn(),
  KlingSafetyGuardBlockedError: class extends Error {},
}))

vi.mock('@/services/AssetProvenanceService', () => ({
  AssetProvenanceService: {
    stampVideoAsset: vi.fn(async () => ({
      provenanceId: 'prov-1',
      contentHash: 'abc123',
      signature: 'sig',
      generativeModel: 'kling-v3-omni',
      gcsMetadata: {},
      sidecar: {},
    })),
    attachAssetUrl: vi.fn(async () => undefined),
    scheduleC2paSigning: vi.fn(async () => undefined),
  },
}))

vi.mock('@/lib/storage/blob', () => ({
  uploadVideoToBlob: vi.fn(async () => 'https://storage.example.com/video.mp4'),
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

import {
  generateSegmentVideoCore,
  SegmentVideoExtRefRequiredError,
} from '@/lib/video/generateSegmentVideo'
import { generateVideoWithKlingVeoFallback } from '@/lib/kling/klingWithVeoFallback'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'

describe('generateSegmentVideoCore Kling EXT downgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STEM_SEPARATION_ENABLED = 'false'

    vi.mocked(generateVideoWithKlingVeoFallback).mockResolvedValue({
      status: 'COMPLETED',
      videoBuffer: Buffer.from('kling-continuation'),
      generationProvider: 'kling',
      wasVeoFallback: false,
      klingAttempts: 1,
      finalMethod: 'I2V',
      klingModel: 'kling-v3-omni',
    })
  })

  it('downgrades EXT to I2V for Kling without throwing when prior last frame exists', async () => {
    await generateSegmentVideoCore({
      segmentId: 'seg-part-2',
      projectId: 'proj-1',
      sceneId: 'scene-1',
      userId: 'user-1',
      prompt: 'Continuation dialogue beat',
      genType: 'I2V',
      generationMethod: 'EXT',
      startFrameUrl: 'https://cdn.example.com/beat-frame.png',
      previousSegmentLastFrameUrl: 'https://cdn.example.com/part-1-last.png',
      videoProvider: 'kling',
    })

    expect(generateVideoWithKlingVeoFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'I2V',
        videoOptions: expect.objectContaining({
          startFrame: 'https://cdn.example.com/part-1-last.png',
        }),
      })
    )
  })

  it('still throws VEO_EXT_REF_REQUIRED for Vertex when no prior Veo ref', async () => {
    await expect(
      generateSegmentVideoCore({
        segmentId: 'seg-part-2',
        projectId: 'proj-1',
        sceneId: 'scene-1',
        userId: 'user-1',
        prompt: 'Continuation dialogue beat',
        genType: 'I2V',
        generationMethod: 'EXT',
        videoProvider: 'vertex',
        requireVeoRefForExt: true,
      })
    ).rejects.toBeInstanceOf(SegmentVideoExtRefRequiredError)

    expect(generateVideoWithKlingVeoFallback).not.toHaveBeenCalled()
    expect(generateVideoWithVeoKlingFallback).not.toHaveBeenCalled()
  })
})
