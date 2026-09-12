import {
  buildIdentityPromptToken,
  promptPlacesCharacter,
} from '@/lib/imagen/promptOptimizer'
import { isHardIdentityMismatch } from '@/lib/imagen/likenessMismatch'
import type { SceneImageIntelligenceResult } from '@/lib/intelligence/scene-image-intelligence'

export interface FeaturedCharacterForValidation {
  name: string
  referenceImageUrl: string
}

export interface CharacterReferenceLike {
  name?: string
  promptToken?: string
  identityReferenceId?: number
  identityImageUrl?: string
  wardrobeDiptychImageUrl?: string
  linkingDescription?: string
}

export interface CharacterObjectLike {
  name?: string
  referenceImage?: string
}

function resolveGenerationIdentityReferenceUrl(
  charName: string,
  characterReferences: CharacterReferenceLike[],
  characterObjects: CharacterObjectLike[]
): string | undefined {
  const charRef = characterReferences.find((ref) => ref.name === charName)
  if (charRef?.wardrobeDiptychImageUrl) return charRef.wardrobeDiptychImageUrl
  if (charRef?.identityImageUrl) return charRef.identityImageUrl
  const charObj = characterObjects.find((char) => char.name === charName)
  return charObj?.referenceImage
}

export function resolveFeaturedCharactersForValidation(params: {
  characterObjects: CharacterObjectLike[]
  characterReferences: CharacterReferenceLike[]
  optimizedPrompt: string
  fullSceneContext: string
  aiResult?: SceneImageIntelligenceResult | null
  usedAIIntelligence: boolean
}): FeaturedCharacterForValidation[] {
  const {
    characterObjects,
    characterReferences,
    optimizedPrompt,
    fullSceneContext,
    aiResult,
    usedAIIntelligence,
  } = params

  if (usedAIIntelligence && aiResult?.usedAI) {
    const featured: FeaturedCharacterForValidation[] = []
    const selectedNames = new Set(
      (aiResult.selectedCharacterNames ?? []).map((name) => name.toLowerCase())
    )

    for (const charRef of characterReferences) {
      if (!charRef.name) continue

      const nameFeatured = selectedNames.has(charRef.name.toLowerCase())
      const tokenFeatured =
        !!charRef.promptToken && optimizedPrompt.includes(charRef.promptToken)
      const identityTokenFeatured =
        charRef.identityReferenceId != null &&
        optimizedPrompt.includes(buildIdentityPromptToken(charRef.identityReferenceId))

      if (!nameFeatured && !tokenFeatured && !identityTokenFeatured) continue

      const referenceImageUrl = resolveGenerationIdentityReferenceUrl(
        charRef.name,
        characterReferences,
        characterObjects
      )
      if (referenceImageUrl) {
        featured.push({ name: charRef.name, referenceImageUrl })
      }
    }

    if (featured.length > 0) return featured
  }

  // Every subject the composition places, not just the first one found.
  // Returning one meant a two-hander was half-checked: a frame that rendered
  // the right woman and the wrong man passed validation with nothing logged
  // (production 2026-09-12, where only Piper Hayes of two subjects was scored).
  const placedFeatured: FeaturedCharacterForValidation[] = []
  for (const charRef of characterReferences) {
    if (!charRef.name) continue
    if (!promptPlacesCharacter(optimizedPrompt, charRef)) continue
    const referenceImageUrl = resolveGenerationIdentityReferenceUrl(
      charRef.name,
      characterReferences,
      characterObjects
    )
    if (referenceImageUrl) {
      placedFeatured.push({ name: charRef.name, referenceImageUrl })
    }
  }
  if (placedFeatured.length > 0) return placedFeatured

  const sceneText = `${fullSceneContext || ''}`.toLowerCase()
  for (const char of characterObjects) {
    if (!char?.name) continue
    const referenceImageUrl = resolveGenerationIdentityReferenceUrl(
      char.name,
      characterReferences,
      characterObjects
    )
    if (!referenceImageUrl) continue
    if (sceneText.includes(char.name.toLowerCase())) {
      return [{ name: char.name, referenceImageUrl }]
    }
  }

  const fallbackChar = characterObjects.find((char) => char?.name && char.referenceImage)
  if (!fallbackChar?.name) return []

  return [
    {
      name: fallbackChar.name,
      referenceImageUrl:
        resolveGenerationIdentityReferenceUrl(
          fallbackChar.name,
          characterReferences,
          characterObjects
        ) ?? fallbackChar.referenceImage!,
    },
  ]
}

/**
 * Worth paying for a second generation?
 *
 * Only a hard identity mismatch is. The previous rule — any miss under 80%
 * confidence — also caught the right person rendered at a distance, or scored
 * by a validator whose reply did not parse, and a regeneration costs the user
 * both time and credits either way.
 */
export function isGenuineLikenessFailure(
  validation:
    | { matches?: boolean | null; confidence?: number | null; mismatchKind?: unknown }
    | null
    | undefined
): boolean {
  return isHardIdentityMismatch(validation)
}
