/**
 * Build lightweight FFmpeg stitch job spec for long-take silent master concat.
 */

import { randomUUID } from 'crypto'
import type { StitchRenderJobSpec } from '@/lib/video/renderTypes'
import { getOutputPath } from '@/lib/gcs/renderStorage'

export function buildStitchJobSpec(args: {
  projectId: string
  sceneId: string
  clipUrls: string[]
  resolution?: '720p' | '1080p' | '4K'
  fps?: number
  callbackUrl: string
  jobId?: string
}): StitchRenderJobSpec {
  const jobId = args.jobId || randomUUID()
  return {
    jobId,
    projectId: args.projectId,
    sceneId: args.sceneId,
    resolution: args.resolution ?? '1080p',
    fps: args.fps ?? 24,
    clipUrls: args.clipUrls,
    outputPath: getOutputPath(jobId),
    callbackUrl: args.callbackUrl,
    createdAt: new Date().toISOString(),
    renderMode: 'stitch',
  }
}
