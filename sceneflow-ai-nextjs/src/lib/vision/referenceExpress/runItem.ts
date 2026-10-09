import { resolveStoryLocale } from '@/i18n/server/storyLocale'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import { buildObjectReferencePrompt } from '@/lib/vision/referenceExpressPrompts'
import { resolveCastIdentityGenerationPrompt } from '@/lib/intelligence/reference-still-director-fallback'
import { castAppearanceAfterImage } from '@/lib/character/castAppearanceAfterImage'
import { refreshCastingBriefForAppearance } from '@/lib/character/applyCastingBriefUpdate'
import { generateCastingBrief } from '@/lib/character/generateCastingBrief'
import type { ScreenplayContext } from '@/lib/voiceRecommendation'
import type { ObjectCategory, VisualReference } from '@/types/visionReferences'
import {
  generateCastReferenceImage,
  generateLocationReferenceImage,
  generateLocationVersionReferenceImage,
  generateObjectReferenceImage,
} from './generateReferenceImage'
import {
  castFingerprint,
  loadReferenceExpressContext,
  locationFingerprint,
  locationVersionFingerprint,
  propFingerprint,
  wardrobeFingerprint,
  type CastSource,
  type LocationSource,
  type PropSource,
} from './planItems'
import { persistReferenceImage } from './persistReferenceImage'
import type { ReferenceExpressItem, ReferenceExpressItemResult } from './types'
import {
  mountedFixturesForLocation,
  withMountedFixturesInLocationDescription,
} from '@/lib/vision/mountedSetFixtures'
import { generateAndUploadFullBodyWardrobe } from '@/lib/character/sceneCharacterHeadshot'
import {
  composeUploadAndPersistCombinedCharacterRef,
  recomposeCombinedCharacterRefsForCast,
  wardrobeExpectedFingerprint,
} from '@/lib/character/combinedCharacterRef'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { quoteAndCharge } from '@/lib/credits/chargeQuotedGeneration'

const hasImage = (url?: string): boolean => Boolean(url && url.trim())

function skipped(
  item: ReferenceExpressItem,
  reason: 'missing' | 'already-generated'
): ReferenceExpressItemResult {
  return {
    kind: item.kind,
    targetId: item.targetId,
    label: item.label,
    status: 'skipped',
    skippedReason: reason,
  }
}

/**
 * Generate and save one reference image.
 *
 * Prompt inputs are read fresh here rather than snapshotted at enqueue, so an
 * edit made while the batch was queued is honoured instead of overwritten. The
 * fingerprint taken at this moment is what `persistReferenceImage` compares
 * against, which narrows "stale" to its useful meaning: the source changed
 * while this specific image was being drawn.
 *
 * Targets that vanished, or that the user filled in by hand mid-run, are
 * skipped rather than regenerated — the batch never spends credits to clobber
 * a newer image.
 */
