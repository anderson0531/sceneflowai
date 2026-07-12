/**
 * Long-take orchestrator step helpers for Inngest durable flow.
 */

import { randomUUID } from 'crypto'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import {
  moderateKlingVideoBuffer,
} from '@/lib/moderation/klingSafetyGuard'
import { uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { getKlingWebhookBaseUrl } from './config'
import { buildStitchJobSpec } from './buildStitchJobSpec'
import { triggerStitchRenderJob } from './triggerStitchRender'
import { planKlingLongTake } from './longTakePlanner'
import { saveKlingJob } from './jobStore'
import {
  submitKlingVideo,
  submitKlingVideoExtend,
  submitKlingLipSync,
  downloadKlingVideoUrl,
} from './klingDirectClient'
import type {
  KlingLongTakeChainContext,
  KlingModelId,
  KlingQuality,
  KlingVideoInput,
} from './types'
import type { SceneSegment } from '@/components/vision/scene-production/types'

export interface KlingLongTakeJobPayload {
  generationJobId: string
  userId: string
  projectId: string
  sceneId: string
  beatId: string
  segmentId: string
  model: KlingModelId | string
  quality: KlingQuality | string
  targetSeconds: number
  prompt: string
  negativePrompt?: string
  cfgScale?: number
  startFrameUrl?: string
  elementList?: string[]
  dialogueAudioUrl?: string
  resolution?: '720p' | '1080p' | '4k'
  faceConsistency?: boolean
  aspectRatio?: string
}

function klingWebhookUrl(): string {
  return `${getKlingWebhookBaseUrl()}/api/webhooks/kling`
}

function stitchCallbackUrl(): string {
  return `${getKlingWebhookBaseUrl()}/api/kling/stitch/callback`
}

function makeChainContext(
  payload: KlingLongTakeJobPayload,
  totalExtendSteps: number
): KlingLongTakeChainContext {
  return {
    generationJobId: payload.generationJobId,
    beatId: payload.beatId,
    model: String(payload.model),
    quality: String(payload.quality),
    targetSeconds: payload.targetSeconds,
    clipUrls: [],
    dialogueAudioUrl: payload.dialogueAudioUrl,
    stepIndex: 0,
    totalExtendSteps,
  }
}

export async function submitLongTakeBase(payload: KlingLongTakeJobPayload): Promise<{
  taskId: string
  klingJobId: string
}> {
  const plan = planKlingLongTake({
    targetSeconds: payload.targetSeconds,
    model: payload.model,
  })

  const input: KlingVideoInput = {
    prompt: payload.prompt,
    negative_prompt: payload.negativePrompt,
    cfg_scale: payload.cfgScale,
    model_name: plan.model,
    mode: (payload.quality as KlingQuality) || 'pro',
    duration: plan.baseSeconds,
    aspect_ratio: payload.aspectRatio || '16:9',
    startFrame: payload.startFrameUrl,
    element_list: payload.elementList,
    sound: 'off',
    face_consistency: payload.faceConsistency,
    webhook_url: klingWebhookUrl(),
  }

  const submit = await submitKlingVideo(input, { webhookUrl: klingWebhookUrl() })
  const klingJobId = submit.taskId

  await saveKlingJob({
    jobId: klingJobId,
    taskId: submit.taskId,
    endpoint: submit.endpoint,
    segmentId: payload.segmentId,
    projectId: payload.projectId,
    sceneId: payload.sceneId,
    userId: payload.userId,
    modelName: plan.model,
    status: 'processing',
    kind: 'long_take_base',
    longTake: makeChainContext(payload, plan.extensions),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return { taskId: submit.taskId, klingJobId }
}

export async function submitLongTakeExtend(args: {
  payload: KlingLongTakeJobPayload
  videoId: string
  stepIndex: number
  totalExtendSteps: number
  clipUrls: string[]
  prompt?: string
}): Promise<{ taskId: string; klingJobId: string }> {
  const submit = await submitKlingVideoExtend({
    videoId: args.videoId,
    prompt: args.prompt || args.payload.prompt,
    negativePrompt: args.payload.negativePrompt,
    cfgScale: args.payload.cfgScale,
    webhookUrl: klingWebhookUrl(),
  })
  const klingJobId = submit.taskId

  const longTake: KlingLongTakeChainContext = {
    ...makeChainContext(args.payload, args.totalExtendSteps),
    clipUrls: args.clipUrls,
    currentVideoId: args.videoId,
    stepIndex: args.stepIndex,
  }

  await saveKlingJob({
    jobId: klingJobId,
    taskId: submit.taskId,
    endpoint: 'video-extend',
    segmentId: args.payload.segmentId,
    projectId: args.payload.projectId,
    sceneId: args.payload.sceneId,
    userId: args.payload.userId,
    modelName: String(args.payload.model),
    status: 'processing',
    kind: 'long_take_extend',
    longTake,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return { taskId: submit.taskId, klingJobId }
}

export async function enqueueLongTakeStitch(args: {
  payload: KlingLongTakeJobPayload
  clipUrls: string[]
  stitchJobId?: string
}): Promise<{ stitchJobId: string; jobSpecPath: string }> {
  const stitchJobId = args.stitchJobId || randomUUID()
  const resolution =
    args.payload.resolution === '720p'
      ? '720p'
      : args.payload.resolution === '4k'
        ? '4K'
        : '1080p'

  const jobSpec = buildStitchJobSpec({
    jobId: stitchJobId,
    projectId: args.payload.projectId,
    sceneId: args.payload.sceneId,
    clipUrls: args.clipUrls,
    resolution,
    callbackUrl: stitchCallbackUrl(),
  })

  const { jobSpecPath } = await triggerStitchRenderJob(jobSpec)
  return { stitchJobId, jobSpecPath }
}

export async function submitLongTakeLipSync(args: {
  payload: KlingLongTakeJobPayload
  masterVideoUrl: string
}): Promise<{ taskId: string; klingJobId: string }> {
  if (!args.payload.dialogueAudioUrl) {
    throw new Error('Long-take lip-sync requires dialogueAudioUrl')
  }

  const submit = await submitKlingLipSync({
    videoUrl: args.masterVideoUrl,
    audioUrl: args.payload.dialogueAudioUrl,
    webhookUrl: klingWebhookUrl(),
  })
  const klingJobId = submit.taskId

  await saveKlingJob({
    jobId: klingJobId,
    taskId: submit.taskId,
    endpoint: 'lip-sync',
    segmentId: args.payload.segmentId,
    projectId: args.payload.projectId,
    sceneId: args.payload.sceneId,
    userId: args.payload.userId,
    modelName: String(args.payload.model),
    status: 'processing',
    kind: 'long_take_lipsync',
    longTake: makeChainContext(args.payload, 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return { taskId: submit.taskId, klingJobId }
}

export async function finalizeLongTakeMaster(args: {
  payload: KlingLongTakeJobPayload
  videoUrl: string
  provenance?: Record<string, unknown>
}): Promise<{ assetUrl: string }> {
  const videoBuffer = await downloadKlingVideoUrl(args.videoUrl)
  await moderateKlingVideoBuffer(videoBuffer, {
    userId: args.payload.userId,
    projectId: args.payload.projectId,
    sceneId: args.payload.sceneId,
    segmentId: args.payload.segmentId,
  })

  const assetUrl = await uploadVideoToGCS(
    videoBuffer,
    `segments/${args.payload.segmentId}-longtake-${Date.now()}.mp4`,
    args.payload.projectId
  )

  await persistLongTakeAssetToProject({
    projectId: args.payload.projectId,
    sceneId: args.payload.sceneId,
    segmentId: args.payload.segmentId,
    assetUrl,
    provenance: {
      pipeline: 'kling_long_take',
      beatId: args.payload.beatId,
      model: args.payload.model,
      targetSeconds: args.payload.targetSeconds,
      ...args.provenance,
    },
  })

  return { assetUrl }
}

export async function persistLongTakeAssetToProject(args: {
  projectId: string
  sceneId: string
  segmentId: string
  assetUrl: string
  provenance?: Record<string, unknown>
}): Promise<void> {
  await sequelize.authenticate()
  const project = await Project.findByPk(args.projectId)
  if (!project) return

  const metadata = (project.metadata || {}) as Record<string, unknown>
  const visionPhase = (metadata.visionPhase || {}) as Record<string, unknown>
  const production = (visionPhase.production || {}) as Record<string, unknown>
  const scenes = (production.scenes || {}) as Record<
    string,
    { segments?: SceneSegment[] }
  >
  const sceneProd = scenes[args.sceneId]
  if (!sceneProd?.segments) return

  const segments = sceneProd.segments.map((seg) => {
    if (seg.segmentId !== args.segmentId) return seg
    return {
      ...seg,
      assetType: 'video' as const,
      activeAssetUrl: args.assetUrl,
      assetUrl: args.assetUrl,
      generationProvider: 'kling',
      longTakeProvenance: args.provenance,
    }
  })

  const updatedMetadata = {
    ...metadata,
    visionPhase: {
      ...visionPhase,
      production: {
        ...production,
        scenes: {
          ...scenes,
          [args.sceneId]: {
            ...sceneProd,
            segments,
          },
        },
      },
    },
  }

  await project.update({ metadata: updatedMetadata })
}
