/**
 * Synchronous preflight checks for per-scene Scene Express.
 * Fails fast before any paid Vertex/API calls.
 */

import { shouldScheduleStandaloneNarration, sceneHasNarratorInDialogue } from '../script/narration'
import { countStoryboardFramesNeedingGeneration } from '../storyboard/types'
import {
  formatReferenceReadinessMessage,
  resolveSceneReferenceReadiness,
} from '../vision/referenceReadiness'
import {
  resolveSceneRequiredReferences,
  type SceneReferenceOverrides,
  type SceneReferenceRequirement,
  type SceneRequirementCharacter,
  type SceneRequirementLocation,
  type SceneRequirementObject,
} from '../vision/sceneReferenceRequirements'

export interface SceneExpressPreflightInput {
  scene: Record<string, unknown>
  sceneIndex: number
  characters: Array<{
    id?: string
    name: string
    referenceImage?: string
    referenceImageUrl?: string
    voiceConfig?: unknown
  }>
  narrationVoice?: unknown
  language?: string
  regenerate?: boolean
  /** Image-only Express pass — relax voice checks when direction/audio are already complete. */
  framesOnly?: boolean
  /**
   * This scene's already-resolved requirements. The scene card holds them for
   * its References tab, so passing them through keeps the tab, the gate and
   * the auto-chain reading one answer. Omit them and they are resolved from
   * the library slices below, which is what the server does.
   */
  sceneRequirements?: SceneReferenceRequirement[]
  /**
   * The whole library. Only the rows *this* scene needs are gated on: a named
   * reference with no image is drawn differently in every frame, but a prop
   * belonging to another scene is none of this scene's business.
   */
  locationReferences?: SceneRequirementLocation[]
  objectReferences?: SceneRequirementObject[]
}

export interface SceneExpressPreflightResult {
  ok: boolean
  errors: string[]
  /** True when scene has no direction/audio/image work for the target language. */
  nothingToDo?: boolean
  /**
   * Undrawn references are the only thing blocking. Express Frames draws them
   * itself, so the scene card treats this as a step rather than a stop — but a
   * single-frame generate, which has nowhere to put that step, still refuses.
   */
  blockedOnlyByReferences?: boolean
}

function sceneNeedsAudio(scene: Record<string, unknown>, language: string): boolean {
  const wantsStandaloneNarration = shouldScheduleStandaloneNarration(scene)
  const narrationOk =
    !wantsStandaloneNarration || !!(scene?.narrationAudio as any)?.[language]?.url
  const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
  const dialogueAudio = (scene?.dialogueAudio as any)?.[language]
  const dialogueOk =
    dialogue.length === 0 ||
    (Array.isArray(dialogueAudio) &&
      dialogueAudio.length >= dialogue.length &&
      dialogueAudio.every((d: any) => d && d.audioUrl))
  return !(narrationOk && dialogueOk)
}

function sceneNeedsDirection(scene: Record<string, unknown>): boolean {
  const direction = scene?.sceneDirection as Record<string, unknown> | undefined
  if (!direction) return true
  const hasCore =
    direction.camera &&
    direction.scene &&
    direction.talent &&
    Array.isArray(direction.segmentPromptBundle)
  return !hasCore
}

export function sceneNeedsExpressWork(
  scene: Record<string, unknown>,
  language: string,
  regenerate?: boolean
): boolean {
  if (regenerate) return true
  return (
    sceneNeedsDirection(scene) ||
    sceneNeedsAudio(scene, language) ||
    countStoryboardFramesNeedingGeneration(scene) > 0
  )
}

export function runSceneExpressPreflight(
  input: SceneExpressPreflightInput
): SceneExpressPreflightResult {
  const {
    scene,
    characters,
    narrationVoice,
    language = 'en',
    regenerate,
    framesOnly,
    locationReferences,
    objectReferences,
  } = input
  const errors: string[] = []

  const sceneCharacterNames: string[] = Array.isArray(scene.characters)
    ? (scene.characters as string[])
    : []

  const missingVoices: string[] = []

  for (const charName of sceneCharacterNames) {
    const char = characters.find((c) => c.name === charName)
    if (!char) continue
    if (!char.voiceConfig) {
      missingVoices.push(charName)
    }
  }

  // One check for cast, wardrobe, locations and props, scoped to this scene —
  // `scene.characters` is LLM script metadata and already disagrees with what
  // frame generation resolves, so the requirement matchers answer instead.
  const sceneReadiness = resolveSceneReferenceReadiness(
    input.sceneRequirements ??
      resolveSceneRequiredReferences({
        scene,
        sceneIndex: input.sceneIndex,
        characters: characters as SceneRequirementCharacter[],
        locationReferences,
        objectReferences,
        overrides: (scene.referenceOverrides as SceneReferenceOverrides | undefined) ?? null,
      })
  )
  const referenceError = sceneReadiness.ready
    ? null
    : formatReferenceReadinessMessage(sceneReadiness, 'scene')

  const framesOnlyImagePreflight =
    !!framesOnly &&
    countStoryboardFramesNeedingGeneration(scene) > 0 &&
    !sceneNeedsDirection(scene) &&
    !sceneNeedsAudio(scene, language)

  if (!framesOnlyImagePreflight) {
    if (missingVoices.length > 0) {
      errors.push(
        `Missing voices: ${missingVoices.join(', ')} — assign in Reference Library.`
      )
    }

    const wantsStandaloneNarration = shouldScheduleStandaloneNarration(scene)
    const hasNarratorInDialogue = sceneHasNarratorInDialogue(scene)
    const needsNarrationVoice =
      (wantsStandaloneNarration || hasNarratorInDialogue) && sceneNeedsAudio(scene, language)

    if (needsNarrationVoice && !narrationVoice) {
      errors.push('Narration voice not configured — open Generate Audio setup.')
    }
  }

  // A voice or narration gap is a genuine stop and is named first; an undrawn
  // reference is a step Express can take on the caller's behalf, so it goes
  // last and is flagged as such.
  if (errors.length > 0 || referenceError) {
    return {
      ok: false,
      errors: referenceError ? [...errors, referenceError] : errors,
      blockedOnlyByReferences: !!referenceError && errors.length === 0,
    }
  }

  const nothingToDo = !sceneNeedsExpressWork(scene, language, regenerate)
  return { ok: true, errors: [], nothingToDo }
}
