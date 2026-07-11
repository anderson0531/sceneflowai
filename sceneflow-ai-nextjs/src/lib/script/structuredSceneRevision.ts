/**
 * Structured scene edit: map AI beats[] revisions onto scenes and invalidate frames.
 */

import { findMatchingCharacter } from '@/lib/character/matching'
import {
  copyPreservedSceneAudioFields,
  normalizePreserveElements,
  type PreserveElementInput,
} from '@/lib/audio/cleanupAudio'
import {
  applyBeatsToScene,
  beatContentFingerprint,
  getSceneBeats,
  normalizeBeatsForProduction,
  parseLlmBeats,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

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

function mergeBeatIdentityFromOriginal(next: SceneBeat, original: SceneBeat): SceneBeat {
  const merged: SceneBeat = { ...next, beatId: original.beatId }
  if (next.kind === 'dialogue' || next.kind === 'narration') {
    if (original.lineId) merged.lineId = original.lineId
    if (original.characterId) merged.characterId = original.characterId
  }
  return merged
}

/**
 * Re-align AI-returned beats onto original beat ids when the model omits beatId.
 * Exact id matches win; otherwise claim the next unclaimed original of the same kind.
 */
export function mapStructuredRevisionBeats(
  rawBeats: unknown[],
  currentScene: Record<string, unknown>
): SceneBeat[] {
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
      const merged = mergeBeatIdentityFromOriginal(beat, original)
      aligned.push(carryBeatMediaIfUnchanged(merged, original))
      continue
    }

    const kindMatch = originalBeats.find(
      (original) => original.kind === beat.kind && !claimedOriginalIds.has(original.beatId)
    )
    if (kindMatch) {
      claimedOriginalIds.add(kindMatch.beatId)
      const merged = mergeBeatIdentityFromOriginal(beat, kindMatch)
      aligned.push(carryBeatMediaIfUnchanged(merged, kindMatch))
      continue
    }

    aligned.push(beat)
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

export function finalizeStructuredRevisedScene(
  parsed: { beats: unknown[]; music?: unknown; sfx?: unknown },
  currentScene: Record<string, unknown>,
  preserveElements: PreserveElementInput[],
  context: { characters?: any[] }
): Record<string, unknown> {
  const normalizedPreserve = normalizePreserveElements(preserveElements)
  let beats = mapStructuredRevisionBeats(parsed.beats, currentScene)

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

  finalScene = copyPreservedSceneAudioFields(
    currentScene,
    finalScene,
    preserveElements
  ) as Record<string, unknown>

  if (Array.isArray(finalScene.dialogue) && context?.characters) {
    finalScene.dialogue = (finalScene.dialogue as any[]).map((line) => {
      if (!line?.character) return line
      const match = findMatchingCharacter(line.character, context.characters)
      return match ? { ...line, character: match.name.toUpperCase() } : line
    })
  }

  return finalScene
}

export function finalizeFlatRevisedScene(
  revisedScene: Record<string, unknown>,
  currentScene: Record<string, unknown>,
  preserveElements: PreserveElementInput[],
  context: { characters?: any[] }
): Record<string, unknown> {
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

  finalScene = copyPreservedSceneAudioFields(
    currentScene,
    finalScene,
    preserveElements
  ) as Record<string, unknown>

  if (Array.isArray(finalScene.dialogue) && context?.characters) {
    finalScene.dialogue = (finalScene.dialogue as any[]).map((line) => {
      if (!line?.character) return line
      const match = findMatchingCharacter(line.character, context.characters)
      return match ? { ...line, character: match.name.toUpperCase() } : line
    })
  }

  return finalScene
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
