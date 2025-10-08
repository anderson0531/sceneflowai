export interface GenerateClipRequest {
  startFrameUrl: string
  prompt: string
  durationSec: number
  aspectRatio: string
}

export interface GenerateClipResult { clipUrl: string; provider: string; jobId?: string }

export interface VideoAdapter { generateClip(req: GenerateClipRequest): Promise<GenerateClipResult> }

export class VideoProductionService {
  constructor(private getAdapter: (name: string)=> VideoAdapter){ }

  async generateTakes(provider: string, shot: { keyframeUrl: string; vdp: string; durationSec: number }, takes = 3) {
    const adapter = this.getAdapter(provider)
    const results: GenerateClipResult[] = []
    for (let i=0; i<takes; i++) {
      results.push(await adapter.generateClip({
        startFrameUrl: shot.keyframeUrl,
        prompt: shot.vdp,
        durationSec: shot.durationSec,
        aspectRatio: '16:9'
      }))
    }
    return results
  }
}
