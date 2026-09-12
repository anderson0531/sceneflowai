/**
 * Synchronous preflight checks for per-scene Scene Express.
 * Fails fast before any paid Vertex/API calls.
 */

import { shouldScheduleStandaloneNarration, sceneHasNarratorInDialogue } from '../script/narration'
import { resolveCharacterReferenceImageUrl } from '../production/productionReadinessGate'
import { countStoryboardFramesNeedingGeneration } from '../storyboard/types'
import {
  formatReferenceReadinessMessage,
  resolveReferenceReadiness,
  type ReferenceReadinessLocation,
  type ReferenceReadinessObject,
} from '../vision/referenceReadiness'

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
   * Project-wide prop and location references. Unlike the cast, these are not
   * listed per scene, so any un-imaged row can end up named in this scene's
   * frames — and a named reference with no image is drawn differently every
   * time. Both groups must be complete before a scene generates.
   */
  locationReferences?: ReferenceReadinessLocation[]
  objectReferences?: ReferenceReadinessObject[]
}

export interface SceneExpressPreflightResult {
  ok: boolean
  errors: string[]
  /** True when scene has no direction/audio/image work for the target language. */
  nothingToDo?: boolean
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

  const missingRefs: string[] = []
  const missingVoices: string[] = []

  for (const charName of sceneCharacterNames) {
    const char = characters.find((c) => c.name === charName)
    if (!char) continue
    if (!resolveCharacterReferenceImageUrl(char)) {
      missingRefs.push(charName)
    }
    if (!char.voiceConfig) {
      missingVoices.push(charName)
    }
  }

  if (missingRefs.length > 0) {
    errors.push(
      `Missing references: ${missingRefs.join(', ')} — add in Reference Library before Express.`
    )
  }

  const libraryReadiness = resolveReferenceReadiness({
    locationReferences,
    objectReferences,
  })
  if (!libraryReadiness.ready) {
    errors.push(formatReferenceReadinessMessage(libraryReadiness))
  }

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

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const nothingToDo = !sceneNeedsExpressWork(scene, language, regenerate)
  return { ok: true, errors: [], nothingToDo }
}
