/**
 * Structured scene edit: map AI beats[] revisions onto scenes and invalidate frames.
 */

import { findMatchingCharacter } from '@/lib/character/matching'
import { toCanonicalName } from '@/lib/character/canonical'
import {
  clearAllSceneAudio,
  copyPreservedSceneAudioFields,
  normalizePreserveElements,
  type PreserveElementInput,
} from '@/lib/audio/cleanupAudio'
import {
  applyBeatsToScene,
  beatContentFingerprint,
  getSceneBeats,
  mintBeatId,
  normalizeBeatsForProduction,
  parseLlmBeats,
} from '@/lib/script/beatMigration'
import { mintLineId } from '@/lib/script/segmentScript'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type RevisionDepth = 'light' | 'moderate' | 'deep'

/** Stamped on revise-scene preview so apply can detect Restructure. */
export const REVISION_DEPTH_SCENE_KEY = '__revisionDepth'

const BEAT_MEDIA_KEYS = [
  'storyboardImageUrl',
  'storyboardImageGcsPath',
  'storyboardImagePrompt',
  'storyboardImageTier',
  'storyboardEndImageUrl',
  'storyboardEndImageGcsPath',
  'storyboardEndImagePrompt',
  'storyboardEndImageTier',
] as const

export function clearBeatStoryboardFrames(beat: SceneBeat): SceneBeat {
  const next = { ...beat }
  for (const key of BEAT_MEDIA_KEYS) {
    delete (next as Record<string, unknown>)[key]
  }
  return next
}

export function formatBeatsForRevisionPrompt(beats: SceneBeat[]): string {
  if (!beats.length) {
    return 'No beats yet — derive the full ordered beats timeline from the scene content.'
  }
  return beats
    .map((beat, index) => {
      if (beat.kind === 'action') {
        return `${index + 1}. [beatId:${beat.beatId}] action: ${beat.actionDescription ?? ''}`
      }
      return `${index + 1}. [beatId:${beat.beatId}] ${beat.kind} ${beat.character ?? ''}: ${beat.line ?? ''}`
    })
    .join('\n')
}

export function isStructuredRevisionResponse(parsed: unknown): parsed is {
  beats: unknown[]
  music?: unknown
  sfx?: unknown
} {
  if (!parsed || typeof parsed !== 'object') return false
  const beats = (parsed as { beats?: unknown }).beats
  return Array.isArray(beats) && beats.length > 0
}

export function speakersMatch(a?: string, b?: string): boolean {
  if (!a?.trim() || !b?.trim()) return false
  return toCanonicalName(a) === toCanonicalName(b)
}

function carryBeatMediaIfUnchanged(next: SceneBeat, original: SceneBeat): SceneBeat {
  if (beatContentFingerprint(original) !== beatContentFingerprint(next)) {
    return next
  }
  const merged = { ...next }
  for (const key of BEAT_MEDIA_KEYS) {
    const value = original[key as keyof SceneBeat]
    if (value !== undefined) {
      ;(merged as Record<string, unknown>)[key as string] = value
    }
  }
  return merged
}

function stripBeatPlaybackAssets(beat: SceneBeat): SceneBeat {
  const next = clearBeatStoryboardFrames(beat)
  delete (next as { audioUrl?: string }).audioUrl
  delete (next as { durationSeconds?: number }).durationSeconds
  return next
}

/**
 * Merge identity from an original beat onto an AI revision.
 * - Always keeps beatId when aligning to a claimed original slot (caller decides when to mint).
 * - Preserves characterId only when the speaker is unchanged (light/moderate).
 * - Deep Restructure never carries characterId or media from the original.
 */
export function mergeBeatIdentityFromOriginal(
  next: SceneBeat,
  original: SceneBeat,
  options?: { revisionDepth?: RevisionDepth }
): SceneBeat {
  const depth = options?.revisionDepth ?? 'moderate'
  const isDeep = depth === 'deep'

  if (isDeep) {
    const merged: SceneBeat = {
      ...stripBeatPlaybackAssets(next),
      beatId: original.beatId,
    }
    delete merged.characterId
    if (next.kind === 'dialogue' || next.kind === 'narration') {
      if (speakersMatch(next.character, original.character) && original.lineId) {
        merged.lineId = original.lineId
      } else {
        merged.lineId = mintLineId()
      }
    }
    return merged
  }

  const merged: SceneBeat = { ...next, beatId: original.beatId }
  if (next.kind === 'dialogue' || next.kind === 'narration') {
    if (original.lineId) merged.lineId = original.lineId
    if (original.characterId && speakersMatch(next.character, original.character)) {
      merged.characterId = original.characterId
    } else {
      delete merged.characterId
    }
  }
  return merged
}

