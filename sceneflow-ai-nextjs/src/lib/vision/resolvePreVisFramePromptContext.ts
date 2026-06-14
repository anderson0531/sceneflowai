/**
 * Initialize Pre-Vis Direct prompt builder state from a storyboard frame slot.
 */

import { findSceneCharacters } from '@/lib/character/matching'
import { extractDirectionMetadata } from '@/lib/intelligence/scene-direction-metadata'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { resolveBeatSpeaker } from '@/lib/scene/characterDetection'
import type { BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import type { LocationReference, VisualReference } from '@/types/visionReferences'
import type { TalentDirection, VisualSetup } from '@/components/image-gen/types'
import { resolveBeatFrameGenerationContext } from '@/lib/vision/beatFrameGenerationContext'
import { resolveWardrobeIdForCharacterInScene } from '@/lib/character/characterReferenceAssembly'

export interface PreVisFramePromptContext {
  frameLabel: string
  seedPrompt: string
  visualSetup: VisualSetup
  talentDirection: TalentDirection
  artStyle: string
  negativePrompt: string
  selectedCharacterNames: string[]
  selectedWardrobes: Record<string, string>
  wardrobeTextOverrides: Record<string, string>
  locationRefId: string | null
  objectRefIds: string[]
  beat?: SceneBeat
  beatReferenceSelection?: BeatReferenceSelection | null
}

function sceneHeadingText(scene: Record<string, unknown>): string {
  const heading = scene?.heading
  if (typeof heading === 'string') return heading
  if (heading && typeof heading === 'object' && 'text' in heading) {
    return String((heading as { text?: string }).text || '')
  }
  return ''
}

function defaultVisualSetup(
  scene: Record<string, unknown>,
  lockedArtStyle?: string
): VisualSetup {
  const direction = scene.sceneDirection as DetailedSceneDirection | undefined
  const meta = direction ? extractDirectionMetadata(direction) : null
  return {
    location: sceneHeadingText(scene) || meta?.location || '',
    timeOfDay: meta?.timeOfDay || 'day',
    weather: meta?.weather || 'clear',
    atmosphere: meta?.atmosphere || 'neutral',
    shotType: meta?.framing || direction?.camera?.shotType || 'medium-shot',
    cameraAngle: direction?.camera?.angle || 'eye-level',
    lighting: direction?.lighting?.type || 'natural',
    lensChoice: direction?.camera?.lens || 'standard',
    lightingMood: direction?.lighting?.mood || 'neutral',
  }
}

function defaultTalentDirection(scene: Record<string, unknown>): TalentDirection {
  const direction = scene.sceneDirection as DetailedSceneDirection | undefined
  return {
    talentBlocking: direction?.talent?.blocking || '',
    emotionalBeat: direction?.talent?.emotionalBeat || '',
    keyProps: direction?.keyProps?.join(', ') || '',
  }
}

function buildWardrobeTextMap(
  characterNames: string[],
  characters: Array<Record<string, unknown>>,
  selectedWardrobes: Record<string, string>
): Record<string, string> {
  const overrides: Record<string, string> = {}
  for (const name of characterNames) {
    const char = characters.find((c) => c.name === name)
    if (!char || !Array.isArray(char.wardrobes)) continue
    const wardrobeId = selectedWardrobes[name]
    const wardrobe = wardrobeId
      ? (char.wardrobes as Array<{ id: string; description?: string }>).find((w) => w.id === wardrobeId)
      : (char.wardrobes as Array<{ id: string; description?: string; isDefault?: boolean }>).find(
          (w) => w.isDefault
        )
    if (wardrobe?.description?.trim()) {
      overrides[name] = wardrobe.description.trim()
    }
  }
  return overrides
}

function fillSelectedWardrobesForCharacters(
  characterNames: string[],
  projectCharacters: Array<Record<string, unknown>>,
  scene: Record<string, unknown>,
  sceneIndex: number,
  existing: Record<string, string> = {}
): Record<string, string> {
  const selectedWardrobes = { ...existing }
  for (const name of characterNames) {
    if (selectedWardrobes[name]) continue
    const char = projectCharacters.find((c) => c.name === name)
    if (!char) continue
    const wardrobeId = resolveWardrobeIdForCharacterInScene(char, scene, sceneIndex)
    if (wardrobeId) selectedWardrobes[name] = wardrobeId
  }
  return selectedWardrobes
}

export function resolvePreVisFramePromptContext(args: {
  slot: StoryboardFrameSlot
  scene: Record<string, unknown>
  sceneIndex: number
  projectCharacters: Array<Record<string, unknown>>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  filmTitle?: string
  lockedArtStyle?: string
}): PreVisFramePromptContext {
  const { slot, scene, sceneIndex, projectCharacters, locationReferences, objectReferences, filmTitle, lockedArtStyle } =
    args

  const visualSetup = defaultVisualSetup(scene, lockedArtStyle)
  const talentDirection = defaultTalentDirection(scene)
  const artStyle = lockedArtStyle || 'photorealistic'
  const negativePrompt = 'blurry, low quality, distorted, poor composition, mannequin, turnaround sheet'

  if (slot.kind === 'custom' && slot.customFrameId) {
    const frames = Array.isArray(scene.storyboardFrames)
      ? (scene.storyboardFrames as Array<Record<string, unknown>>)
      : []
    const frame = frames.find((f) => f.id === slot.customFrameId)
    const charName = typeof frame?.character === 'string' ? frame.character : ''
    const selectedCharacterNames = charName ? [charName] : []
    const selectedWardrobes = fillSelectedWardrobesForCharacters(
      selectedCharacterNames,
      projectCharacters,
      scene,
      sceneIndex
    )
    return {
      frameLabel: slot.label,
      seedPrompt: slot.storyboardImagePrompt || String(frame?.line || frame?.label || ''),
      visualSetup,
      talentDirection,
      artStyle,
      negativePrompt,
      selectedCharacterNames,
      selectedWardrobes,
      wardrobeTextOverrides: buildWardrobeTextMap(selectedCharacterNames, projectCharacters, selectedWardrobes),
      locationRefId: null,
      objectRefIds: [],
    }
  }

  const beatId = slot.beatId
  const useBeatFrame = !!beatId && (slot.kind === 'narration' || slot.kind === 'action')
  if (useBeatFrame && beatId) {
    const beat = getSceneBeats(scene).find((b) => b.beatId === beatId)
    if (beat) {
      const auto = resolveBeatFrameGenerationContext({
        scene,
        beat,
        sceneIndex,
        projectCharacters: projectCharacters as Array<{ id?: string; name?: string; referenceImage?: string }>,
        locationReferences,
        objectReferences,
        filmTitle,
      })
      const saved = beat.referenceSelection
      const selectedCharacterNames = saved?.resolvedAt
        ? saved.characterIds
            .map((id) => projectCharacters.find((c) => c.id === id || c.name === id)?.name)
            .filter(Boolean) as string[]
        : auto.characterNames
      const selectedWardrobes: Record<string, string> = {}
      const wardrobeSource = saved?.characterWardrobes?.length
        ? saved.characterWardrobes
        : auto.characterWardrobes
      for (const cw of wardrobeSource || []) {
        const char = projectCharacters.find((c) => c.id === cw.characterId)
        if (char?.name) selectedWardrobes[String(char.name)] = cw.wardrobeId
      }
      const filledWardrobes = fillSelectedWardrobesForCharacters(
        selectedCharacterNames,
        projectCharacters,
        scene,
        sceneIndex,
        selectedWardrobes
      )
      return {
        frameLabel: slot.label,
        seedPrompt:
          slot.storyboardImagePrompt?.trim() ||
          beat.storyboardImagePrompt?.trim() ||
          beat.actionDescription ||
          beat.line ||
          '',
        visualSetup,
        talentDirection,
        artStyle,
        negativePrompt,
        selectedCharacterNames,
        selectedWardrobes: filledWardrobes,
        wardrobeTextOverrides: buildWardrobeTextMap(
          selectedCharacterNames,
          projectCharacters,
          filledWardrobes
        ),
        locationRefId: saved?.locationRefId ?? auto.locationRefId ?? null,
        objectRefIds: saved?.objectRefIds?.length ? saved.objectRefIds : auto.objectRefIds,
        beat,
        beatReferenceSelection: saved ?? null,
      }
    }
  }

  const dialogueIdx = slot.dialogueIndex
  if (typeof dialogueIdx === 'number') {
    const line = Array.isArray(scene.dialogue) ? scene.dialogue[dialogueIdx] : null
    const speakerName = line?.character || ''
    const selectedCharacterNames = speakerName ? [speakerName] : []
    const selectedWardrobes = fillSelectedWardrobesForCharacters(
      selectedCharacterNames,
      projectCharacters,
      scene,
      sceneIndex
    )
    return {
      frameLabel: slot.label,
      seedPrompt:
        slot.storyboardImagePrompt?.trim() ||
        line?.storyboardImagePrompt?.trim() ||
        line?.line ||
        '',
      visualSetup,
      talentDirection,
      artStyle,
      negativePrompt,
      selectedCharacterNames,
      selectedWardrobes,
      wardrobeTextOverrides: buildWardrobeTextMap(selectedCharacterNames, projectCharacters, selectedWardrobes),
      locationRefId: null,
      objectRefIds: [],
    }
  }

  const sceneText = [
    sceneHeadingText(scene),
    scene.action || '',
    scene.visualDescription || '',
    ...(Array.isArray(scene.dialogue) ? scene.dialogue.map((d: { character?: string }) => d.character || '') : []),
  ].join(' ')
  const detected = findSceneCharacters(sceneText, projectCharacters as Parameters<typeof findSceneCharacters>[1])
  const selectedCharacterNames = detected.map((c) => c.name).filter(Boolean) as string[]
  const selectedWardrobes = fillSelectedWardrobesForCharacters(
    selectedCharacterNames,
    projectCharacters,
    scene,
    sceneIndex
  )

  return {
    frameLabel: slot.label || 'Establishing',
    seedPrompt:
      slot.storyboardImagePrompt?.trim() ||
      String(scene.visualDescription || scene.action || sceneHeadingText(scene) || ''),
    visualSetup,
    talentDirection,
    artStyle,
    negativePrompt,
    selectedCharacterNames,
    selectedWardrobes,
    wardrobeTextOverrides: buildWardrobeTextMap(selectedCharacterNames, projectCharacters, selectedWardrobes),
    locationRefId: null,
    objectRefIds: [],
  }
}
