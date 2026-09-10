/**
 * Shared Direct (Prompt Builder) payload for Pre-Vis beat frames.
 * Always uses the Auto compiler — never send customPrompt.
 */

import type { ModelTier, ThinkingLevel } from '@/components/image-gen/constants'
import type { TalentDirection, VisualSetup } from '@/components/image-gen/types'
import { GALLERY_DIRECT_GENERATE_OPTS } from '@/lib/vision/galleryImageGeneration'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import { resolvePreVisFramePromptContext } from '@/lib/vision/resolvePreVisFramePromptContext'

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

function beatSlotKind(beat: SceneBeat): StoryboardFrameSlot['kind'] {
  if (beat.kind === 'narration') return 'narration'
  if (beat.kind === 'dialogue') return 'dialogue'
  return 'action'
}

/** Minimal slot so regen can reuse the Direct prompt-context resolver. */
export function buildBeatRegenSlot(
  beat: SceneBeat,
  beatIndex: number,
  frameRole: 'start' | 'end' = 'start'
): StoryboardFrameSlot {
  const ownImageUrl =
    frameRole === 'end' ? beat.storyboardEndImageUrl?.trim() : beat.storyboardImageUrl?.trim()
  return {
    key: `${beat.beatId}:${frameRole}`,
    label: beat.actionDescription || beat.line || `Beat ${beatIndex + 1}`,
    kind: beatSlotKind(beat),
    frameRole,
    beatId: beat.beatId,
    beatIndex,
    storyboardImagePrompt: beat.storyboardImagePrompt,
    ownImageUrl,
    isPlaceholder: false,
    isMissing: !ownImageUrl,
  }
}

export interface BeatRegenDirectImagePayloadInput {
  projectId: string
  sceneIndex: number
  scene: Record<string, unknown>
  beat: SceneBeat
  beatIndex: number
  frameRole?: 'start' | 'end'
  startFrameUrl?: string
  quality?: string
  projectCharacters: Array<Record<string, unknown> & { id?: string; name?: string }>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
  lockedArtStyle?: string
  modelTier?: ModelTier
  thinkingLevel?: ThinkingLevel
  referenceSelection?: BeatReferenceSelection
}

/**
 * One-click beat regen payload — the same Direct Prompt body the dialog
 * already builds, so identity/wardrobe/location/prop refs are full objects
 * and camera/talent overlays are present. Never sends character IDs alone.
 */
export function buildBeatRegenDirectImagePayload(
  input: BeatRegenDirectImagePayloadInput
): Record<string, unknown> {
  const frameRole = input.frameRole ?? 'start'
  const slot = buildBeatRegenSlot(input.beat, input.beatIndex, frameRole)
  const context = resolvePreVisFramePromptContext({
    slot,
    scene: input.scene,
    sceneIndex: input.sceneIndex,
    projectCharacters: input.projectCharacters,
    locationReferences: input.locationReferences,
    objectReferences: input.objectReferences,
    filmTitle: input.filmTitle,
    lockedArtStyle: input.lockedArtStyle,
  })

  const selection = input.referenceSelection ?? context.beatReferenceSelection ?? undefined
  const selectedNames = selection?.characterIds?.length
    ? (selection.characterIds
        .map((id) => input.projectCharacters.find((c) => c.id === id || c.name === id)?.name)
        .filter(Boolean) as string[])
    : context.selectedCharacterNames

  const selectedChars = selectedNames
    .map((name) => input.projectCharacters.find((c) => c.name === name))
    .filter(Boolean)

  const characterWardrobes =
    selection?.characterWardrobes?.length
      ? selection.characterWardrobes
      : selectedNames
          .map((name) => {
            const char = input.projectCharacters.find((c) => c.name === name)
            const wardrobeId = context.selectedWardrobes[name]
            if (!char?.id || !wardrobeId) return null
            return { characterId: String(char.id), wardrobeId }
          })
          .filter(Boolean)

  const locationRefId = selection?.locationRefId ?? context.locationRefId
  const objectRefIds = selection?.objectRefIds?.length ? selection.objectRefIds : context.objectRefIds
  const locRefs = locationRefId
    ? input.locationReferences.filter((l) => l.id === locationRefId)
    : []
  const objRefs = input.objectReferences.filter((o) => objectRefIds.includes(o.id))

  return {
    projectId: input.projectId,
    sceneIndex: input.sceneIndex,
    frameType: 'beat',
    frameRole,
    beatId: input.beat.beatId,
    beatIndex: input.beatIndex,
    quality: input.quality,
    ...(input.startFrameUrl ? { startFrameUrl: input.startFrameUrl } : {}),
    ...buildPreVisDirectApiFields({
      visualSetup: context.visualSetup,
      talentDirection: context.talentDirection,
      artStyle: context.artStyle,
      modelTier: input.modelTier ?? 'designer',
      thinkingLevel: input.thinkingLevel ?? 'low',
      negativePrompt: context.negativePrompt,
    }),
    regenerate: !!slot.ownImageUrl,
    wardrobeTextOverrides: context.wardrobeTextOverrides,
    characterWardrobes,
    characterSelectionExplicit: true,
    characters: selectedChars,
    locationReferences: locRefs,
    objectReferences: objRefs,
    skipObjectAutoDetection: true,
  }
}
