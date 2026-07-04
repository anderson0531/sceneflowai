/**
 * Build labeled multimodal preamble for Gemini Omni reference_to_video.
 * Keep text minimal — mirrors concise Gemini chat prompts to avoid policy false positives.
 */

import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'

export interface OmniVideoReferencePromptInput {
  scenePrompt: string
  refs: PrioritizedReferenceImage[]
  guidePrompt?: string
}

/**
 * Compose the text portion of an Omni REF video request.
 * Per-image labels are sent as separate multimodal parts; keep this block concise.
 */
export function buildOmniVideoReferencePrompt(input: OmniVideoReferencePromptInput): string {
  const parts: string[] = []

  const scenePrompt = input.scenePrompt?.trim()
  if (scenePrompt) {
    parts.push(scenePrompt)
  }

  if (input.refs.length > 0) {
    if (parts.length > 0) parts.push('')
    parts.push(
      'References: keep the subject, wardrobe, and location consistent with the provided images.'
    )
  }

  const guide = input.guidePrompt?.trim()
  if (guide) {
    parts.push('')
    parts.push(guide)
  }

  return parts.join('\n').trim()
}

/** Map prioritized refs to Omni reference image payloads with labels. */
export function refsToOmniReferenceImages(
  refs: PrioritizedReferenceImage[]
): Array<{ imageUrl: string; label: string; role: PrioritizedReferenceImage['role'] }> {
  return refs.map((ref) => ({
    imageUrl: ref.imageUrl,
    label: ref.name,
    role: ref.role,
  }))
}
