/**
 * Kling primary with Vertex Veo fallback (inverse of veoWithKlingFallback).
 */

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
  downloadProductionVideo,
  type ProductionVideoResult,
} from '@/lib/gemini/productionVideoClient'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
import { isVertexContentPolicyError } from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import { filterRefsForPolicyRetry } from '@/lib/video/normalizeReferenceImages'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'
import {
  getKlingDefaultModel,
  getKlingPollIntervalMs,
  getKlingPollTimeoutSec,
  getKlingWebhookBaseUrl,
  isKlingAsyncEnabled,
  isVeoFallbackEnabled,
  resolveKlingQuality,
} from './config'
import {
  runKlingVideo,
  submitKlingVideo,
  type KlingVideoInput,
} from './klingDirectClient'
import { saveKlingJob } from './jobStore'
import type { KlingQuality, KlingShotType, KlingMultiPromptEntry, KlingCreativePreset } from './types'

export type KlingVeoGenerationProvider = 'kling' | 'vertex'

export interface KlingVeoVideoResult {
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING'
  videoBuffer?: Buffer
  operationName?: string
  videoUrl?: string
  veoVideoRef?: string
  veoVideoRefExpiry?: string
  error?: string
  generationProvider: KlingVeoGenerationProvider
  wasVeoFallback: boolean
  klingAttempts: number
  finalMethod?: VideoGenerationMethod
  klingJobId?: string
  klingModel?: string
}

export interface KlingVeoVideoInput {
  prompt: string
  negativePrompt?: string
  method: VideoGenerationMethod
  videoOptions: VideoGenerationOptions
  guidePrompt?: string
  referenceFallbackPrompt?: string
  /** Allow Vertex Veo backup when Kling fails. Default true for Kling-primary path. */
  allowVeoFallback?: boolean
  klingModel?: string
  klingQuality?: KlingQuality
  cfgScale?: number
  sound?: boolean
  watermarkEnabled?: boolean
  elementList?: string[]
  voiceList?: Array<{ voice_id: string; name?: string }>
  multiShot?: boolean
  shotType?: KlingShotType
  multiPrompt?: KlingMultiPromptEntry[]
  preset?: KlingCreativePreset
  videoUrl?: string
  segmentId?: string
  projectId?: string
  sceneId?: string
  userId?: string
}

function downgradeMethod(method: VideoGenerationMethod): VideoGenerationMethod {
  if (method === 'FTV') return 'I2V'
  if (method === 'REF') return 'T2V'
  if (method === 'EXT') return 'I2V'
  return method
}

function buildKlingInputFromContext(
  prompt: string,
  method: VideoGenerationMethod,
  options: VideoGenerationOptions,
  ctx: KlingVeoVideoInput
): KlingVideoInput {
  const needsStart = method === 'I2V' || method === 'FTV' || method === 'EXT'
  const quality = resolveKlingQuality(ctx.klingQuality, options.resolution)

  const input: KlingVideoInput = {
    prompt,
    negative_prompt: options.negativePrompt ?? ctx.negativePrompt,
    cfg_scale: ctx.cfgScale,
    aspect_ratio: options.aspectRatio || '16:9',
    duration: options.durationSeconds ?? 10,
    model_name: ctx.klingModel || getKlingDefaultModel(),
    mode: quality,
    sound: ctx.sound,
    watermark_enabled: ctx.watermarkEnabled,
    element_list: ctx.elementList,
    voice_list: ctx.voiceList,
    multi_shot: ctx.multiShot,
    shot_type: ctx.shotType,
    multi_prompt: ctx.multiPrompt,
    preset: ctx.preset,
    video_url: ctx.videoUrl ?? options.sourceVideo ?? options.sourceVideoUrl,
  }

  if (needsStart && options.startFrame) {
    input.startFrame = options.startFrame
  }
  if (method === 'FTV' && options.lastFrame) {
    input.lastFrame = options.lastFrame
  }

  return input
}

function prepareKlingRetry(
  attempt: number,
  ctx: {
    method: VideoGenerationMethod
    prompt: string
    options: VideoGenerationOptions
    referenceFallbackPrompt?: string
  }
): { method: VideoGenerationMethod; prompt: string; options: VideoGenerationOptions } {
  let { method, prompt, options } = ctx

  if (attempt === 1) {
    const sp = autoSanitizePrompt(prompt, { logChanges: true })
    if (sp.wasModified) prompt = sp.sanitizedPrompt
    return { method, prompt, options }
  }

  if (attempt === 2 && method === 'REF' && options.referenceImages?.length) {
    options = {
      ...options,
      referenceImages: filterRefsForPolicyRetry(options.referenceImages, 'core'),
    }
    const sp = autoSanitizePrompt(prompt, { logChanges: true })
    if (sp.wasModified) prompt = sp.sanitizedPrompt
    return { method, prompt, options }
  }

  if (attempt === 3 && method === 'REF' && ctx.referenceFallbackPrompt) {
    method = 'T2V'
    const sp = autoSanitizePrompt(ctx.referenceFallbackPrompt, { logChanges: true })
    prompt = sp.wasModified ? sp.sanitizedPrompt : ctx.referenceFallbackPrompt
    options = { ...options, referenceImages: undefined, sourceVideo: undefined, sourceVideoUrl: undefined }
    return { method, prompt, options }
  }

  const prev = method
  const next = downgradeMethod(method)
  if (next !== method) {
    method = next
    if (prev === 'REF' && next === 'T2V' && ctx.referenceFallbackPrompt) {
      const sp = autoSanitizePrompt(ctx.referenceFallbackPrompt, { logChanges: true })
      prompt = sp.wasModified ? sp.sanitizedPrompt : ctx.referenceFallbackPrompt
      options = { ...options, referenceImages: undefined }
    }
  }

  return { method, prompt, options }
}

