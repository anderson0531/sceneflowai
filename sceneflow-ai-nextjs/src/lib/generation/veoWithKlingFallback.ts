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
  isFalKlingFallbackEnabled,
  getVeoPolicyMaxAttempts,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { runFalKlingVideo } from '@/lib/fal/klingPolicyClient'
import { FAL_KLING_FALLBACK_MODEL_FAMILY } from '@/lib/fal/config'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

export type GenerationProvider = 'vertex' | 'fal'

export interface VeoKlingVideoResult {
  status: 'COMPLETED' | 'FAILED'
  videoBuffer?: Buffer
  operationName?: string
  videoUrl?: string
  veoVideoRef?: string
  veoVideoRefExpiry?: string
  error?: string
  generationProvider: GenerationProvider
  fallbackModelFamily?: typeof FAL_KLING_FALLBACK_MODEL_FAMILY
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

/**
 * Up to VEO_POLICY_MAX_ATTEMPTS Vertex tries, then optional Kling on policy exhaustion.
 */
export async function generateVideoWithVeoKlingFallback(
  input: VeoKlingVideoInput
): Promise<VeoKlingVideoResult> {
  const maxAttempts = getVeoPolicyMaxAttempts()
  let method = input.method
  let prompt = input.prompt
  let guidePrompt = input.guidePrompt
  let options = { ...input.videoOptions }
  let lastError = ''
  let vertexAttempts = 0

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

        if (attempt === 1) {
          const sp = autoSanitizePrompt(prompt, { logChanges: true })
          if (sp.wasModified) prompt = sp.sanitizedPrompt
          if (guidePrompt?.trim()) {
            const sg = autoSanitizePrompt(guidePrompt, { logChanges: true })
            if (sg.wasModified) guidePrompt = sg.sanitizedPrompt
          }
          continue
        }

        if (attempt === 2) {
          const prevMethod = method
          const next = downgradeMethod(method)
          if (next !== method) {
            method = next
            if (method === 'I2V' || method === 'T2V') {
              options = stripExtForKling(options)
            }
            if (prevMethod === 'REF' && next === 'T2V') {
              if (input.referenceFallbackPrompt) {
                const sp = autoSanitizePrompt(input.referenceFallbackPrompt, { logChanges: true })
                prompt = sp.wasModified ? sp.sanitizedPrompt : input.referenceFallbackPrompt
              }
              options = { ...options, referenceImages: undefined }
            }
            continue
          }
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
    }
  }

  if (!isFalKlingFallbackEnabled()) {
    throw new ContentPolicyExhaustedError(
      lastError || 'Vertex content policy blocked all attempts',
      vertexAttempts,
      lastError
    )
  }

  try {
    const buffer = await runFalVideoFallback(prompt, method, options)
    return {
      status: 'COMPLETED',
      videoBuffer: buffer,
      generationProvider: 'fal',
      fallbackModelFamily: FAL_KLING_FALLBACK_MODEL_FAMILY,
      wasPolicyFallback: true,
      vertexAttempts,
      finalMethod: method,
    }
  } catch (falErr) {
    const msg = falErr instanceof Error ? falErr.message : String(falErr)
    throw new ContentPolicyExhaustedError(
      `Vertex policy exhausted (${vertexAttempts} attempts); Fal Kling failed: ${msg}`,
      vertexAttempts,
      lastError
    )
  }
}
