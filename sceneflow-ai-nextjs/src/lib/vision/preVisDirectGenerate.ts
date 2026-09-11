/**
 * Shared Direct (Prompt Builder) payload for Pre-Vis beat frames.
 * Always uses the Auto compiler — never send customPrompt.
 */

import type { ModelTier, ThinkingLevel } from '@/components/image-gen/constants'
import type { TalentDirection, VisualSetup } from '@/components/image-gen/types'
import { GALLERY_DIRECT_GENERATE_OPTS } from '@/lib/vision/galleryImageGeneration'

export interface PreVisDirectApiOverlayInput {
  visualSetup: VisualSetup
  talentDirection: TalentDirection
  userDirection?: string
  artStyle: string
  modelTier: ModelTier
  thinkingLevel: ThinkingLevel
  negativePrompt?: string
}

/** Fields merged into POST /api/scene/generate-image for Direct generate. */
export function buildPreVisDirectApiFields(
  options: PreVisDirectApiOverlayInput
): Record<string, unknown> {
  const userDirection = options.userDirection?.trim()
  const negativePrompt = options.negativePrompt?.trim()
  return {
    ...GALLERY_DIRECT_GENERATE_OPTS,
    artStyle: options.artStyle,
    shotType: options.visualSetup.shotType,
    cameraAngle: options.visualSetup.cameraAngle,
    lighting: options.visualSetup.lighting,
    visualSetup: options.visualSetup,
    talentDirection: options.talentDirection,
    modelTier: options.modelTier,
    thinkingLevel: options.thinkingLevel,
    ...(userDirection ? { userDirection } : {}),
    ...(negativePrompt ? { negativePrompt } : {}),
  }
}

/** Direct mode must not skip scene-image intelligence for a raw custom prompt. */
export function shouldUseCustomPromptOverride(
  generationMode: unknown,
  customPrompt?: string | null
): boolean {
  if (generationMode === 'direct') return false
  return Boolean(customPrompt?.trim())
}
