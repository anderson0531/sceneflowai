/**
 * Vertex image policy ladder — sanitize and retry on Vertex only.
 *
 * Production logs (2026-08-07): designer pro returned IMAGE_SAFETY, word sanitize
 * ran once, then a module-level 429 cooldown forced gemini-2.5-flash-image which
 * rate-limited and still hit IMAGE_SAFETY. This ladder escalates the prompt on
 * each policy failure; the image client keeps identity-ref jobs on pro.
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
import { escalateImagePromptForRetry } from '@/lib/generation/imagePolicyEscalation'

export type ImageGenerationProvider = 'vertex'

export interface VertexKlingImageResult extends VertexImageResult {
  generationProvider: ImageGenerationProvider
  wasPolicyFallback: boolean
  vertexAttempts: number
}

// The escalation itself moved to `imagePolicyEscalation` so the image client can
// soften a refused prompt before spending its one pro attempt. Re-exported here
// because this module is where callers expect to find it.
export {
  IMAGE_SAFETY_ESCALATION,
  PRODUCTION_STILL_FRAMING,
  escalateImagePromptForRetry,
} from '@/lib/generation/imagePolicyEscalation'

export async function generateImageWithVertexKlingFallback(
  options: GenerateVertexImageOptions
): Promise<VertexKlingImageResult> {
  const maxAttempts = options.policyMaxAttempts ?? getVeoPolicyMaxAttempts()
  let prompt = options.prompt
  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateVertexImage({ ...options, prompt })
      return {
        ...result,
        generationProvider: 'vertex',
        wasPolicyFallback: attempt > 1,
        vertexAttempts: attempt,
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      if (!isVertexContentPolicyError(lastError)) throw e
      console.warn(
        `[VertexImagePolicy] Attempt ${attempt}/${maxAttempts} blocked: ${lastError.slice(0, 180)}`
      )
      if (attempt < maxAttempts) {
        prompt = escalateImagePromptForRetry(prompt, attempt, {
          skipProductionStillFraming: options.skipProductionStillFraming,
        })
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
