/**
 * Build the text portion of an Omni reference_to_video request.
 * Image captions are separate multimodal parts. This block points backward
 * at those images with the same person / prop / location tokens.
 */

import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'
import {
  bindingsFromReferenceRecords,
  formatImagesAboveBinding,
  formatNextImageCaption,
  rewriteVisualNamesToTokens,
} from '@/lib/vision/referenceImageBinding'

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
  const bindings = bindingsFromReferenceRecords(input.refs)
  const scenePrompt = rewriteVisualNamesToTokens(input.scenePrompt?.trim() || '', bindings)
  const parts: string[] = []

  const bindingLead = formatImagesAboveBinding(bindings)
  if (bindingLead) parts.push(bindingLead)

  if (scenePrompt) parts.push(scenePrompt)

  const guide = input.guidePrompt?.trim()
  if (guide) parts.push(guide)

  return parts.join('\n\n').trim()
}

/** Map prioritized refs to Omni reference image payloads with labels. */
export function refsToOmniReferenceImages(
  refs: PrioritizedReferenceImage[]
): Array<{ imageUrl: string; label: string; role: PrioritizedReferenceImage['role'] }> {
  const bindings = bindingsFromReferenceRecords(refs)
  return refs.map((ref, index) => {
    const binding = bindings[index]
    return {
      imageUrl: ref.imageUrl,
      label: binding ? formatNextImageCaption(binding) : ref.name,
      role: ref.role,
    }
  })
}
