/**
 * Vertex image policy ladder — sanitize and retry on Vertex only.
 */

import {
  generateVertexImage,
  type GenerateVertexImageOptions,
  type VertexImageResult,
} from '@/lib/vertexai/vertexImageClient'
import {
  isVertexContentPolicyError,
  getVeoPolicyMaxAttempts,
  ContentPolicyExhaustedError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'

export type ImageGenerationProvider = 'vertex'

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

  throw new ContentPolicyExhaustedError(
    lastError ||
      'Image generation was blocked by content policy. Try adjusting the prompt.',
    maxAttempts,
    lastError
  )
}
