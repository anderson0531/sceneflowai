import { BEAT_FRAME_CANDID_ACTION_CONSTRAINT } from '@/lib/character/characterReferenceAssembly'
import {
  buildIdentityPromptToken,
  filterCharactersForPromptRefs,
  optimizePromptForImagen,
  sanitizePromptForIdentityRefs,
  stripReferenceImageMappingBlock,
} from '@/lib/imagen/promptOptimizer'
import type { SceneImageIntelligenceResult } from '@/lib/intelligence/scene-image-intelligence'

export interface SceneImageAiPromptApplyInput {
  aiResult: SceneImageIntelligenceResult
  characterReferences: any[]
  fullSceneContext: string
  artStyle?: string
  autoDetectObjects: boolean
  autoDetectLocations: boolean
  projectObjectRefs: any[]
  projectLocationRefs: any[]
  detectedObjectReferences: any[]
  matchedLocationReference: any
  sceneType?: string
}

export interface SceneImageAiPromptApplyResult {
  optimizedPrompt: string
  usedAIIntelligence: boolean
  characterReferencesForImages: any[]
  detectedObjectReferences: any[]
  matchedLocationReference: any
  aiNegativePromptAdditions: string[]
}

export function applySceneImageAiResultToPrompt(
  input: SceneImageAiPromptApplyInput
): SceneImageAiPromptApplyResult {
  const {
    aiResult,
    characterReferences,
    fullSceneContext,
    artStyle,
    autoDetectObjects,
    autoDetectLocations,
    projectObjectRefs,
    projectLocationRefs,
    detectedObjectReferences: initialDetectedObjects,
    matchedLocationReference: initialMatchedLocation,
    sceneType,
  } = input

  let detectedObjectReferences = initialDetectedObjects
  let matchedLocationReference = initialMatchedLocation
  let characterReferencesForImages = characterReferences
  const aiNegativePromptAdditions = aiResult.negativePromptAdditions ?? []

  if (aiResult.usedAI) {
    if (autoDetectObjects && aiResult.selectedPropNames && aiResult.selectedPropNames.length > 0) {
      detectedObjectReferences = projectObjectRefs
        .filter((obj: any) => aiResult.selectedPropNames!.includes(obj.name))
        .slice(0, 4)
      console.log(
        `[Scene Image] AI selected props:`,
        detectedObjectReferences.map((o: any) => o.name).join(', ')
      )
    }

    if (autoDetectLocations && aiResult.selectedLocationName) {
      const matched = projectLocationRefs.find(
        (loc: any) =>
          loc.location === aiResult.selectedLocationName ||
          loc.name === aiResult.selectedLocationName
      )
      if (matched) {
        matchedLocationReference = matched
        console.log(`[Scene Image] AI selected location:`, matched.location || matched.name)
      }
    }
  }

  if (aiResult.usedAI && aiResult.prompt) {
    const charactersWithRefs = characterReferences.filter(
      (ref: any) => ref.identityReferenceId || ref.wardrobeReferenceId
    )

    let aiPromptBody = stripReferenceImageMappingBlock(aiResult.prompt)
    let optimizedPrompt: string
    if (charactersWithRefs.length > 0) {
      aiPromptBody = sanitizePromptForIdentityRefs(aiPromptBody, charactersWithRefs)
      const filteredForPrompt = filterCharactersForPromptRefs(
        charactersWithRefs,
        aiPromptBody,
        aiResult.selectedCharacterNames
      )
      characterReferencesForImages = characterReferences.filter((ref: any) =>
        filteredForPrompt.some((filtered) => filtered.name === ref.name)
      )
      if (filteredForPrompt.length < charactersWithRefs.length) {
        console.log(
          `[Scene Image] Filtered character refs for prompt/images: ${filteredForPrompt.map((r: any) => r.name).join(', ')} (dropped ${charactersWithRefs.length - filteredForPrompt.length})`
        )
      }
      const subjectIntroductions = filteredForPrompt
        .map(
          (ref: any) =>
            ref.promptToken ??
            (ref.identityReferenceId != null
              ? buildIdentityPromptToken(ref.identityReferenceId)
              : ref.linkingDescription)
        )
        .join(' and ')
      optimizedPrompt = `${BEAT_FRAME_CANDID_ACTION_CONSTRAINT} Cinematic film still. ${subjectIntroductions} performing the following moment in-scene (candid, not posed): ${aiPromptBody}`
    } else {
      optimizedPrompt = aiResult.prompt
    }

    console.log(
      `[Scene Image] ✓ AI intelligence generated prompt (${optimizedPrompt.length} chars, type: ${sceneType || 'unknown'})`
    )
    console.log(`[Scene Image] AI reasoning: ${aiResult.reasoning || 'none'}`)

    return {
      optimizedPrompt,
      usedAIIntelligence: true,
      characterReferencesForImages,
      detectedObjectReferences,
      matchedLocationReference,
      aiNegativePromptAdditions,
    }
  }

  console.log(`[Scene Image] AI intelligence unavailable, falling back to rules-based optimizer`)
  console.log(`[Scene Image] Fallback reason: ${aiResult.reasoning || 'unknown'}`)

  return {
    optimizedPrompt: optimizePromptForImagen({
      sceneAction: fullSceneContext,
      visualDescription: fullSceneContext,
      characterReferences,
      artStyle: artStyle || 'photorealistic',
      objectReferences: detectedObjectReferences,
    }),
    usedAIIntelligence: false,
    characterReferencesForImages,
    detectedObjectReferences,
    matchedLocationReference,
    aiNegativePromptAdditions,
  }
}
