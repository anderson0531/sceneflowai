/**
 * Scene Edit — strict preservation of beats, direction, and frame media.
 */

import { getSceneBeats, normalizeBeatsForProduction } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  copyDescriptionAudioFields,
  copyMusicAudioFields,
  copyPreservedSceneAudioFields,
  copySfxAudioFields,
  normalizePreserveElements,
  type PreserveElement,
  type PreserveElementInput,
} from '@/lib/audio/cleanupAudio'

const BEAT_FRAME_KEYS = [
  'storyboardImageUrl',
  'storyboardImageGcsPath',
  'storyboardImagePrompt',
  'storyboardImageTier',
  'storyboardEndImageUrl',
  'storyboardEndImageGcsPath',
  'storyboardEndImagePrompt',
  'storyboardEndImageTier',
] as const

const DIALOGUE_LINE_FRAME_KEYS = [
  'storyboardImageUrl',
  'storyboardImageGcsPath',
  'storyboardImagePrompt',
  'storyboardImageTier',
] as const

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function setSceneBeats(scene: any, beats: SceneBeat[]): void {
  scene.beats = normalizeBeatsForProduction(beats)
}

function pickBeatFrameFields(from: SceneBeat): Partial<SceneBeat> {
  const out: Partial<SceneBeat> = {}
  for (const key of BEAT_FRAME_KEYS) {
    const v = (from as Record<string, unknown>)[key]
    if (v !== undefined && v !== null && v !== '') {
      ;(out as Record<string, unknown>)[key] = v
    }
  }
  return out
}

function mergeBeatById(
  incomingBeats: SceneBeat[],
  originalBeats: SceneBeat[],
  mergeFn: (original: SceneBeat, incoming: SceneBeat) => SceneBeat
): SceneBeat[] {
  const originalById = new Map<string, SceneBeat>()
  for (const beat of originalBeats) {
    if (beat.beatId) originalById.set(beat.beatId, beat)
  }

  return incomingBeats.map((incoming, idx) => {
    const original =
      (incoming.beatId && originalById.get(incoming.beatId)) || originalBeats[idx]
    if (!original) return incoming
    return mergeFn(original, incoming)
  })
}

function preserveDialogueBeats(original: any, scene: any): void {
  scene.dialogue = cloneJson(original.dialogue ?? [])
  Object.assign(scene, copyPreservedSceneAudioFields(original, scene, ['dialogueBeats']))

  const originalBeats = getSceneBeats(original)
  const incomingBeats = getSceneBeats(scene)
  const merged = mergeBeatById(incomingBeats, originalBeats, (orig, inc) => {
    if (orig.kind !== 'dialogue' && orig.kind !== 'narration') return inc
    return {
      ...inc,
      kind: orig.kind,
      character: orig.character,
      characterId: orig.characterId,
      line: orig.line,
      lineId: orig.lineId,
      audioUrl: orig.audioUrl,
      durationSeconds: orig.durationSeconds,
      voiceId: orig.voiceId,
    }
  })
  setSceneBeats(scene, merged)
}

function preserveActionBeats(original: any, scene: any): void {
  if (original.action !== undefined) scene.action = original.action
  if (original.visualDescription !== undefined) scene.visualDescription = original.visualDescription
  if (original.description !== undefined) scene.description = original.description
  scene.sfx = cloneJson(original.sfx ?? [])
  copySfxAudioFields(original, scene)
  copyDescriptionAudioFields(original, scene)

  const originalBeats = getSceneBeats(original)
  const incomingBeats = getSceneBeats(scene)
  const merged = mergeBeatById(incomingBeats, originalBeats, (orig, inc) => {
    if (orig.kind !== 'action') return inc
    return {
      ...inc,
      kind: 'action',
      actionDescription: orig.actionDescription,
      audioUrl: orig.audioUrl,
      durationSeconds: orig.durationSeconds,
    }
  })
  setSceneBeats(scene, merged)
}

function preserveMusic(original: any, scene: any): void {
  scene.music = cloneJson(original.music)
  copyMusicAudioFields(original, scene)
}

function preserveBeatFrames(original: any, scene: any): void {
  if (original.imageUrl !== undefined) scene.imageUrl = original.imageUrl
  if (original.imageGcsPath !== undefined) scene.imageGcsPath = original.imageGcsPath
  if (original.imagePrompt !== undefined) scene.imagePrompt = original.imagePrompt
  if (original.sceneReferenceImageUrl !== undefined) {
    scene.sceneReferenceImageUrl = original.sceneReferenceImageUrl
  }

  const originalBeats = getSceneBeats(original)
  const incomingBeats = getSceneBeats(scene)
  const merged = mergeBeatById(incomingBeats, originalBeats, (orig, inc) => ({
    ...inc,
    ...pickBeatFrameFields(orig),
  }))
  setSceneBeats(scene, merged)

  if (Array.isArray(original.dialogue) && Array.isArray(scene.dialogue)) {
    scene.dialogue = scene.dialogue.map((line: any, idx: number) => {
      const origLine = original.dialogue[idx]
      if (!origLine) return line
      const next = { ...line }
      for (const key of DIALOGUE_LINE_FRAME_KEYS) {
        if (origLine[key] !== undefined) next[key] = origLine[key]
      }
      return next
    })
  }

  if (Array.isArray(original.storyboardFrames)) {
    scene.storyboardFrames = cloneJson(original.storyboardFrames)
  }
}

function preserveSceneDirection(original: any, scene: any): void {
  if (original.sceneDirection !== undefined) {
    scene.sceneDirection = cloneJson(original.sceneDirection)
  }
}

/** Whether beat/segment re-derivation should be skipped after edit apply. */
export function shouldSkipBeatRederivation(preserveElements: PreserveElementInput[]): boolean {
  const preserve = new Set(normalizePreserveElements(preserveElements))
  return (
    preserve.has('dialogueBeats') ||
    preserve.has('actionBeats') ||
    preserve.has('beatFrames')
  )
}

/** Whether auto scene-direction regeneration should run after edit apply. */
export function shouldRegenerateSceneDirection(preserveElements: PreserveElementInput[]): boolean {
  const preserve = new Set(normalizePreserveElements(preserveElements))
  return !preserve.has('sceneDirection')
}

/**
 * After audio policy, restore preserved categories verbatim (beats, direction, frames).
 */
export function applyScenePreservation(
  originalScene: any,
  scene: any,
  preserveElements: PreserveElementInput[] = []
): any {
  const preserve = new Set(normalizePreserveElements(preserveElements))
  const next = { ...scene }

  if (preserve.has('dialogueBeats')) preserveDialogueBeats(originalScene, next)
  if (preserve.has('actionBeats')) preserveActionBeats(originalScene, next)
  if (preserve.has('music')) preserveMusic(originalScene, next)
  if (preserve.has('beatFrames')) preserveBeatFrames(originalScene, next)
  if (preserve.has('sceneDirection')) preserveSceneDirection(originalScene, next)

  return next
}