/**
 * Re-align AI-returned beats onto original beat ids when the model omits beatId.
 * Exact id matches win; otherwise claim the next unclaimed original of the same kind.
 * Deep Restructure mints fresh ids for kind-remapped beats and never carries media.
 */
export function mapStructuredRevisionBeats(
  rawBeats: unknown[],
  currentScene: Record<string, unknown>,
  options?: { revisionDepth?: RevisionDepth }
): SceneBeat[] {
  const depth = options?.revisionDepth ?? 'moderate'
  const isDeep = depth === 'deep'
  const originalBeats = getSceneBeats(currentScene)
  const originalById = new Map(originalBeats.map((beat) => [beat.beatId, beat]))
  const parsed = parseLlmBeats(rawBeats)
  const claimedOriginalIds = new Set<string>()
  const aligned: SceneBeat[] = []

  for (const beat of parsed) {
    const hasValidOriginalId =
      Boolean(beat.beatId) &&
      originalById.has(beat.beatId) &&
      !claimedOriginalIds.has(beat.beatId)

    if (hasValidOriginalId) {
      const original = originalById.get(beat.beatId)!
      claimedOriginalIds.add(beat.beatId)

      if (
        isDeep &&
        (beat.kind === 'dialogue' || beat.kind === 'narration') &&
        !speakersMatch(beat.character, original.character)
      ) {
        // Same beatId claimed but speaker changed — treat as new script beat.
        aligned.push(
          stripBeatPlaybackAssets({
            ...beat,
            beatId: mintBeatId(),
            lineId: mintLineId(),
            characterId: undefined,
          })
        )
        continue
      }

      const merged = mergeBeatIdentityFromOriginal(beat, original, { revisionDepth: depth })
      aligned.push(
        isDeep ? stripBeatPlaybackAssets(merged) : carryBeatMediaIfUnchanged(merged, original)
      )
      continue
    }

    const kindMatch = originalBeats.find(
      (original) => original.kind === beat.kind && !claimedOriginalIds.has(original.beatId)
    )
    if (kindMatch) {
      claimedOriginalIds.add(kindMatch.beatId)
      if (isDeep) {
        // Kind-slot remapping is not identity — mint fresh assets for Restructure.
        aligned.push(
          stripBeatPlaybackAssets({
            ...beat,
            beatId: mintBeatId(),
            lineId:
              beat.kind === 'dialogue' || beat.kind === 'narration'
                ? mintLineId()
                : beat.lineId,
            characterId: undefined,
          })
        )
        continue
      }
      const merged = mergeBeatIdentityFromOriginal(beat, kindMatch, { revisionDepth: depth })
      aligned.push(carryBeatMediaIfUnchanged(merged, kindMatch))
      continue
    }

    aligned.push(isDeep ? stripBeatPlaybackAssets(beat) : beat)
  }

  return normalizeBeatsForProduction(aligned)
}

function enforceRevisionBeatCount(
  scene: Record<string, unknown>,
  beats: SceneBeat[],
  context: string
): Record<string, unknown> {
  const onScene = getSceneBeats(scene)
  if (onScene.length === beats.length) return scene
  console.warn(
    `[Scene Revision] Beat count mismatch after ${context}: expected ${beats.length}, got ${onScene.length} — forcing authoritative beats[]`
  )
  return applyBeatsToScene(scene, beats)
}

/** Set dialogue/beat characterId from speaker name matches. */
export function relinkSceneCharacterIds(
  scene: Record<string, unknown>,
  characters: Array<{ id?: string; name?: string }> | undefined
): Record<string, unknown> {
  if (!characters?.length) return scene

  let working = { ...scene }

  if (Array.isArray(working.dialogue)) {
    working.dialogue = (working.dialogue as any[]).map((line) => {
      if (!line?.character) return line
      const match = findMatchingCharacter(line.character, characters)
      if (!match?.id) {
        return match ? { ...line, character: match.name.toUpperCase() } : line
      }
      return {
        ...line,
        character: match.name.toUpperCase(),
        characterId: match.id,
      }
    })
  }

  const beats = getSceneBeats(working)
  if (beats.length > 0) {
    const relinkedBeats = beats.map((beat) => {
      if (beat.kind !== 'dialogue' && beat.kind !== 'narration') return beat
      if (!beat.character?.trim()) return beat
      const match = findMatchingCharacter(beat.character, characters)
      if (!match?.id) {
        return match
          ? { ...beat, character: match.name.toUpperCase() }
          : beat
      }
      return {
        ...beat,
        character: match.name.toUpperCase(),
        characterId: match.id,
      }
    })
    working = applyBeatsToScene(working, relinkedBeats)
  }

  return working
}

