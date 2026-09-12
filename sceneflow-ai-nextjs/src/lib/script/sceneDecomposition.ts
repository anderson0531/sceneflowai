/**
 * Blueprint beat → scene decomposition and post-generation scene splitting.
 *
 * TARGET_BEATS_PER_SCENE is what planning aims for so a scene has a beginning,
 * middle, and end without being forced to fill the ceiling. MAX_BEATS_PER_SCENE
 * is the hard ceiling: split, QA, and Assistant revision truncation all read it.
 */

import { v4 as uuidv4 } from 'uuid'
import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

/** Hard ceiling. A scene that exceeds this is split, flagged, or truncated. */
export const MAX_BEATS_PER_SCENE = 30
/** What planning aims for. Scene count and chunk targets derive from this. */
export const TARGET_BEATS_PER_SCENE = 20
export const AVG_BEAT_SECONDS = 8
export const TARGET_SCENE_SECONDS = TARGET_BEATS_PER_SCENE * AVG_BEAT_SECONDS
/** Minutes label derived from TARGET_SCENE_SECONDS so the two cannot disagree. */
export const TARGET_SCENE_MINUTES_LABEL = Number.isInteger(TARGET_SCENE_SECONDS / 60)
  ? String(TARGET_SCENE_SECONDS / 60)
  : (TARGET_SCENE_SECONDS / 60).toFixed(1)

export interface BlueprintBeatInput {
  title?: string
  intent?: string
  minutes?: number
  synopsis?: string
  description?: string
}

export interface BeatDecompositionEntry {
  index: number
  title: string
  minutes: number
  targetBeats: number
  targetScenes: number
}

export interface SceneDecompositionPlan {
  entries: BeatDecompositionEntry[]
  totalTargetScenes: number
  totalTargetBeats: number
}

export interface SplitOversizedScenesResult {
  scenes: Record<string, unknown>[]
  splitCount: number
}

/** Resolve blueprint beats from treatment metadata (canonical field first). */
export function extractBlueprintBeats(treatment: Record<string, unknown>): BlueprintBeatInput[] {
  const beats =
    (Array.isArray(treatment.beats) && treatment.beats) ||
    (Array.isArray(treatment.story_beats) && treatment.story_beats) ||
    (Array.isArray(treatment.storyBeats) && treatment.storyBeats) ||
    []
  return beats as BlueprintBeatInput[]
}

export function planSceneDecomposition(blueprintBeats: BlueprintBeatInput[]): SceneDecompositionPlan {
  const entries = blueprintBeats.map((beat, index) => {
    const minutes = typeof beat.minutes === 'number' && beat.minutes > 0 ? beat.minutes : 2
    const targetBeats = Math.max(1, Math.round((minutes * 60) / AVG_BEAT_SECONDS))
    const targetScenes = Math.max(1, Math.ceil(targetBeats / TARGET_BEATS_PER_SCENE))
    const title =
      (typeof beat.title === 'string' && beat.title.trim()) ||
      (typeof beat.intent === 'string' && beat.intent.trim()) ||
      `Beat ${index + 1}`
    return { index, title, minutes, targetBeats, targetScenes }
  })

  return {
    entries,
    totalTargetScenes: entries.reduce((sum, e) => sum + e.targetScenes, 0),
    totalTargetBeats: entries.reduce((sum, e) => sum + e.targetBeats, 0),
  }
}

