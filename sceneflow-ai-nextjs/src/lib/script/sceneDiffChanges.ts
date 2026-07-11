/**
 * Diff and selective revert for Scene Edit preview confirmation.
 */

import {
  applyBeatsToScene,
  beatContentFingerprint,
  getSceneBeats,
  normalizeBeatsForProduction,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type SceneChangeKey =
  | 'heading'
  | 'visualDescription'
  | 'action'
  | 'narration'
  | 'music'
  | 'sfx'
  | `dialogue:${number}`
  | `beat:${string}`
  | `beat-added:${string}`
  | `beat-removed:${string}`

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function headingText(scene: any): string {
  if (!scene?.heading) return ''
  if (typeof scene.heading === 'string') return scene.heading.trim()
  return String(scene.heading?.text ?? '').trim()
}

function dialogueLineText(line: any): string {
  if (!line) return ''
  return normalizeText(line.line ?? line.text)
}

function musicComparable(music: unknown): string {
  if (!music) return ''
  if (typeof music === 'string') return music.trim()
  if (typeof music === 'object' && music !== null) {
    return normalizeText((music as { description?: unknown }).description)
  }
  return JSON.stringify(music)
}

function sfxComparable(sfx: unknown): string {
  if (!Array.isArray(sfx)) return ''
  return sfx
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return normalizeText(
          (item as { description?: unknown; text?: unknown }).description ??
            (item as { text?: unknown }).text
        )
      }
      return ''
    })
    .join('\0')
}

function sceneUsesStructuredBeatDiff(originalScene: any, candidateScene: any): boolean {
  const originalBeats = getSceneBeats(originalScene)
  const candidateBeats = getSceneBeats(candidateScene)
  return originalBeats.length > 0 && candidateBeats.length > 0
}

function diffFlatSceneChanges(originalScene: any, candidateScene: any): SceneChangeKey[] {
  const changes: SceneChangeKey[] = []

  if (headingText(originalScene) !== headingText(candidateScene)) {
    changes.push('heading')
  }
  if (
    normalizeText(originalScene?.visualDescription) !==
    normalizeText(candidateScene?.visualDescription)
  ) {
    changes.push('visualDescription')
  }
  if (normalizeText(originalScene?.action) !== normalizeText(candidateScene?.action)) {
    changes.push('action')
  }
  if (normalizeText(originalScene?.narration) !== normalizeText(candidateScene?.narration)) {
    changes.push('narration')
  }
  if (musicComparable(originalScene?.music) !== musicComparable(candidateScene?.music)) {
    changes.push('music')
  }
  if (sfxComparable(originalScene?.sfx) !== sfxComparable(candidateScene?.sfx)) {
    changes.push('sfx')
  }

  const previewDialogue = Array.isArray(candidateScene?.dialogue) ? candidateScene.dialogue : []
  const originalDialogue = Array.isArray(originalScene?.dialogue) ? originalScene.dialogue : []
  const maxLines = Math.max(previewDialogue.length, originalDialogue.length)
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalDialogue[i]
    const newLine = previewDialogue[i]
    const origText = dialogueLineText(origLine)
    const newText = dialogueLineText(newLine)
    const origChar = normalizeText(origLine?.character)
    const newChar = normalizeText(newLine?.character)
    if (!origLine || !newLine || origText !== newText || origChar !== newChar) {
      if (newLine || origLine) {
        changes.push(`dialogue:${i}` as SceneChangeKey)
      }
    }
  }

  return changes
}

function diffStructuredBeatChanges(originalScene: any, candidateScene: any): SceneChangeKey[] {
  const changes: SceneChangeKey[] = []
  const originalBeats = getSceneBeats(originalScene)
  const candidateBeats = getSceneBeats(candidateScene)
  const originalById = new Map(originalBeats.map((beat) => [beat.beatId, beat]))
  const candidateById = new Map(candidateBeats.map((beat) => [beat.beatId, beat]))

  for (const beat of candidateBeats) {
    const original = originalById.get(beat.beatId)
    if (!original) {
      changes.push(`beat-added:${beat.beatId}`)
    } else if (beatContentFingerprint(original) !== beatContentFingerprint(beat)) {
      changes.push(`beat:${beat.beatId}`)
    }
  }

  for (const beat of originalBeats) {
    if (!candidateById.has(beat.beatId)) {
      changes.push(`beat-removed:${beat.beatId}`)
    }
  }

  if (musicComparable(originalScene?.music) !== musicComparable(candidateScene?.music)) {
    changes.push('music')
  }
  if (sfxComparable(originalScene?.sfx) !== sfxComparable(candidateScene?.sfx)) {
    changes.push('sfx')
  }

  return changes
}

/** Build effective candidate scene using local description/narration overrides. */
export function buildEffectiveCandidateScene(
  previewScene: any,
  overrides?: { visualDescription?: string; narration?: string }
): any {
  const candidate = { ...previewScene }
  if (overrides?.visualDescription !== undefined) {
    candidate.visualDescription = overrides.visualDescription
  }
  if (overrides?.narration !== undefined) {
    candidate.narration = overrides.narration
  }
  return candidate
}

