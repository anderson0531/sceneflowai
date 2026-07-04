/**
 * Build labeled multimodal preamble for Gemini Omni reference_to_video.
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

  if (input.refs.length > 0) {
    parts.push(
      'Use the provided reference images for identity, wardrobe, and location. ' +
        'Keep the subject consistent with the references.'
    )
    parts.push('')
    parts.push(
      'When characters speak, match lip sync and voice to the dialogue in the audio guide below.'
    )
    parts.push('')
  }

  const scenePrompt = input.scenePrompt?.trim()
  if (scenePrompt) {
    parts.push('SCENE ACTION:')
    parts.push(scenePrompt)
    parts.push('')
  }

  const guide = input.guidePrompt?.trim()
  if (guide) {
    parts.push('AUDIO / DIALOGUE GUIDE:')
    parts.push(guide)
    parts.push('')
    parts.push(
      'Include native synchronized audio (dialogue, ambience, and music) matching the guide above unless the scene should be silent.'
    )
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