export async function runReferenceExpressItem(input: {
  userId: string
  projectId: string
  item: ReferenceExpressItem
}): Promise<ReferenceExpressItemResult> {
  const { userId, projectId, item } = input

  const context = await loadReferenceExpressContext(projectId)
  if (!context) {
    throw new Error('Project not found')
  }

  if (item.kind === 'cast') {
    const index = context.characters.findIndex(
      (character, idx) => resolveCharacterId(character, idx) === item.targetId
    )
    const character = index >= 0 ? (context.characters[index] as CastSource) : undefined
    if (!character) return skipped(item, 'missing')

    if (item.wardrobeId) {
      return runWardrobeItem({ userId, projectId, item, character })
    }

    if (hasImage(character.referenceImage) && !item.forceRegenerate) {
      return skipped(item, 'already-generated')
    }

    const resolvedPrompt = resolveCastIdentityGenerationPrompt(character)
    const prompt = resolvedPrompt.prompt
    const usedFingerprint = castFingerprint(character)

    const generated = await generateCastReferenceImage({
      userId,
      projectId,
      prompt,
      characterId: item.targetId,
      characterName: character.name,
      rawMode: resolvedPrompt.rawMode,
    })

    const appearance = castAppearanceAfterImage({
      existingAppearance: character.appearanceDescription,
      visionDescription: generated.visionDescription,
    })

    /**
     * The portrait is saved before the Casting Brief is asked for. The brief is
     * text metadata derived from the body description, so it does not belong
     * on the path that decides whether this item's two designer-tier
     * generations have to be paid for again: if the isolate runs out of budget
     * during the LLM call, the retry now sees the image and skips.
     */
    const { saved, staleSource } = await persistReferenceImage({
      projectId,
      kind: 'cast',
      targetId: item.targetId,
      expectedFingerprint: usedFingerprint,
      patch: {
        referenceImage: generated.imageUrl,
        imagePrompt: prompt,
        ...appearance.patch,
      },
    })

    if (!saved) return skipped(item, 'missing')

    await recomposeCombinedCharacterRefsForCast({
      projectId,
      characterId: item.targetId,
      identityUrl: generated.imageUrl,
      characterName: character.name,
      wardrobes: character.wardrobes,
    })

    if (appearance.briefAppearance) {
      const castingFields = await castingBriefFields({
        character,
        appearanceDescription: appearance.briefAppearance,
        screenplayContext: context.screenplayContext,
      })
      if (Object.keys(castingFields).length > 0) {
        await persistReferenceImage({
          projectId,
          kind: 'cast',
          targetId: item.targetId,
          // Filling an empty body description changes the cast fingerprint.
          // A description the director already saved does not, so the brief
          // compares against the same digest as the portrait write.
          expectedFingerprint: appearance.appearanceChanged
            ? castFingerprint({
                ...character,
                appearanceDescription: appearance.briefAppearance,
              })
            : usedFingerprint,
          patch: castingFields,
        })
      }
    }
    return {
      kind: item.kind,
      targetId: item.targetId,
      label: character.name?.trim() || item.label,
      status: 'succeeded',
      imageUrl: generated.imageUrl,
      ...(staleSource ? { staleSource } : {}),
    }
  }

  const locale = await resolveStoryLocale({ projectId, userIdOrEmail: userId })

  if (item.kind === 'location') {
    const location = context.locations.find((entry) => entry.id === item.targetId) as
      | LocationSource
      | undefined
    if (!location) return skipped(item, 'missing')

    if (item.versionId) {
      return runLocationVersionItem({ userId, projectId, item, location, locale })
    }

    if (hasImage(location.imageUrl) && !item.forceRegenerate) {
      return skipped(item, 'already-generated')
    }

    const usedFingerprint = locationFingerprint(location)
    const scenes = context.scenes || []
    const fixtures = mountedFixturesForLocation(location, scenes)
    const description = withMountedFixturesInLocationDescription(location.description, fixtures)
    const storedPrompt =
      typeof location.generationPrompt === 'string' && location.generationPrompt.trim()
        ? location.generationPrompt.trim()
        : undefined

    const generated = await generateLocationReferenceImage({
      userId,
      projectId,
      locationName: location.location || location.locationDisplay || 'Location',
      intExt: location.intExt,
      timeOfDay: location.timeOfDay,
      description,
      locationPrompt: storedPrompt
        ? withMountedFixturesInLocationDescription(storedPrompt, fixtures)
        : undefined,
      locale,
    })

    const { saved, staleSource } = await persistReferenceImage({
      projectId,
      kind: 'location',
      targetId: item.targetId,
      expectedFingerprint: usedFingerprint,
      patch: {
        imageUrl: generated.imageUrl,
        generationPrompt: generated.prompt,
        description,
      },
    })

    if (!saved) return skipped(item, 'missing')
    return {
      kind: item.kind,
      targetId: item.targetId,
      label: location.location?.trim() || item.label,
      status: 'succeeded',
      imageUrl: generated.imageUrl,
      ...(staleSource ? { staleSource } : {}),
    }
  }

  const prop = context.props.find((entry) => entry.id === item.targetId) as
    | PropSource
    | undefined
  if (!prop) return skipped(item, 'missing')
  if (hasImage(prop.imageUrl) && !item.forceRegenerate) return skipped(item, 'already-generated')

  const usedFingerprint = propFingerprint(prop)

  const generated = await generateObjectReferenceImage({
    userId,
    name: prop.name || item.label,
    prompt: buildObjectReferencePrompt(prop as unknown as VisualReference),
    category: prop.category as ObjectCategory | undefined,
    locale,
  })

  const { saved, staleSource } = await persistReferenceImage({
    projectId,
    kind: 'prop',
    targetId: item.targetId,
    expectedFingerprint: usedFingerprint,
    patch: {
      imageUrl: generated.imageUrl,
      updatedAt: new Date().toISOString(),
    },
  })

  if (!saved) return skipped(item, 'missing')
  return {
    kind: item.kind,
    targetId: item.targetId,
    label: prop.name?.trim() || item.label,
    status: 'succeeded',
    imageUrl: generated.imageUrl,
    ...(staleSource ? { staleSource } : {}),
  }
}