/** List stable change keys between original and candidate scenes. */
export function diffSceneChanges(originalScene: any, candidateScene: any): SceneChangeKey[] {
  if (sceneUsesStructuredBeatDiff(originalScene, candidateScene)) {
    return diffStructuredBeatChanges(originalScene, candidateScene)
  }
  return diffFlatSceneChanges(originalScene, candidateScene)
}

function mergeBeatsWithDeselection(
  originalBeats: SceneBeat[],
  candidateBeats: SceneBeat[],
  deselectedChanges: Set<string>
): SceneBeat[] {
  const originalById = new Map(originalBeats.map((beat) => [beat.beatId, beat]))
  const candidateIds = new Set(candidateBeats.map((beat) => beat.beatId))
  const merged: SceneBeat[] = []

  for (const beat of candidateBeats) {
    const original = originalById.get(beat.beatId)
    if (!original) {
      if (!deselectedChanges.has(`beat-added:${beat.beatId}`)) {
        merged.push(beat)
      }
      continue
    }
    if (beatContentFingerprint(original) !== beatContentFingerprint(beat)) {
      merged.push(
        deselectedChanges.has(`beat:${beat.beatId}`) ? original : beat
      )
    } else {
      merged.push(beat)
    }
  }

  for (const original of originalBeats) {
    if (
      !candidateIds.has(original.beatId) &&
      deselectedChanges.has(`beat-removed:${original.beatId}`)
    ) {
      merged.push(original)
    }
  }

  return normalizeBeatsForProduction(
    merged.map((beat, index) => ({ ...beat, sequenceIndex: index }))
  )
}

function applyDeselectedFlatChanges(
  originalScene: any,
  candidateScene: any,
  deselectedChanges: Set<string>
): any {
  const next = { ...candidateScene }

  if (deselectedChanges.has('heading')) {
    next.heading = originalScene.heading
  }
  if (deselectedChanges.has('visualDescription')) {
    next.visualDescription = originalScene.visualDescription
  }
  if (deselectedChanges.has('action')) {
    next.action = originalScene.action
  }
  if (deselectedChanges.has('narration')) {
    next.narration = originalScene.narration
  }
  if (deselectedChanges.has('music')) {
    next.music = originalScene.music
  }
  if (deselectedChanges.has('sfx')) {
    next.sfx = originalScene.sfx
  }

  const previewDialogue = Array.isArray(next.dialogue) ? [...next.dialogue] : []
  const originalDialogue = Array.isArray(originalScene?.dialogue) ? originalScene.dialogue : []
  let dialogueTouched = false

  for (const key of deselectedChanges) {
    if (!key.startsWith('dialogue:')) continue
    const idx = Number(key.slice('dialogue:'.length))
    if (!Number.isFinite(idx) || idx < 0) continue
    dialogueTouched = true
    if (originalDialogue[idx]) {
      previewDialogue[idx] = { ...originalDialogue[idx] }
    } else {
      previewDialogue.splice(idx, 1)
    }
  }

  if (dialogueTouched) {
    next.dialogue = previewDialogue
  }

  return next
}

/** Revert deselected changes back to original scene values. */
export function applyDeselectedSceneChanges(
  originalScene: any,
  candidateScene: any,
  deselectedChanges: Set<string>
): any {
  if (deselectedChanges.size === 0) return candidateScene

  if (sceneUsesStructuredBeatDiff(originalScene, candidateScene)) {
    const originalBeats = getSceneBeats(originalScene)
    const candidateBeats = getSceneBeats(candidateScene)
    const mergedBeats = mergeBeatsWithDeselection(
      originalBeats,
      candidateBeats,
      deselectedChanges
    )
    let next = applyBeatsToScene(candidateScene, mergedBeats)
    if (deselectedChanges.has('music')) {
      next.music = originalScene.music
    }
    if (deselectedChanges.has('sfx')) {
      next.sfx = originalScene.sfx
    }
    return next
  }

  return applyDeselectedFlatChanges(originalScene, candidateScene, deselectedChanges)
}

export function countSelectedChanges(
  allChanges: SceneChangeKey[],
  deselectedChanges: Set<string>
): { selected: number; total: number } {
  const total = allChanges.length
  const selected = allChanges.filter((key) => !deselectedChanges.has(key)).length
  return { selected, total }
}

export function isStructuredBeatPreview(originalScene: any, candidateScene: any): boolean {
  return sceneUsesStructuredBeatDiff(originalScene, candidateScene)
}

export function beatChangeSummary(
  originalScene: any,
  candidateScene: any,
  beatId: string
): { status: 'unchanged' | 'changed' | 'added' | 'removed'; original?: SceneBeat; candidate?: SceneBeat } {
  const originalBeats = getSceneBeats(originalScene)
  const candidateBeats = getSceneBeats(candidateScene)
  const original = originalBeats.find((b) => b.beatId === beatId)
  const candidate = candidateBeats.find((b) => b.beatId === beatId)
  if (!original && candidate) return { status: 'added', candidate }
  if (original && !candidate) return { status: 'removed', original }
  if (original && candidate) {
    if (beatContentFingerprint(original) !== beatContentFingerprint(candidate)) {
      return { status: 'changed', original, candidate }
    }
    return { status: 'unchanged', original, candidate }
  }
  return { status: 'unchanged' }
}

export function beatDisplayText(beat: SceneBeat): string {
  if (beat.kind === 'action') return beat.actionDescription ?? ''
  return beat.line ?? ''
}