export function clearAllBeatStoryboardFramesOnScene(
  scene: Record<string, unknown>
): Record<string, unknown> {
  const beats = getSceneBeats(scene)
  if (beats.length === 0) {
    const next = { ...scene }
    delete next.imageUrl
    delete next.imageGcsPath
    delete next.imagePrompt
    delete next.imageGeneratedAt
    return next
  }
  const cleared = beats.map(clearBeatStoryboardFrames)
  const working = applyBeatsToScene(scene, cleared)
  delete working.imageUrl
  delete working.imageGcsPath
  delete working.imagePrompt
  delete working.imageGeneratedAt
  return working
}

/**
 * Restructure apply: treat the scene as a new script — clear audio/frames/segments,
 * then re-link characterIds from speaker names. Honors explicit preserve flags.
 */
export function applyDeepRestructureAssetClear(
  originalScene: Record<string, unknown>,
  revisedScene: Record<string, unknown>,
  preserveElements: PreserveElementInput[] = [],
  characters?: Array<{ id?: string; name?: string }>
): { cleanedScene: Record<string, unknown>; deletedUrls: string[] } {
  const preserve = new Set(normalizePreserveElements(preserveElements))
  const { cleanedScene: audioCleared, deletedUrls } = clearAllSceneAudio(revisedScene)
  let cleanedScene = audioCleared as Record<string, unknown>

  cleanedScene = copyPreservedSceneAudioFields(
    originalScene,
    cleanedScene,
    preserveElements
  ) as Record<string, unknown>

  if (!preserve.has('beatFrames')) {
    cleanedScene = clearAllBeatStoryboardFramesOnScene(cleanedScene)
  }

  delete cleanedScene.segments
  cleanedScene = relinkSceneCharacterIds(cleanedScene, characters)
  cleanedScene[REVISION_DEPTH_SCENE_KEY] = 'deep'

  return { cleanedScene, deletedUrls }
}

function stampRevisionDepth(
  scene: Record<string, unknown>,
  revisionDepth?: RevisionDepth
): Record<string, unknown> {
  if (!revisionDepth) return scene
  return { ...scene, [REVISION_DEPTH_SCENE_KEY]: revisionDepth }
}

export function finalizeStructuredRevisedScene(
  parsed: { beats: unknown[]; music?: unknown; sfx?: unknown },
  currentScene: Record<string, unknown>,
  preserveElements: PreserveElementInput[],
  context: { characters?: any[] },
  options?: { revisionDepth?: RevisionDepth }
): Record<string, unknown> {
  const revisionDepth = options?.revisionDepth ?? 'moderate'
  const isDeep = revisionDepth === 'deep'
  const normalizedPreserve = normalizePreserveElements(preserveElements)
  let beats = mapStructuredRevisionBeats(parsed.beats, currentScene, { revisionDepth })

  if (normalizedPreserve.includes('dialogueBeats')) {
    const original = getSceneBeats(currentScene)
    beats = beats.map((beat) => {
      if (beat.kind === 'dialogue' || beat.kind === 'narration') {
        const match = original.find((o) => o.beatId === beat.beatId)
        return match ?? beat
      }
      return beat
    })
  }
  if (normalizedPreserve.includes('actionBeats')) {
    const original = getSceneBeats(currentScene)
    beats = beats.map((beat) => {
      if (beat.kind === 'action') {
        const match = original.find((o) => o.beatId === beat.beatId)
        return match ?? beat
      }
      return beat
    })
  }

  let finalScene = applyBeatsToScene(currentScene, beats)
  finalScene = enforceRevisionBeatCount(finalScene, beats, 'finalizeStructuredRevisedScene')

  if (parsed.music !== undefined && !normalizedPreserve.includes('music')) {
    finalScene.music = parsed.music
  }
  if (parsed.sfx !== undefined && !normalizedPreserve.includes('actionBeats')) {
    finalScene.sfx = parsed.sfx
  }

  if (normalizedPreserve.includes('sceneDirection') && currentScene.sceneDirection) {
    finalScene.sceneDirection = currentScene.sceneDirection
  }

  if (isDeep) {
    finalScene = clearAllBeatStoryboardFramesOnScene(finalScene)
    delete finalScene.segments
  }

  finalScene = copyPreservedSceneAudioFields(
    currentScene,
    finalScene,
    preserveElements
  ) as Record<string, unknown>

  finalScene = relinkSceneCharacterIds(finalScene, context?.characters)

  return stampRevisionDepth(finalScene, revisionDepth)
}