/**
 * Re-derive the Casting Brief from the body description that remains after
 * the portrait. Vision analysis fills that text only when it was empty.
 * A brief failure must not fail the image.
 */
async function castingBriefFields(input: {
  character: CastSource
  appearanceDescription: string
  screenplayContext: ScreenplayContext
}): Promise<Record<string, unknown>> {
  try {
    const applied = await refreshCastingBriefForAppearance({
      character: {
        name: input.character.name,
        type: input.character.type,
        role: input.character.role,
        gender: input.character.gender,
        age: input.character.age,
        ethnicity: input.character.ethnicity,
        voiceDescription: input.character.voiceDescription,
        voiceConfig: input.character.voiceConfig,
      },
      appearanceDescription: input.appearanceDescription,
      screenplayContext: input.screenplayContext,
      hasPortrait: true,
      generate: generateCastingBrief,
    })
    if (!applied) return {}
    return {
      voiceDescription: applied.voiceDescription,
      ...(applied.voiceConfig ? { voiceConfig: applied.voiceConfig } : {}),
    }
  } catch (error) {
    console.warn(
      '[ReferenceExpress] Casting brief refresh failed:',
      (error as Error)?.message
    )
    return {}
  }
}

function wardrobeLookUrl(wardrobe: NonNullable<CastSource['wardrobes']>[number]): string | undefined {
  for (const field of ['headshotUrl', 'fullBodyUrl', 'previewImageUrl'] as const) {
    const value = wardrobe[field]
    if (hasImage(value)) return value!.trim()
  }
  return undefined
}

