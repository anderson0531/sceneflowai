import type { VideoAdapter, GenerateClipRequest, GenerateClipResult } from '@/lib/orchestration/VideoProductionService'

export class VeoAdapter implements VideoAdapter {
  async generateClip(req: GenerateClipRequest): Promise<GenerateClipResult> {
    // Stub: return placeholder clip URL
    return { clipUrl: '/window.svg', provider: 'veo' }
  }
}

export function createVeoAdapter(): VideoAdapter { return new VeoAdapter() }
