/**
 * Creative still path: Direct Kling IMAGE 3.0 Omni.
 * Called only when stillPolicyMode is 'creative'. Never from Express auto.
 *
 * No Hive. Do not import HiveModerationService or klingSafetyGuard.
 * Not Fal. Do not import @/lib/fal.
 */

import { getKlingFallbackProvider } from '@/lib/generation/contentPolicy'
import { CREATIVE_KLING_UNAVAILABLE_MESSAGE } from '@/lib/generation/stillPolicy'
import type { PrioritizedReferenceImage } from '@/lib/vision/referenceLimits'
import {
  persistKlingElementIdsToProject,
  resolveKlingElementsFromSources,
  type KlingElementSource,
} from './elementRegistry'
import { runKlingOmniImage, type KlingOmniImageResolution } from './klingDirectClient'
import {
  buildKlingCharacterSourcesFromRefs,
  mapSceneImageToKlingOmni,
  type CharacterOrdinalRef,
} from './klingOmniImagePromptMapper'

export interface GenerateKlingOmniStillInput {
  prompt: string
  selectedReferences: PrioritizedReferenceImage[]
  characterOrdinals?: CharacterOrdinalRef[]
  characterSources?: KlingElementSource[]
  characterLibrary?: Array<{
    id?: string
    name?: string
    referenceImage?: string
    klingElementId?: string
    wardrobes?: Array<{
      id?: string
      name?: string
      headshotUrl?: string
      fullBodyUrl?: string
      klingElementId?: string
    }>
  }>
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
  projectId?: string
  resolution?: KlingOmniImageResolution
  aspectRatio?: string
}

export interface GenerateKlingOmniStillResult {
  imageBase64: string
  modelId: 'kling-v3-omni'
  prompt: string
  wasPolicyFallback: true
}

export async function generateKlingOmniStill(
  input: GenerateKlingOmniStillInput
): Promise<GenerateKlingOmniStillResult> {
  if (!getKlingFallbackProvider()) {
    throw new Error(CREATIVE_KLING_UNAVAILABLE_MESSAGE)
  }

  const characterSources =
    input.characterSources ??
    buildKlingCharacterSourcesFromRefs({
      selectedReferences: input.selectedReferences,
      characterObjects: input.characterLibrary,
      characterWardrobes: input.characterWardrobes,
    })

  const resolved = await resolveKlingElementsFromSources(characterSources, 'kling-v3-omni')
  const characterElementIds = new Map<string, string>()
  for (const binding of resolved.bindings) {
    characterElementIds.set(binding.name, binding.elementId)
  }

  const mapped = mapSceneImageToKlingOmni({
    scenePrompt: input.prompt,
    selectedReferences: input.selectedReferences,
    characterOrdinals: input.characterOrdinals,
    characterElementIds,
  })

  const buffer = await runKlingOmniImage({
    prompt: mapped.prompt,
    elementList: mapped.elementList,
    imageList: mapped.imageList,
    resolution: input.resolution ?? '1k',
    aspectRatio: input.aspectRatio ?? '16:9',
  })

  if (input.projectId && resolved.newRegistrations.length > 0) {
    await persistKlingElementIdsToProject(input.projectId, resolved.newRegistrations)
  }

  return {
    imageBase64: buffer.toString('base64'),
    modelId: 'kling-v3-omni',
    prompt: mapped.prompt,
    wasPolicyFallback: true,
  }
}
