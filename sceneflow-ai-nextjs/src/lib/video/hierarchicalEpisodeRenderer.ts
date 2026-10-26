/**
 * Hierarchical Episode Renderer (Tier-1 Scene Sub-Masters -> Tier-2 Episode Stream-Copy Master)
 *
 * Prevents Cloud Run `/tmp` RAM exhaustion and 800-node FFmpeg filtergraph crashes
 * when stitching 270–360 x 10s clips into a 45m–60m television episode:
 *
 * - Tier 1 (Scene Sub-Master Cache): Each scene (8–20 clips, ~1.5–2.5 min) is rendered
 *   into a normalized H.264/AAC sub-master (`gs://{bucket}/scene-masters/{projectId}/{sceneId}-{hash}.mp4`).
 * - Tier 2 (Episode Master Concat): Once all Scene Sub-Masters exist, the 45m–60m Episode
 *   Master is assembled via FFmpeg stream-copy (`-c copy`) in <20 seconds with zero
 *   quality loss. Re-shooting 1 clip in Scene 14 only re-renders Scene 14!
 */

import crypto from 'crypto'
import type {
  RenderAudioClip,
  RenderJobSpec,
  RenderSegment,
  RenderTextOverlay,
  RenderWatermark,
} from '@/lib/video/renderTypes'

export interface EpisodeSceneRenderInput {
  sceneId: string
  sceneNumber: number
  sceneTitle?: string
  segments: RenderSegment[]
  audioClips: RenderAudioClip[]
  textOverlays?: RenderTextOverlay[]
  sceneEndTransition?: {
    effect: 'dissolve' | 'fade'
    durationSec: number
    nextFrameUrl?: string
  } | null
}

export interface CachedSceneSubMaster {
  sceneId: string
  sourceHash: string
  gcsUrl: string
  durationSec: number
}

export interface PlanHierarchicalEpisodeRenderInput {
  projectId: string
  episodeTitle: string
  language: string
  resolution: '720p' | '1080p' | '4K'
  fps?: number
  aspectRatio?: '16:9' | '9:16'
  renderBucket?: string
  callbackBaseUrl?: string
  watermark?: RenderWatermark | null
  scenes: EpisodeSceneRenderInput[]
  cachedSubMasters?: Record<string, CachedSceneSubMaster>
}

export interface SceneSubMasterPlanEntry {
  sceneId: string
  sceneNumber: number
  sourceHash: string
  status: 'cache_hit' | 'needs_render'
  subMasterGcsPath: string
  estimatedDurationSec: number
  segmentCount: number
  jobSpec: RenderJobSpec
}

export interface HierarchicalEpisodeRenderPlan {
  projectId: string
  episodeSourceHash: string
  totalScenes: number
  totalSegments: number
  estimatedEpisodeDurationSec: number
  cacheHitCount: number
  dirtySceneCount: number
  sceneSubMasters: SceneSubMasterPlanEntry[]
  dirtyScenePlans: SceneSubMasterPlanEntry[]
  episodeMasterJobSpec: RenderJobSpec
}

const DEFAULT_BUCKET = 'sceneflow-render-jobs'
const DEFAULT_CALLBACK_BASE = 'https://sceneflowai.studio'

/**
 * Compute a deterministic 16-char SHA-256 hash over a scene's visual and audio render inputs.
 */
export function computeSceneRenderSourceHash(
  scene: EpisodeSceneRenderInput,
  options: {
    resolution: string
    fps: number
    aspectRatio: string
    language: string
  }
): string {
  const payload = {
    sceneId: scene.sceneId,
    resolution: options.resolution,
    fps: options.fps,
    aspectRatio: options.aspectRatio,
    language: options.language,
    segments: scene.segments.map((s) => ({
      id: s.segmentId,
      videoUrl: s.videoUrl || '',
      imageUrl: s.imageUrl || '',
      startTime: s.startTime,
      duration: s.duration,
      trimStart: s.trimStart ?? 0,
      trimDuration: s.trimDuration ?? null,
      audioSource: s.audioSource ?? 'original',
      audioVolume: s.audioVolume ?? 1,
      transitionIn: s.transitionIn ?? 'cut',
      transitionInSec: s.transitionInSec ?? 0,
    })),
    audioClips: scene.audioClips.map((a) => ({
      url: a.url,
      type: a.type,
      startTime: a.startTime,
      duration: a.duration,
      volume: a.volume,
    })),
    textOverlays: (scene.textOverlays ?? []).map((t) => ({
      id: t.id,
      text: t.text,
      startTime: t.startTime,
      duration: t.duration,
    })),
    sceneEndTransition: scene.sceneEndTransition ?? null,
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16)
}

/**
 * Build a two-tier hierarchical render plan for a 45m–60m episode.
 */
