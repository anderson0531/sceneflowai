import {
  filterCharactersForPromptRefs,
  optimizePromptForImagen,
  sanitizePromptForIdentityRefs,
  stripReferenceImageMappingBlock,
} from '@/lib/imagen/promptOptimizer'
import { matchObjectsBySelectedNames, libraryNamesFuzzyMatch } from '@/lib/character/matching'
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
  protectPhrases?: string[]
  /** Beat frames take an empty cast at face value; see filterCharactersForPromptRefs. */
  isBeatFrame?: boolean
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
    protectPhrases,
    isBeatFrame,
  } = input

  let detectedObjectReferences = initialDetectedObjects
  let matchedLocationReference = initialMatchedLocation
  let characterReferencesForImages = characterReferences
  const aiNegativePromptAdditions = aiResult.negativePromptAdditions ?? []

  if (aiResult.usedAI) {
    if (autoDetectObjects && aiResult.selectedPropNames && aiResult.selectedPropNames.length > 0) {
      const matched = matchObjectsBySelectedNames(aiResult.selectedPropNames, projectObjectRefs)
      if (matched.length > 0) {
        detectedObjectReferences = matched.slice(0, 4)
      }
      console.log(
        `[Scene Image] AI selected props:`,
        detectedObjectReferences.map((o: any) => o.name).join(', ')
      )
    }

    if (autoDetectLocations && aiResult.selectedLocationName) {
      const selected = aiResult.selectedLocationName
      const matched = projectLocationRefs.find((loc: any) => {
        const libraryName = loc.location || loc.name || ''
        return libraryNamesFuzzyMatch(selected, libraryName)
      })
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
      aiPromptBody = sanitizePromptForIdentityRefs(aiPromptBody, charactersWithRefs, {
        protectPhrases,
      })
      const filteredForPrompt = filterCharactersForPromptRefs(
        charactersWithRefs,
        aiPromptBody,
        aiResult.selectedCharacterNames,
        // A beat frame that names nobody wants no cast, not the whole scene's.
        { allowEmpty: isBeatFrame }
      )
      characterReferencesForImages = characterReferences.filter((ref: any) =>
        filteredForPrompt.some((filtered) => filtered.name === ref.name)
      )
      if (filteredForPrompt.length < charactersWithRefs.length) {
        console.log(
          `[Scene Image] Filtered character refs for prompt/images: ${filteredForPrompt.map((r: any) => r.name).join(', ')} (dropped ${charactersWithRefs.length - filteredForPrompt.length})`
        )
      }
      optimizedPrompt = aiPromptBody
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
