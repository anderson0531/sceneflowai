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
  isKlingFallbackEnabled,
  getVeoPolicyMaxAttempts,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import {
  createKlingImageGeneration,
  waitForKlingImageTask,
  downloadKlingAsset,
} from '@/lib/kling/client'

export type ImageGenerationProvider = 'vertex' | 'kling'

export interface VertexKlingImageResult extends VertexImageResult {
  generationProvider: ImageGenerationProvider
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

  if (!isKlingFallbackEnabled()) {
    throw new ContentPolicyExhaustedError(lastError, maxAttempts, lastError)
  }

  try {
    const taskId = await createKlingImageGeneration({
      prompt,
      negative_prompt: options.negativePrompt,
      aspect_ratio: options.aspectRatio || '16:9',
    })
    const done = await waitForKlingImageTask(taskId)
    if (!done.imageUrl) throw new Error('Kling image completed without URL')
    const buf = await downloadKlingAsset(done.imageUrl)
    return {
      imageBase64: buf.toString('base64'),
      mimeType: 'image/png',
      provider: 'vertex',
      modelId: 'kling-image',
      generationProvider: 'kling',
      wasPolicyFallback: true,
      vertexAttempts: maxAttempts,
    }
  } catch (klingErr) {
    const msg = klingErr instanceof Error ? klingErr.message : String(klingErr)
    throw new ContentPolicyExhaustedError(
      `Vertex image policy exhausted; Kling failed: ${msg}`,
      maxAttempts,
      lastError
    )
  }
}
