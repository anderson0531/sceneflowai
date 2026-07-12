/**
 * Vertex Veo policy ladder: original → sanitize → method downgrade → Kling.
 */

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
  downloadProductionVideo,
  type ProductionVideoResult,
} from '@/lib/gemini/productionVideoClient'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
import {
  isVertexContentPolicyError,
  getKlingFallbackProvider,
  getVeoPolicyMaxAttempts,
  isVeoPolicyFastFallbackEnabled,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { runFalKlingVideo } from '@/lib/fal/klingPolicyClient'
import { FAL_KLING_FALLBACK_MODEL_FAMILY } from '@/lib/fal/config'
import { runKlingVideo } from '@/lib/kling/klingDirectClient'
import { KLING_FALLBACK_MODEL_FAMILY } from '@/lib/kling/config'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import { filterRefsForPolicyRetry } from '@/lib/video/normalizeReferenceImages'

export type GenerationProvider = 'vertex' | 'fal' | 'kling'

export type KlingFallbackModelFamily = typeof FAL_KLING_FALLBACK_MODEL_FAMILY | typeof KLING_FALLBACK_MODEL_FAMILY

export interface VeoKlingVideoResult {
  status: 'COMPLETED' | 'FAILED'
  videoBuffer?: Buffer
  operationName?: string
  videoUrl?: string
  veoVideoRef?: string
  veoVideoRefExpiry?: string
  error?: string
  generationProvider: GenerationProvider
  fallbackModelFamily?: KlingFallbackModelFamily
  wasPolicyFallback: boolean
  vertexAttempts: number
  finalMethod?: VideoGenerationMethod
}

export interface VeoKlingVideoInput {
  prompt: string
  negativePrompt?: string
  method: VideoGenerationMethod
  videoOptions: VideoGenerationOptions & { forceProvider?: 'vertex' | 'gemini' }
  guidePrompt?: string
  /** Plain T2V prompt without reference preamble — used when REF is downgraded after policy blocks */
  referenceFallbackPrompt?: string
  /** Opt-in backup engine after Vertex policy exhaustion. Default false. */
  allowPolicyFallback?: boolean
}

function downgradeMethod(method: VideoGenerationMethod): VideoGenerationMethod {
  if (method === 'FTV') return 'I2V'
  if (method === 'REF') return 'T2V'
  if (method === 'EXT') return 'I2V'
  return method
}

function stripExtForKling(opts: VideoGenerationOptions): VideoGenerationOptions {
  const { sourceVideo, sourceVideoUrl, ...rest } = opts
  return rest
}

function sanitizeReferenceImageLabels(
  options: VideoGenerationOptions
): VideoGenerationOptions {
  if (!options.referenceImages?.length) return options
  return {
    ...options,
    referenceImages: options.referenceImages.map((ref) => {
      const label = (ref as { label?: string }).label
      if (!label?.trim()) return ref
      const sanitized = autoSanitizePrompt(label, { logChanges: true })
      const nextLabel = neutralizeReferenceConflictPrompt(
        sanitized.wasModified ? sanitized.sanitizedPrompt : label
      )
      return { ...ref, label: nextLabel }
    }),
  }
}

function preparePolicyRetry(
  attempt: number,
  maxAttempts: number,
  ctx: {
    method: VideoGenerationMethod
    prompt: string
    options: VideoGenerationOptions
    referenceFallbackPrompt?: string
  }
): {
  method: VideoGenerationMethod
  prompt: string
  options: VideoGenerationOptions
} {
  let { method, prompt, options } = ctx

  if (attempt === 1) {
    const sp = autoSanitizePrompt(prompt, { logChanges: true })
    if (sp.wasModified) prompt = sp.sanitizedPrompt
    options = sanitizeReferenceImageLabels(options)
    return { method, prompt, options }
  }

  if (attempt === 2 && method === 'REF' && options.referenceImages?.length) {
    options = {
      ...options,
      referenceImages: filterRefsForPolicyRetry(options.referenceImages, 'core'),
    }
    options = sanitizeReferenceImageLabels(options)
    const sp = autoSanitizePrompt(prompt, { logChanges: true })
    if (sp.wasModified) prompt = sp.sanitizedPrompt
    return { method, prompt, options }
  }

  if (attempt === 3 && maxAttempts >= 4 && method === 'REF') {
    method = 'T2V'
    options = stripExtForKling(options)
    if (ctx.referenceFallbackPrompt) {
      const sp = autoSanitizePrompt(ctx.referenceFallbackPrompt, { logChanges: true })
      prompt = sp.wasModified ? sp.sanitizedPrompt : ctx.referenceFallbackPrompt
    }
    options = { ...options, referenceImages: undefined }
    return { method, prompt, options }
  }

  const prevMethod = method
  const next = downgradeMethod(method)
  if (next !== method) {
    method = next
    if (method === 'I2V' || method === 'T2V') {
      options = stripExtForKling(options)
    }
    if (prevMethod === 'REF' && next === 'T2V') {
      if (ctx.referenceFallbackPrompt) {
        const sp = autoSanitizePrompt(ctx.referenceFallbackPrompt, { logChanges: true })
        prompt = sp.wasModified ? sp.sanitizedPrompt : ctx.referenceFallbackPrompt
      }
      options = { ...options, referenceImages: undefined }
    }
  }

  return { method, prompt, options }
}

async function runVertexAttempt(
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

async function runKlingVideoFallback(
  prompt: string,
  method: VideoGenerationMethod,
  options: VideoGenerationOptions
): Promise<Buffer> {
  const klingOpts = stripExtForKling(options)
  const duration = klingOpts.durationSeconds === 8 ? 8 : 5
  const aspect = klingOpts.aspectRatio || '16:9'
  const needsStart = method === 'I2V' || method === 'FTV' || method === 'EXT'

  if (needsStart && !klingOpts.startFrame) {
    throw new Error('Direct Kling image-to-video requires startFrame URL or base64')
  }

  return runKlingVideo({
    prompt,
    negative_prompt: klingOpts.negativePrompt,
    duration,
    aspect_ratio: aspect,
    startFrame: needsStart ? klingOpts.startFrame : undefined,
    lastFrame: method === 'FTV' ? klingOpts.lastFrame : undefined,
  })
}

async function runFalVideoFallback(
  prompt: string,
  method: VideoGenerationMethod,
  options: VideoGenerationOptions
): Promise<Buffer> {
  const falOpts = stripExtForKling(options)
  const duration = falOpts.durationSeconds === 8 ? 8 : 5
  const aspect = falOpts.aspectRatio || '16:9'
  const needsStart = method === 'I2V' || method === 'FTV' || method === 'EXT'

  if (needsStart && !falOpts.startFrame) {
    throw new Error('Fal Kling image-to-video requires startFrame URL or base64')
  }

  return runFalKlingVideo({
    prompt,
    negative_prompt: falOpts.negativePrompt,
    duration,
    aspect_ratio: aspect,
    startFrame: needsStart ? falOpts.startFrame : undefined,
    lastFrame: method === 'FTV' ? falOpts.lastFrame : undefined,
  })
}

async function runExternalKlingFallback(
  provider: 'kling' | 'fal',
  prompt: string,
  method: VideoGenerationMethod,
  options: VideoGenerationOptions
): Promise<Buffer> {
  if (provider === 'kling') {
    return runKlingVideoFallback(prompt, method, options)
  }
  return runFalVideoFallback(prompt, method, options)
}

/**
 * Up to VEO_POLICY_MAX_ATTEMPTS Vertex tries, then optional Kling on policy exhaustion.
 */
export async function generateVideoWithVeoKlingFallback(
  input: VeoKlingVideoInput
): Promise<VeoKlingVideoResult> {
  const maxAttempts = getVeoPolicyMaxAttempts()
  const fastFallback = isVeoPolicyFastFallbackEnabled()
  let method = input.method
  let prompt = input.prompt
  let guidePrompt = input.guidePrompt
  let options = { ...input.videoOptions }
  let lastError = ''
  let vertexAttempts = 0
  let policyBlocked = false

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    vertexAttempts = attempt
    try {
      const result = await runVertexAttempt(prompt, guidePrompt, options)
      if (result.status === 'COMPLETED' && result.videoUrl) {
        let buffer: Buffer | null = null
        if (result.videoUrl.startsWith('data:video')) {
          const b64 = result.videoUrl.split(',')[1]
          buffer = Buffer.from(b64, 'base64')
        } else if (result.videoUrl.startsWith('file:')) {
          buffer = await downloadProductionVideo(result.videoUrl.slice(5), 'vertex')
        } else {
          buffer = await downloadProductionVideo(result.videoUrl, 'vertex')
        }
        if (!buffer) throw new Error('Failed to download Vertex video')
        return {
          status: 'COMPLETED',
          videoBuffer: buffer,
          operationName: result.operationName,
          videoUrl: result.videoUrl,
          veoVideoRef: result.veoVideoRef,
          generationProvider: 'vertex',
          wasPolicyFallback: false,
          vertexAttempts,
          finalMethod: method,
        }
      }

      if (result.status === 'FAILED' && result.error) {
        lastError = result.error
        if (!isVertexContentPolicyError(result.error)) {
          return {
            status: 'FAILED',
            error: result.error,
            generationProvider: 'vertex',
            wasPolicyFallback: false,
            vertexAttempts,
          }
        }

        policyBlocked = true
        if (fastFallback) break

        if (attempt < maxAttempts) {
          const next = preparePolicyRetry(attempt, maxAttempts, {
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
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      if (!isVertexContentPolicyError(lastError)) {
        return {
          status: 'FAILED',
          error: lastError,
          generationProvider: 'vertex',
          wasPolicyFallback: false,
          vertexAttempts,
        }
      }
      policyBlocked = true
      if (fastFallback) break
    }
  }

  if (!policyBlocked) {
    throw new ContentPolicyExhaustedError(
      lastError || 'Vertex video generation failed',
      vertexAttempts,
      lastError
    )
  }

  if (!input.allowPolicyFallback) {
    throw new ContentPolicyExhaustedError(
      `${lastError || 'Vertex content policy blocked all attempts'}. Try again later, or open Advanced and choose a different video engine.`,
      vertexAttempts,
      lastError
    )
  }

  const klingProvider = getKlingFallbackProvider()
  if (!klingProvider) {
    throw new ContentPolicyExhaustedError(
      lastError || 'Vertex content policy blocked all attempts',
      vertexAttempts,
      lastError
    )
  }

  try {
    const buffer = await runExternalKlingFallback(klingProvider, prompt, method, options)
    return {
      status: 'COMPLETED',
      videoBuffer: buffer,
      generationProvider: klingProvider,
      fallbackModelFamily:
        klingProvider === 'kling' ? KLING_FALLBACK_MODEL_FAMILY : FAL_KLING_FALLBACK_MODEL_FAMILY,
      wasPolicyFallback: true,
      vertexAttempts,
      finalMethod: method,
    }
  } catch (klingErr) {
    const msg = klingErr instanceof Error ? klingErr.message : String(klingErr)
    const label = klingProvider === 'kling' ? 'Direct Kling' : 'Fal Kling'
    throw new ContentPolicyExhaustedError(
      `Vertex policy exhausted (${vertexAttempts} attempts); ${label} failed: ${msg}`,
      vertexAttempts,
      lastError
    )
  }
}