export function planHierarchicalEpisodeRender(
  input: PlanHierarchicalEpisodeRenderInput
): HierarchicalEpisodeRenderPlan {
  const fps = input.fps ?? 24
  const aspectRatio = input.aspectRatio ?? '16:9'
  const bucket = input.renderBucket || process.env.GCS_RENDER_BUCKET || DEFAULT_BUCKET
  const callbackBase =
    input.callbackBaseUrl || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_CALLBACK_BASE

  const sceneSubMasters: SceneSubMasterPlanEntry[] = []
  let totalSegments = 0
  let cumulativeEpisodeTime = 0

  for (const scene of input.scenes) {
    const sourceHash = computeSceneRenderSourceHash(scene, {
      resolution: input.resolution,
      fps,
      aspectRatio,
      language: input.language,
    })

    const sceneDurationSec = scene.segments.reduce(
      (sum, seg) => sum + Math.max(0, seg.trimDuration ?? seg.duration ?? 0),
      0
    )
    totalSegments += scene.segments.length

    const cached = input.cachedSubMasters?.[scene.sceneId]
    const isCacheHit = Boolean(
      cached && cached.sourceHash === sourceHash && cached.gcsUrl?.trim()
    )

    const subMasterGcsPath = isCacheHit
      ? cached!.gcsUrl
      : `gs://${bucket}/scene-masters/${input.projectId}/${scene.sceneId}-${sourceHash}.mp4`

    const sceneJobId = `scene-${scene.sceneId}-${sourceHash}`
    const jobSpec: RenderJobSpec = {
      jobId: sceneJobId,
      projectId: input.projectId,
      projectTitle: `${input.episodeTitle} — Scene ${scene.sceneNumber}`,
      resolution: input.resolution,
      fps,
      aspectRatio,
      renderMode: 'concatenate',
      encodeQuality: 'delivery',
      segments: scene.segments,
      audioClips: scene.audioClips,
      textOverlays: scene.textOverlays,
      watermark: null, // Watermark applied once at Episode Master level or final delivery
      sceneEndTransition: scene.sceneEndTransition ?? null,
      outputPath: subMasterGcsPath,
      callbackUrl: `${callbackBase}/api/export/render-callback`,
      createdAt: new Date().toISOString(),
      language: input.language,
    }

    sceneSubMasters.push({
      sceneId: scene.sceneId,
      sceneNumber: scene.sceneNumber,
      sourceHash,
      status: isCacheHit ? 'cache_hit' : 'needs_render',
      subMasterGcsPath,
      estimatedDurationSec: Math.round(sceneDurationSec * 1000) / 1000,
      segmentCount: scene.segments.length,
      jobSpec,
    })
  }

  const episodeSourceHash = crypto
    .createHash('sha256')
    .update(sceneSubMasters.map((s) => `${s.sceneId}:${s.sourceHash}`).join('|'))
    .digest('hex')
    .slice(0, 16)

  // Build Tier-2 Episode Master JobSpec where each input segment is a pre-rendered Scene Sub-Master MP4
  const episodeSegments: RenderSegment[] = sceneSubMasters.map((sub) => {
    const seg: RenderSegment = {
      segmentId: `submaster-${sub.sceneId}`,
      videoUrl: sub.subMasterGcsPath,
      startTime: cumulativeEpisodeTime,
      duration: sub.estimatedDurationSec,
      audioSource: 'original',
      audioVolume: 1.0,
    }
    cumulativeEpisodeTime = Math.round((cumulativeEpisodeTime + sub.estimatedDurationSec) * 1000) / 1000
    return seg
  })

  const episodeJobId = `episode-${input.projectId}-${episodeSourceHash}`
  const episodeMasterJobSpec: RenderJobSpec = {
    jobId: episodeJobId,
    projectId: input.projectId,
    projectTitle: input.episodeTitle,
    resolution: input.resolution,
    fps,
    aspectRatio,
    renderMode: 'concatenate',
    encodeQuality: 'delivery',
    includeSegmentAudio: true,
    segmentAudioVolume: 1.0,
    segments: episodeSegments,
    audioClips: [],
    watermark: input.watermark ?? null,
    outputPath: `gs://${bucket}/episodes/${input.projectId}/episode-master-${episodeSourceHash}.mp4`,
    callbackUrl: `${callbackBase}/api/export/render-callback`,
    createdAt: new Date().toISOString(),
    language: input.language,
  }

  const dirtyScenePlans = sceneSubMasters.filter((s) => s.status === 'needs_render')

  return {
    projectId: input.projectId,
    episodeSourceHash,
    totalScenes: sceneSubMasters.length,
    totalSegments,
    estimatedEpisodeDurationSec: cumulativeEpisodeTime,
    cacheHitCount: sceneSubMasters.length - dirtyScenePlans.length,
    dirtySceneCount: dirtyScenePlans.length,
    sceneSubMasters,
    dirtyScenePlans,
    episodeMasterJobSpec,
  }
}
