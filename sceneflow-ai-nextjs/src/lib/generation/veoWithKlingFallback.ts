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
  isKlingFallbackEnabled,
  getVeoPolicyMaxAttempts,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import {
  createKlingText2Video,
  createKlingImage2Video,
  waitForKlingVideoTask,
  downloadKlingAsset,
} from '@/lib/kling/client'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

export type GenerationProvider = 'vertex' | 'kling'

export interface VeoKlingVideoResult {
  status: 'COMPLETED' | 'FAILED'
  videoBuffer?: Buffer
  operationName?: string
  videoUrl?: string
  veoVideoRef?: string
  veoVideoRefExpiry?: string
  error?: string
  generationProvider: GenerationProvider
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

async function runKlingVideo(
  prompt: string,
  method: VideoGenerationMethod,
  options: VideoGenerationOptions
): Promise<Buffer> {
  const klingOpts = stripExtForKling(options)
  const duration = Math.min(10, Math.max(5, klingOpts.durationSeconds === 8 ? 5 : 5))
  const aspect = klingOpts.aspectRatio || '16:9'

  let taskId: string
  if (method === 'I2V' || method === 'FTV' || method === 'EXT') {
    const imageUrl = klingOpts.startFrame?.startsWith('http') ? klingOpts.startFrame : undefined
    const imageBase64 =
      klingOpts.startFrame && !imageUrl
        ? klingOpts.startFrame.replace(/^data:[^;]+;base64,/, '')
        : undefined
    if (!imageUrl && !imageBase64) {
      throw new Error('Kling image2video requires startFrame URL or base64')
    }
    const tailUrl = klingOpts.lastFrame?.startsWith('http') ? klingOpts.lastFrame : undefined
    const tailBase64 =
      klingOpts.lastFrame && !tailUrl
        ? klingOpts.lastFrame.replace(/^data:[^;]+;base64,/, '')
        : undefined
    taskId = await createKlingImage2Video({
      prompt,
      negative_prompt: klingOpts.negativePrompt,
      image_url: imageUrl,
      image_base64: imageBase64,
      image_tail_url: tailUrl,
      image_tail_base64: tailBase64,
      duration,
      aspect_ratio: aspect,
    })
  } else {
    taskId = await createKlingText2Video({
      prompt,
      negative_prompt: klingOpts.negativePrompt,
      duration,
      aspect_ratio: aspect,
    })
  }

  const done = await waitForKlingVideoTask(taskId)
  if (!done.videoUrl) throw new Error('Kling completed without video URL')
  return downloadKlingAsset(done.videoUrl)
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
          const next = downgradeMethod(method)
          if (next !== method) {
            method = next
            if (method === 'I2V' || method === 'T2V') {
              options = stripExtForKling(options)
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

  if (!isKlingFallbackEnabled()) {
    throw new ContentPolicyExhaustedError(
      lastError || 'Vertex content policy blocked all attempts',
      vertexAttempts,
      lastError
    )
  }

  try {
    const buffer = await runKlingVideo(prompt, method, options)
    return {
      status: 'COMPLETED',
      videoBuffer: buffer,
      generationProvider: 'kling',
      wasPolicyFallback: true,
      vertexAttempts,
      finalMethod: method,
    }
  } catch (klingErr) {
    const msg = klingErr instanceof Error ? klingErr.message : String(klingErr)
    throw new ContentPolicyExhaustedError(
      `Vertex policy exhausted (${vertexAttempts} attempts); Kling failed: ${msg}`,
      vertexAttempts,
      lastError
    )
  }
}