export function formatDecompositionPromptBlock(plan: SceneDecompositionPlan): string {
  if (plan.entries.length === 0) return ''

  const lines: string[] = [
    '=== BLUEPRINT BEAT → SCENE DECOMPOSITION (MANDATORY) ===',
    `Each Blueprint beat MUST become MULTIPLE scenes — NEVER one scene per Blueprint beat.`,
    `Hard cap: each scene beats[] array MUST contain at most ${MAX_BEATS_PER_SCENE} beats.`,
    `Aim for ~${TARGET_BEATS_PER_SCENE} beats per scene (~${TARGET_SCENE_SECONDS}s / ~${TARGET_SCENE_MINUTES_LABEL} min). A scene may grow up to the cap when the story earns it.`,
    `Target ~${AVG_BEAT_SECONDS}s per beat.`,
    '',
    'Per-beat scene budget:',
  ]

  for (const entry of plan.entries) {
    lines.push(
      `• Beat ${entry.index + 1}: "${entry.title}" (~${entry.minutes} min) → ${entry.targetScenes} scene(s), ~${entry.targetBeats} beats total`
    )
  }

  lines.push(
    '',
    `Total main-content scenes (bookends excluded): ~${plan.totalTargetScenes}`,
    '',
    'Every main-content scene MUST include:',
    '- blueprintBeatIndex: 0-based index matching the Blueprint beat above',
    '- blueprintBeatTitle: exact title string from that Blueprint beat',
    `- beats[]: ordered timeline with AT MOST ${MAX_BEATS_PER_SCENE} entries`,
    '- Split at natural dramatic breaks (location change, time jump, act turn) — not mid-conversation',
    '- When one Blueprint beat needs more beats than fit in one scene, continue across consecutive scenes sharing the same blueprintBeatIndex'
  )

  return lines.join('\n')
}

function formatBlueprintBeatSynopsis(beat: BlueprintBeatInput): string | undefined {
  const synopsis =
    (typeof beat.synopsis === 'string' && beat.synopsis.trim()) ||
    (typeof beat.description === 'string' && beat.description.trim()) ||
    ''
  return synopsis || undefined
}

/** Rich beat list for the prompt (title, minutes, synopsis). */
export function formatBlueprintBeatsForPrompt(blueprintBeats: BlueprintBeatInput[]): string {
  if (blueprintBeats.length === 0) return ''

  const lines = ['BLUEPRINT BEATS (follow in order):']
  blueprintBeats.forEach((beat, idx) => {
    const title =
      (typeof beat.title === 'string' && beat.title.trim()) ||
      (typeof beat.intent === 'string' && beat.intent.trim()) ||
      `Beat ${idx + 1}`
    const minutes =
      typeof beat.minutes === 'number' && beat.minutes > 0 ? ` (~${beat.minutes} min)` : ''
    lines.push(`${idx + 1}. ${title}${minutes}`)
    const synopsis = formatBlueprintBeatSynopsis(beat)
    if (synopsis) {
      lines.push(`   ${synopsis.slice(0, 500)}${synopsis.length > 500 ? '…' : ''}`)
    }
  })
  return lines.join('\n')
}

function isSpokenBeat(beat: SceneBeat): boolean {
  return beat.kind === 'dialogue' || beat.kind === 'narration'
}

/** Pick split index (exclusive end of first chunk) preferring boundaries after action beats. */
export function findSceneSplitIndex(
  beats: SceneBeat[],
  start: number,
  maxBeats: number
): number {
  if (start + maxBeats >= beats.length) return beats.length

  const target = start + maxBeats
  const windowStart = Math.max(start + 1, target - 4)

  for (let i = target; i >= windowStart; i--) {
    const prev = beats[i - 1]
    if (prev?.kind === 'action') return i
  }

  for (let i = target; i >= windowStart; i--) {
    const prev = beats[i - 1]
    const next = beats[i]
    if (isSpokenBeat(prev) && next?.kind === 'action') return i
  }

  return target
}

function sumBeatDurations(beats: SceneBeat[], fallbackSeconds = AVG_BEAT_SECONDS): number {
  return beats.reduce((sum, beat) => {
    if (typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0) {
      return sum + beat.durationSeconds
    }
    return sum + fallbackSeconds
  }, 0)
}

/**
 * Number continuation parts. Unnumbered "(cont.)" headings made every part after
 * the first identical, which downstream duplicate detection then merged back.
 */
