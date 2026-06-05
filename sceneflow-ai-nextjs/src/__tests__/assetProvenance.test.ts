import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AssetProvenanceService } from '@/services/AssetProvenanceService'

vi.mock('@/models/AssetProvenanceLog', () => ({
  default: {
    create: vi.fn(async (data: Record<string, unknown>) => ({
      id: 'prov-123',
      ...data,
    })),
    update: vi.fn(async () => undefined),
  },
}))

vi.mock('@/lib/provenance/c2paWorkflow', () => ({
  enqueueC2paSigning: vi.fn(async () => undefined),
}))

describe('AssetProvenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.C2PA_SIGNING_ENABLED = 'false'
  })

  it('computes deterministic SHA-256 hash of video bytes', () => {
    const buf = Buffer.from('test-video-bytes')
    const hash1 = AssetProvenanceService.computeContentHash(buf)
    const hash2 = AssetProvenanceService.computeContentHash(buf)
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('stamps uniform provenance for vertex and kling providers', async () => {
    const buffer = Buffer.from('segment-video')

    const veoStamp = await AssetProvenanceService.stampVideoAsset({
      videoBuffer: buffer,
      userId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '660e8400-e29b-41d4-a716-446655440000',
      segmentId: 'seg-1',
      generationProvider: 'vertex',
      wasPolicyFallback: false,
    })

    const klingStamp = await AssetProvenanceService.stampVideoAsset({
      videoBuffer: buffer,
      userId: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '660e8400-e29b-41d4-a716-446655440000',
      segmentId: 'seg-2',
      generationProvider: 'fal',
      wasPolicyFallback: true,
      vertexPolicyAttempts: 3,
    })

    expect(veoStamp.contentHash).toBe(klingStamp.contentHash)
    expect(veoStamp.generativeModel).toBe('veo-3.1')
    expect(klingStamp.generativeModel).toBe('kling-v3')
    expect(veoStamp.gcsMetadata['x-sceneflow-content-hash']).toBe(veoStamp.contentHash)
    expect(klingStamp.sidecar.wasPolicyFallback).toBe(true)
    expect(veoStamp.signature).toMatch(/^[a-f0-9]{64}$/)
  })
})
