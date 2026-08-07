/**
 * Frame Edit IMAGE_SAFETY ladder — soften instruction, then upgrade to Pro.
 *
 * Frame Edit defaults to eco/flash and historically failed hard on
 * finishReason=IMAGE_SAFETY. Soften the edit instruction first, then retry on
 * designer (gemini-3-pro-image). Do not reuse wardrobe "production still" framing.
 */

import {
  editVertexImage,
  type VertexImageEditOptions,
  type VertexImageResult,
  type VertexImageTier,
} from '@/lib/vertexai/vertexImageClient'
import {
  ContentPolicyExhaustedError,
  isVertexContentPolicyError,
} from '@/lib/generation/contentPolicy'
import { autoSanitizePrompt } from '@/utils/promptModerator'

const PREVIS_EDIT_SOFTEN_FRAMING =
  'Pre-visualization storyboard edit only: apply a minimal, theatrical, non-graphic continuity adjustment suitable for adult film production stills. Preserve identity and framing unless the instruction explicitly requires otherwise.'

export const EDIT_POLICY_USER_MESSAGE =
  'Edit blocked by image safety — try a simpler change or Soften Wardrobe first'

export interface EditVertexPolicyResult extends VertexImageResult {
  wasPolicyFallback: boolean
  vertexAttempts: number
  modelTierUsed: VertexImageTier
}

/**
 * Soften an edit instruction after IMAGE_SAFETY / content-policy failure.
 * @param failedAttempt 1-based attempt that just failed
 */
export function escalateEditInstructionForRetry(
  instruction: string,
  failedAttempt: number
): string {
  let next = instruction
  const sp = autoSanitizePrompt(next, { logChanges: true })
  if (sp.wasModified) next = sp.sanitizedPrompt

  if (failedAttempt >= 1 && !next.includes('Pre-visualization storyboard edit only')) {
    next = `${next.trim()}\n\n${PREVIS_EDIT_SOFTEN_FRAMING}`
    console.log('[VertexEditPolicy] Appended pre-vis soften framing for IMAGE_SAFETY retry')
  }

  return next
}

function resolveTier(tier: VertexImageTier | undefined): VertexImageTier {
  return tier ?? 'eco'
}

/**
 * Attempt 1: original instruction + requested tier
 * Attempt 2: softened instruction + same tier
 * Attempt 3: softened instruction + designer/Pro (if not already)
 */
export async function editImageWithVertexPolicyRetry(
  options: VertexImageEditOptions
): Promise<EditVertexPolicyResult> {
  const requestedTier = resolveTier(options.modelTier)
  let instruction = options.instruction
  let modelTier = requestedTier
  let lastError = ''
  const maxAttempts = requestedTier === 'designer' || requestedTier === 'director' ? 2 : 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await editVertexImage({
        ...options,
        instruction,
        modelTier,
      })
      return {
        ...result,
        wasPolicyFallback: attempt > 1,
        vertexAttempts: attempt,
        modelTierUsed: modelTier,
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      if (!isVertexContentPolicyError(lastError)) throw e
      console.warn(
        `[VertexEditPolicy] Attempt ${attempt}/${maxAttempts} blocked on ${modelTier}: ${lastError.slice(0, 180)}`
      )
      if (attempt >= maxAttempts) break

      // Soften after first failure; upgrade to Pro for the final attempt when started on eco.
      instruction = escalateEditInstructionForRetry(instruction, attempt)
      if (attempt >= 2 && modelTier === 'eco') {
        modelTier = 'designer'
        console.log('[VertexEditPolicy] Upgrading Frame Edit to designer after IMAGE_SAFETY')
      }
    }
  }

  throw new ContentPolicyExhaustedError(EDIT_POLICY_USER_MESSAGE, maxAttempts, lastError)
}