function appendContinuationToHeading(heading: unknown, partIndex: number): string {
  const base =
    typeof heading === 'string'
      ? heading
      : heading && typeof heading === 'object' && 'text' in heading
        ? String((heading as { text?: string }).text || 'Untitled Scene')
        : 'Untitled Scene'
  const stripped = base.replace(/\s*\(cont\.?[^)]*\)\s*$/i, '').trim() || 'Untitled Scene'
  return `${stripped} (cont. ${partIndex + 1})`
}

function rebuildSceneFromBeats(
  baseScene: Record<string, unknown>,
  beats: SceneBeat[],
  opts: { isContinuation: boolean; partIndex: number }
): Record<string, unknown> {
  const stripped: Record<string, unknown> = { ...baseScene }
  delete stripped.segments

  // Marks every part of a split, including the first, so consumers can tell a
  // deliberate split apart from a duplicated scene.
  stripped.scenePartIndex = opts.partIndex

  if (opts.isContinuation) {
    const newId = uuidv4()
    stripped.id = newId
    stripped.sceneId = newId
    stripped.heading = appendContinuationToHeading(baseScene.heading, opts.partIndex)
  }

  const withBeats = applyBeatsToScene(stripped, beats)
  const duration = sumBeatDurations(beats)
  if (duration > 0) {
    withBeats.duration = duration
  }

  return withBeats
}

/** Split any scene whose beats[] exceeds maxBeats into consecutive scenes. */
export function splitOversizedScenes(
  scenes: Record<string, unknown>[],
  opts?: { maxBeats?: number }
): SplitOversizedScenesResult {
  const maxBeats = opts?.maxBeats ?? MAX_BEATS_PER_SCENE
  const result: Record<string, unknown>[] = []
  let splitCount = 0

  for (const scene of scenes) {
    const beats = getSceneBeats(scene)
    if (beats.length <= maxBeats) {
      result.push(scene)
      continue
    }

    let start = 0
    let partIndex = 0
    while (start < beats.length) {
      const splitAt =
        start + maxBeats >= beats.length
          ? beats.length
          : findSceneSplitIndex(beats, start, maxBeats)
      const chunk = beats.slice(start, splitAt)
      if (chunk.length === 0) break

      result.push(
        rebuildSceneFromBeats(scene, chunk, {
          isContinuation: partIndex > 0,
          partIndex,
        })
      )

      if (partIndex > 0 || splitAt < beats.length) splitCount++
      partIndex++
      start = splitAt
    }
  }

  return { scenes: result, splitCount }
}

/** Renumber sceneNumber sequentially after splits (preserves bookend cinematicType). */
export function renumberScenes(scenes: Record<string, unknown>[]): Record<string, unknown>[] {
  return scenes.map((scene, idx) => ({
    ...scene,
    sceneNumber: idx + 1,
  }))
}

/** Group scenes sharing a blueprintBeatIndex (for UI navigation). */
export function getBlueprintBeatGroup(
  scenes: Array<Record<string, unknown>>,
  sceneIndex: number
): { beatIndex: number; beatTitle: string; sceneIndices: number[]; positionInGroup: number } | null {
  const scene = scenes[sceneIndex]
  if (!scene) return null

  const beatIndex = scene.blueprintBeatIndex
  if (typeof beatIndex !== 'number') return null

  const beatTitle =
    (typeof scene.blueprintBeatTitle === 'string' && scene.blueprintBeatTitle) ||
    `Blueprint Beat ${beatIndex + 1}`

  const sceneIndices = scenes
    .map((s, i) => ({ i, idx: s.blueprintBeatIndex }))
    .filter(({ idx }) => idx === beatIndex)
    .map(({ i }) => i)

  const positionInGroup = sceneIndices.indexOf(sceneIndex) + 1
  if (positionInGroup <= 0) return null

  return { beatIndex, beatTitle, sceneIndices, positionInGroup }
}
