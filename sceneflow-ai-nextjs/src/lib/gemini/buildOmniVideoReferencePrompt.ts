/**
 * Build labeled multimodal preamble for Gemini Omni reference_to_video.
 */

import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'

export interface OmniVideoReferencePromptInput {
  scenePrompt: string
  refs: PrioritizedReferenceImage[]
  guidePrompt?: string
  negativePrompt?: string
}

function roleInstruction(ref: PrioritizedReferenceImage, index: number): string {
  const n = index + 1
  switch (ref.role) {
    case 'identity':
      return `- Reference image ${n}: IDENTITY for character — ${ref.name}. Match face, hair, and skin tone exactly.`
    case 'wardrobe':
      return `- Reference image ${n}: WARDROBE for character — ${ref.name}. Match outfit, colors, and accessories.`
    case 'location':
      return `- Reference image ${n}: LOCATION — ${ref.name}. Match environment, architecture, and lighting.`
    case 'prop-critical':
    case 'prop-important':
    case 'prop-other':
      return `- Reference image ${n}: PROP — ${ref.name}. Include this object prominently when referenced in the scene.`
    default:
      return `- Reference image ${n}: ${ref.name}`
  }
}

/**
 * Compose the text portion of an Omni REF video request.
 * Image order in multimodal input must match reference numbering here.
 */
export function buildOmniVideoReferencePrompt(input: OmniVideoReferencePromptInput): string {
  const parts: string[] = []

  if (input.refs.length > 0) {
    parts.push('REFERENCE IMAGES (use each as specified):')
    input.refs.forEach((ref, i) => {
      parts.push(roleInstruction(ref, i))
    })
    parts.push('')
    parts.push(
      'When characters speak, match lip sync and voice to the dialogue in the audio guide below. ' +
        'Preserve identity from identity references and wardrobe from wardrobe references.'
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

  let text = parts.join('\n').trim()
  if (input.negativePrompt?.trim()) {
    text += `\n\nDo not include: ${input.negativePrompt.trim()}`
  }
  return text
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
