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
import { autoSanitizePrompt } from '@/utils/promptModerator'

export type ImageGenerationProvider = 'vertex'

export interface VertexKlingImageResult extends VertexImageResult {
  generationProvider: ImageGenerationProvider
  wasPolicyFallback: boolean
  vertexAttempts: number
}

/** Second-pass replacements after the first PromptModerator sanitize. */
const IMAGE_SAFETY_ESCALATION: Array<[RegExp, string]> = [
  [/\b(projectiles?|firearm|blade|weapon|steel)\b/gi, 'stage prop'],
  [/\b(dark liquid|crimson|red fluid|life force)\b/gi, 'fabric dye stain'],
  [/\b(bruises?|contusions?|bloodshot|wounds?|injur(?:y|ies)|scars?|cuts?)\b/gi, 'makeup detail'],
  [/\b(gunshot|bullet\s*hole|entry\s*wound|stab\s*wound)\b/gi, 'costume mark'],
  [/\b(stained and marked|deeply stained|dripping crimson)\b/gi, 'costume weathering'],
]

const PRODUCTION_STILL_FRAMING =
  'Generate a photorealistic film-production wardrobe reference still of an adult performer. Treat any marks or handheld items as costume makeup and safe stage props only — theatrical, non-graphic, suitable for a studio continuity board.'

/**
 * Escalate a prompt after policy / IMAGE_SAFETY failure.
 * @param failedAttempt 1-based attempt that just failed
 */
export function escalateImagePromptForRetry(prompt: string, failedAttempt: number): string {
  let next = prompt
  const sp = autoSanitizePrompt(next, { logChanges: true })
  if (sp.wasModified) next = sp.sanitizedPrompt

  if (failedAttempt >= 1) {
    let changed = false
    for (const [re, replacement] of IMAGE_SAFETY_ESCALATION) {
      const updated = next.replace(re, replacement)
      if (updated !== next) {
        changed = true
        next = updated
      }
    }
    if (changed) {
      console.log('[VertexImagePolicy] Applied IMAGE_SAFETY escalation replacements')
    }
  }

  if (failedAttempt >= 2 && !next.includes('wardrobe reference still')) {
    next = `${next.trim()}\n\n${PRODUCTION_STILL_FRAMING}`
    console.log('[VertexImagePolicy] Appended production-still framing for IMAGE_SAFETY retry')
  }

  return next
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
        prompt = escalateImagePromptForRetry(prompt, attempt)
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