async function runVertexFallback(
  prompt: string,
  guidePrompt: string | undefined,
  options: VideoGenerationOptions
): Promise<ProductionVideoResult> {
  let enhanced = prompt
  if (guidePrompt?.trim()) {
    enhanced = enhanced.trim() ? `${enhanced.trim()}\n\n${guidePrompt.trim()}` : guidePrompt.trim()
  }

  const start = await generateProductionVideo(enhanced, {
    ...options,
    forceProvider: 'vertex',
  })

  if (start.status !== 'QUEUED' && start.status !== 'PROCESSING') {
    return start
  }

  if (!start.operationName) {
    return { ...start, status: 'FAILED', error: 'Missing operation name' }
  }

  return waitForProductionVideoCompletion(start.operationName, 'vertex', 240, 10)
}

export class KlingVideoAsyncSubmittedError extends Error {
  jobId: string
  taskId: string

  constructor(jobId: string, taskId: string) {
    super('Kling video job submitted — awaiting webhook completion')
    this.name = 'KlingVideoAsyncSubmittedError'
    this.jobId = jobId
    this.taskId = taskId
  }
}

/**
 * Try Kling first (with retry ladder), then optional Vertex Veo fallback.
 */
export async function generateVideoWithKlingVeoFallback(
  input: KlingVeoVideoInput
): Promise<KlingVeoVideoResult> {
  const maxAttempts = 4
  let method = input.method
  let prompt = input.prompt
  let options = { ...input.videoOptions }
  let lastError = ''
  let klingAttempts = 0

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    klingAttempts = attempt
    try {
      const klingInput = buildKlingInputFromContext(prompt, method, options, input)

      if (isKlingAsyncEnabled() && input.segmentId && input.projectId && input.userId) {
        const webhookUrl = `${getKlingWebhookBaseUrl()}/api/webhooks/kling`
        const submit = await submitKlingVideo(klingInput, { webhookUrl })
        const jobId = submit.taskId
        await saveKlingJob({
          jobId,
          taskId: submit.taskId,
          endpoint: submit.endpoint,
          segmentId: input.segmentId,
          projectId: input.projectId,
          sceneId: input.sceneId || '',
          userId: input.userId,
          modelName: String(klingInput.model_name),
          status: 'processing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        throw new KlingVideoAsyncSubmittedError(jobId, submit.taskId)
      }

      const buffer = await runKlingVideo(klingInput)
      return {
        status: 'COMPLETED',
        videoBuffer: buffer,
        generationProvider: 'kling',
        wasVeoFallback: false,
        klingAttempts,
        finalMethod: method,
        klingModel: String(klingInput.model_name),
      }
    } catch (e) {
      if (e instanceof KlingVideoAsyncSubmittedError) throw e
      lastError = e instanceof Error ? e.message : String(e)
      if (attempt < maxAttempts) {
        const next = prepareKlingRetry(attempt, {
          method,
          prompt,
          options,
          referenceFallbackPrompt: input.referenceFallbackPrompt,
        })
        method = next.method
        prompt = next.prompt
        options = next.options
        continue
      }
    }
  }

  const allowVeo = input.allowVeoFallback === true && isVeoFallbackEnabled()
  if (!allowVeo) {
    const baseError = lastError || 'Video generation failed'
    return {
      status: 'FAILED',
      error: `${baseError}. Try again later, or open Advanced and choose a different video engine.`,
      generationProvider: 'kling',
      wasVeoFallback: false,
      klingAttempts,
    }
  }

  try {
    const veoResult = await runVertexFallback(prompt, input.guidePrompt, options)
    if (veoResult.status === 'COMPLETED' && veoResult.videoUrl) {
      let buffer: Buffer | null = null
      if (veoResult.videoUrl.startsWith('data:video')) {
        const b64 = veoResult.videoUrl.split(',')[1]
        buffer = Buffer.from(b64, 'base64')
      } else if (veoResult.videoUrl.startsWith('file:')) {
        buffer = await downloadProductionVideo(veoResult.videoUrl.slice(5), 'vertex')
      } else {
        buffer = await downloadProductionVideo(veoResult.videoUrl, 'vertex')
      }
      if (!buffer) throw new Error('Failed to download Vertex fallback video')
      return {
        status: 'COMPLETED',
        videoBuffer: buffer,
        operationName: veoResult.operationName,
        videoUrl: veoResult.videoUrl,
        veoVideoRef: veoResult.veoVideoRef,
        veoVideoRefExpiry: veoResult.veoVideoRefExpiry,
        generationProvider: 'vertex',
        wasVeoFallback: true,
        klingAttempts,
        finalMethod: method,
      }
    }

    const err = veoResult.error || 'Vertex fallback failed'
    if (isVertexContentPolicyError(err)) {
      return {
        status: 'FAILED',
        error: `Kling failed (${klingAttempts} attempts); Vertex policy blocked: ${err}`,
        generationProvider: 'vertex',
        wasVeoFallback: true,
        klingAttempts,
      }
    }

    return {
      status: 'FAILED',
      error: `Kling failed; Vertex fallback: ${err}`,
      generationProvider: 'vertex',
      wasVeoFallback: true,
      klingAttempts,
    }
  } catch (veoErr) {
    const msg = veoErr instanceof Error ? veoErr.message : String(veoErr)
    return {
      status: 'FAILED',
      error: `Kling failed (${klingAttempts} attempts); Vertex fallback error: ${msg}`,
      generationProvider: 'vertex',
      wasVeoFallback: true,
      klingAttempts,
    }
  }
}

export { getKlingPollIntervalMs, getKlingPollTimeoutSec }
