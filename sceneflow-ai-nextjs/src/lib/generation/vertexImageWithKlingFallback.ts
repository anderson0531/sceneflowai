/**
 * Vertex image policy ladder → Kling image fallback.
 */

import {
  generateVertexImage,
  type GenerateVertexImageOptions,
  type VertexImageResult,
} from '@/lib/vertexai/vertexImageClient'
import {
  isVertexContentPolicyError,
  isFalKlingFallbackEnabled,
  getVeoPolicyMaxAttempts,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { runFalKlingImage } from '@/lib/fal/klingPolicyClient'
import { FAL_KLING_FALLBACK_MODEL_FAMILY, getFalKlingImageModel } from '@/lib/fal/config'

export type ImageGenerationProvider = 'vertex' | 'fal'

export interface VertexKlingImageResult extends VertexImageResult {
  generationProvider: ImageGenerationProvider
  fallbackModelFamily?: typeof FAL_KLING_FALLBACK_MODEL_FAMILY
  wasPolicyFallback: boolean
  vertexAttempts: number
}

export async function generateImageWithVertexKlingFallback(
  options: GenerateVertexImageOptions
): Promise<VertexKlingImageResult> {
  const maxAttempts = getVeoPolicyMaxAttempts()
  let prompt = options.prompt
  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateVertexImage({ ...options, prompt })
      return {
        ...result,
        generationProvider: 'vertex',
        wasPolicyFallback: false,
        vertexAttempts: attempt,
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      if (!isVertexContentPolicyError(lastError)) throw e
      if (attempt < maxAttempts) {
        const sp = autoSanitizePrompt(prompt, { logChanges: true })
        if (sp.wasModified) prompt = sp.sanitizedPrompt
      }
    }
  }

  if (!isFalKlingFallbackEnabled()) {
    throw new ContentPolicyExhaustedError(lastError, maxAttempts, lastError)
  }

  try {
    const buf = await runFalKlingImage({
      prompt,
      negative_prompt: options.negativePrompt,
      aspect_ratio: options.aspectRatio || '16:9',
    })
    return {
      imageBase64: buf.toString('base64'),
      mimeType: 'image/png',
      provider: 'vertex',
      modelId: getFalKlingImageModel(),
      generationProvider: 'fal',
      fallbackModelFamily: FAL_KLING_FALLBACK_MODEL_FAMILY,
      wasPolicyFallback: true,
      vertexAttempts: maxAttempts,
    }
  } catch (falErr) {
    const msg = falErr instanceof Error ? falErr.message : String(falErr)
    throw new ContentPolicyExhaustedError(
      `Vertex image policy exhausted; Fal Kling failed: ${msg}`,
      maxAttempts,
      lastError
    )
  }
}
