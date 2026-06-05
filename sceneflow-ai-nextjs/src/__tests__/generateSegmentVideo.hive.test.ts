import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/generation/veoWithKlingFallback', () => ({
  generateVideoWithVeoKlingFallback: vi.fn(),
}))

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  downloadProductionVideo: vi.fn(),
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
      generativeModel: 'veo-3.1',
      gcsMetadata: { 'x-sceneflow-content-hash': 'abc123' },
      sidecar: {},
    })),
    attachAssetUrl: vi.fn(async () => undefined),
    scheduleC2paSigning: vi.fn(async () => undefined),
  },
}))

vi.mock('@/lib/storage/blob', () => ({
  uploadVideoToBlob: vi.fn(async () => 'https://storage.googleapis.com/bucket/video.mp4'),
}))

vi.mock('@/lib/videoUtils', () => ({
  extractAndStoreLastFrame: vi.fn(async () => null),
}))

vi.mock('@/lib/video/serverVideoDuration', () => ({
  getVideoDurationFromBuffer: vi.fn(async () => 5),
}))

vi.mock('@/services/HiveModerationService', () => ({
  HiveModerationService: {
    moderateVideo: vi.fn(),
    isConfigured: vi.fn(() => true),
  },
}))

import { generateSegmentVideoCore } from '@/lib/video/generateSegmentVideo'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import { moderateKlingVideoBuffer } from '@/lib/moderation/klingSafetyGuard'
import { HiveModerationService } from '@/services/HiveModerationService'

describe('generateSegmentVideoCore hive routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Vertex success path never calls Hive or KlingSafetyGuard', async () => {
    vi.mocked(generateVideoWithVeoKlingFallback).mockResolvedValue({
      status: 'COMPLETED',
      videoBuffer: Buffer.from('vertex-video'),
      generationProvider: 'vertex',
      wasPolicyFallback: false,
      vertexAttempts: 1,
    })

    await generateSegmentVideoCore({
      segmentId: 'seg-1',
      projectId: 'proj-1',
      sceneId: 'scene-1',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      prompt: 'A calm landscape',
      genType: 'T2V',
    })

    expect(moderateKlingVideoBuffer).not.toHaveBeenCalled()
    expect(HiveModerationService.moderateVideo).not.toHaveBeenCalled()
  })

  it('Kling fallback path invokes KlingSafetyGuard before upload', async () => {
    vi.mocked(generateVideoWithVeoKlingFallback).mockResolvedValue({
      status: 'COMPLETED',
      videoBuffer: Buffer.from('kling-video'),
      generationProvider: 'fal',
      wasPolicyFallback: true,
      vertexAttempts: 3,
      fallbackModelFamily: 'kling',
    })

    await generateSegmentVideoCore({
      segmentId: 'seg-2',
      projectId: 'proj-1',
      sceneId: 'scene-1',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      prompt: 'Dramatic scene',
      genType: 'T2V',
    })

    expect(moderateKlingVideoBuffer).toHaveBeenCalledTimes(1)
    expect(HiveModerationService.moderateVideo).not.toHaveBeenCalled()
  })
})