export function finalizeFlatRevisedScene(
  revisedScene: Record<string, unknown>,
  currentScene: Record<string, unknown>,
  preserveElements: PreserveElementInput[],
  context: { characters?: any[] },
  options?: { revisionDepth?: RevisionDepth }
): Record<string, unknown> {
  const revisionDepth = options?.revisionDepth ?? 'moderate'
  const isDeep = revisionDepth === 'deep'
  const normalizedPreserve = normalizePreserveElements(preserveElements)
  let finalScene: Record<string, unknown> = { ...currentScene, ...revisedScene }

  if (revisedScene.visualDescription === undefined && currentScene.visualDescription) {
    finalScene.visualDescription = currentScene.visualDescription
  }

  if (normalizedPreserve.includes('dialogueBeats')) {
    finalScene.dialogue = currentScene.dialogue
  }
  if (normalizedPreserve.includes('actionBeats')) {
    finalScene.action = currentScene.action
    finalScene.visualDescription = currentScene.visualDescription
    if (currentScene.description !== undefined) finalScene.description = currentScene.description
    finalScene.sfx = currentScene.sfx
  }
  if (normalizedPreserve.includes('music')) {
    finalScene.music = currentScene.music
  }
  if (normalizedPreserve.includes('sceneDirection')) {
    finalScene.sceneDirection = currentScene.sceneDirection
  }
  if (preserveElements.includes('narration')) {
    finalScene.narration = currentScene.narration
  }

  if (isDeep) {
    finalScene = clearAllBeatStoryboardFramesOnScene(finalScene)
    delete finalScene.segments
  }

  finalScene = copyPreservedSceneAudioFields(
    currentScene,
    finalScene,
    preserveElements
  ) as Record<string, unknown>

  finalScene = relinkSceneCharacterIds(finalScene, context?.characters)

  return stampRevisionDepth(finalScene, revisionDepth)
}

export function invalidateChangedBeatFramesOnScene(
  scene: Record<string, unknown>,
  originalScene: Record<string, unknown>
): Record<string, unknown> {
  const originalBeats = getSceneBeats(originalScene)
  const priorFingerprints = new Map(
    originalBeats.map((beat) => [beat.beatId, beatContentFingerprint(beat)])
  )

  const updatedBeats = getSceneBeats(scene).map((beat) => {
    const prior = priorFingerprints.get(beat.beatId)
    const next = beatContentFingerprint(beat)
    if (prior === undefined || prior !== next) {
      return clearBeatStoryboardFrames(beat)
    }
    return beat
  })

  let working = applyBeatsToScene(scene, updatedBeats)

  const priorAction = String(
    originalScene.action ?? originalScene.visualDescription ?? ''
  ).trim()
  const nextAction = String(working.action ?? working.visualDescription ?? '').trim()
  if (priorAction !== nextAction || !priorFingerprints.size) {
    delete working.imageUrl
    delete working.imageGcsPath
    delete working.imagePrompt
    delete working.imageGeneratedAt
  }

  return working
}

export function beatPreviewLabel(beat: SceneBeat): string {
  if (beat.kind === 'action') {
    return `Action: ${(beat.actionDescription ?? '').slice(0, 80)}`
  }
  return `${beat.character ?? 'SPEAKER'}: ${(beat.line ?? '').slice(0, 80)}`
}

export function beatsWithChangedFingerprints(
  originalScene: Record<string, unknown>,
  candidateScene: Record<string, unknown>,
  deselectedChanges: Set<string>
): SceneBeat[] {
  const originalBeats = getSceneBeats(originalScene)
  const candidateBeats = getSceneBeats(candidateScene)
  const originalById = new Map(originalBeats.map((b) => [b.beatId, b]))

  return candidateBeats.filter((beat) => {
    const changeKey = `beat:${beat.beatId}`
    const addedKey = `beat-added:${beat.beatId}`
    if (deselectedChanges.has(changeKey) || deselectedChanges.has(addedKey)) {
      return false
    }
    const original = originalById.get(beat.beatId)
    if (!original) return true
    return beatContentFingerprint(original) !== beatContentFingerprint(beat)
  })
}