async function runWardrobeItem(input: {
  userId: string
  projectId: string
  item: ReferenceExpressItem
  character: CastSource
}): Promise<ReferenceExpressItemResult> {
  const { userId, projectId, item, character } = input
  const wardrobe = (character.wardrobes || []).find((row) => row.id === item.wardrobeId)
  if (!wardrobe?.id) return skipped(item, 'missing')
  if (!hasImage(character.referenceImage)) return skipped(item, 'missing')
  if (!wardrobe.description?.trim()) return skipped(item, 'missing')
  if (wardrobeLookUrl(wardrobe) && !wardrobe.needsImageRegen && !item.forceRegenerate) {
    return skipped(item, 'already-generated')
  }

  const usedFingerprint = wardrobeFingerprint(wardrobe)
  const uploadPath = `characters/${projectId}/${item.targetId}/wardrobes/${wardrobe.id}/full-body-${Date.now()}.png`

  const generated = await generateAndUploadFullBodyWardrobe(
    {
      characterName: character.name || item.label,
      identityReferenceUrl: character.referenceImage!.trim(),
      wardrobeDescription: wardrobe.description,
      wardrobeAccessories: wardrobe.accessories,
      appearanceNotes: wardrobe.appearanceNotes,
      appearanceDescription: character.appearanceDescription,
      hairStyle: typeof character.hairStyle === 'string' ? character.hairStyle : undefined,
      hairColor: typeof character.hairColor === 'string' ? character.hairColor : undefined,
      existingFullBodyUrl: wardrobe.fullBodyUrl,
      forceRegenerate:
        item.forceRegenerate === true ||
        !!wardrobe.needsImageRegen ||
        !!wardrobeLookUrl(wardrobe),
      promptOverride: wardrobe.generationPrompt?.trim() || undefined,
    },
    uploadPath
  )

  try {
    await quoteAndCharge({
      userId,
      projectId,
      quoteInput: {
        kind: 'reference',
        imageCount: 1,
        floorCredits: IMAGE_CREDITS.SCENE_CHARACTER_HEADSHOT,
      },
      meta: {
        label: 'character_full_body_wardrobe',
        characterId: item.targetId,
        characterName: character.name,
        wardrobeId: wardrobe.id,
      },
    })
  } catch (chargeError: unknown) {
    console.error('[ReferenceExpress] Failed to charge wardrobe credits:', chargeError)
  }

  const { saved, staleSource } = await persistReferenceImage({
    projectId,
    kind: 'cast',
    targetId: item.targetId,
    wardrobeId: wardrobe.id,
    expectedFingerprint: usedFingerprint,
    patch: {
      fullBodyUrl: generated.imageUrl,
      needsImageRegen: false,
    },
  })

  if (!saved) return skipped(item, 'missing')

  const identityUrl = character.referenceImage?.trim()
  if (identityUrl) {
    await composeUploadAndPersistCombinedCharacterRef({
      projectId,
      characterId: item.targetId,
      wardrobeId: wardrobe.id,
      identityUrl,
      wardrobeUrl: generated.imageUrl,
      expectedFingerprint: wardrobeExpectedFingerprint(wardrobe),
      label: character.name,
    })
  }

  return {
    kind: item.kind,
    targetId: item.targetId,
    label: `${character.name?.trim() || item.label} — ${wardrobe.name?.trim() || 'Wardrobe'}`,
    status: 'succeeded',
    imageUrl: generated.imageUrl,
    ...(staleSource ? { staleSource } : {}),
  }
}

async function runLocationVersionItem(input: {
  userId: string
  projectId: string
  item: ReferenceExpressItem
  location: LocationSource
  locale: Awaited<ReturnType<typeof resolveStoryLocale>>
}): Promise<ReferenceExpressItemResult> {
  const { userId, projectId, item, location, locale } = input
  const version = (location.versions || []).find((row) => row.id === item.versionId)
  if (!version?.id) return skipped(item, 'missing')
  if (!hasImage(location.imageUrl)) return skipped(item, 'missing')
  if (!version.stateNotes?.trim()) return skipped(item, 'missing')
  if (hasImage(version.imageUrl) && !version.needsImageRegen && !item.forceRegenerate) {
    return skipped(item, 'already-generated')
  }

  const usedFingerprint = locationVersionFingerprint(location, version)
  const generated = await generateLocationVersionReferenceImage({
    userId,
    projectId,
    locationName: location.location || location.locationDisplay || 'Location',
    intExt: location.intExt,
    timeOfDay: location.timeOfDay,
    description: location.description,
    locale,
    baseImageUrl: location.imageUrl!.trim(),
    stateNotes: version.stateNotes,
    versionId: version.id,
    locationPrompt:
      typeof version.generationPrompt === 'string' && version.generationPrompt.trim()
        ? version.generationPrompt
        : undefined,
  })

  const { saved, staleSource } = await persistReferenceImage({
    projectId,
    kind: 'location',
    targetId: item.targetId,
    versionId: version.id,
    expectedFingerprint: usedFingerprint,
    patch: {
      imageUrl: generated.imageUrl,
      generationPrompt: generated.prompt,
      needsImageRegen: false,
    },
  })

  if (!saved) return skipped(item, 'missing')
  return {
    kind: item.kind,
    targetId: item.targetId,
    label: item.label,
    status: 'succeeded',
    imageUrl: generated.imageUrl,
    ...(staleSource ? { staleSource } : {}),
  }
}
