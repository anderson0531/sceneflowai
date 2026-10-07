/**
 * Blueprint beat → scene decomposition and post-generation scene splitting.
 *
 * TARGET_BEATS_PER_SCENE is a planning hint for how many scenes to pre-allocate.
 * MAX_BEATS_PER_SCENE is the technical per-scene ceiling: a composition that
 * needs more beats is split into sequential scenes, never truncated.
 */

import { v4 as uuidv4 } from 'uuid'
import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

/** Technical ceiling. A scene that exceeds this is split into the next scene. */
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
    `You are creatively unbound. Compose the exact number of beats the treatment needs. Do not pad to a quota and do not compress action to fit a beat box.`,
    `Technical limit: when a logical scene needs more than ${MAX_BEATS_PER_SCENE} beats, split it into sequential parts (Scene 1A, Scene 1B). No stored scene exceeds ${MAX_BEATS_PER_SCENE} beats. Parts share cast, location, time of day, and environment.`,
    `A planning hint is ~${TARGET_BEATS_PER_SCENE} beats per scene (~${TARGET_SCENE_SECONDS}s / ~${TARGET_SCENE_MINUTES_LABEL} min). That hint is not a quota.`,
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
    `- beats[]: ordered timeline. Split into the next scene rather than cutting shots when a scene would pass ${MAX_BEATS_PER_SCENE} beats`,
    '- Split at natural dramatic breaks (location change, time jump, act turn) — not mid-conversation',
    '- When one Blueprint beat needs more beats than fit in one scene, continue across consecutive scenes sharing the same blueprintBeatIndex, cast, location, time of day, and environment'
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

/** Letter for a split part. 0 is A, 1 is B, 26 is AA. */
export function scenePartLetter(partIndex: number): string {
  let n = Math.max(0, Math.floor(partIndex))
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

/**
 * Distinguish continuation parts. Identical headings made duplicate detection
 * merge a deliberate split back into one scene.
 */
const PART_HEADING_SUFFIX = /\s*\((?:cont\.?[^)]*|Part\s+[A-Z]+)\)\s*$/i

function appendPartLabelToHeading(heading: unknown, partIndex: number): string {
  const base =
    typeof heading === 'string'
      ? heading
      : heading && typeof heading === 'object' && 'text' in heading
        ? String((heading as { text?: string }).text || 'Untitled Scene')
        : 'Untitled Scene'
  const stripped = base.replace(PART_HEADING_SUFFIX, '').trim() || 'Untitled Scene'
  if (partIndex <= 0) return stripped
  return `${stripped} (Part ${scenePartLetter(partIndex)})`
}

/** Scene-level playback that belongs to the original scene, not a new part. */
const CONTINUATION_PLAYBACK_KEYS = [
  'imageUrl',
  'imageGcsPath',
  'imagePrompt',
  'imageGeneratedAt',
  'dialogueAudio',
  'narrationAudio',
  'narrationAudioUrl',
  'narrationDuration',
  'narrationAudioGeneratedAt',
  'descriptionAudio',
  'descriptionAudioUrl',
  'descriptionDuration',
  'descriptionAudioGeneratedAt',
  'musicAudio',
  'musicUrl',
  'musicDuration',
  'musicFileDuration',
  'sfxAudio',
  'sfxSourceMeta',
  'dialogueAudioGeneratedAt',
  'audienceAnalysis',
  'polishAnalysis',
] as const

const CUE_PLAYBACK_KEYS = ['url', 'duration', 'fileDuration', 'updatedAt'] as const

function clipBeatRange(
  beatStart: number,
  beatEnd: number,
  rangeStart: number,
  rangeEnd: number
): { beatStart: number; beatEnd: number } | null {
  const clippedStart = Math.max(beatStart, rangeStart)
  const clippedEnd = Math.min(beatEnd, rangeEnd - 1)
  if (!Number.isInteger(clippedStart) || !Number.isInteger(clippedEnd) || clippedStart > clippedEnd) {
    return null
  }
  return {
    beatStart: clippedStart - rangeStart,
    beatEnd: clippedEnd - rangeStart,
  }
}

function sliceMusicCueList(
  raw: unknown,
  rangeStart: number,
  rangeEnd: number,
  stripPlayback: boolean
): unknown {
  if (!Array.isArray(raw)) return raw
  const cues: Record<string, unknown>[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const beatStart = Number(row.beatStart)
    const beatEnd = Number(row.beatEnd)
    if (!Number.isInteger(beatStart) || !Number.isInteger(beatEnd)) continue
    const clipped = clipBeatRange(beatStart, beatEnd, rangeStart, rangeEnd)
    if (!clipped) continue
    const whollyInside = beatStart >= rangeStart && beatEnd <= rangeEnd - 1
    const next: Record<string, unknown> = {
      ...row,
      beatStart: clipped.beatStart,
      beatEnd: clipped.beatEnd,
      cueId: `cue-${clipped.beatStart}-${clipped.beatEnd}`,
    }
    if (stripPlayback || !whollyInside) {
      for (const key of CUE_PLAYBACK_KEYS) delete next[key]
    }
    cues.push(next)
  }
  return cues
}

function sliceMovementList(
  raw: unknown,
  beats: SceneBeat[],
  rangeStart: number,
  rangeEnd: number
): { movements: unknown; beats: SceneBeat[] } {
  if (!Array.isArray(raw) || raw.length === 0) return { movements: raw, beats }

  const hasRanges = raw.some(
    (item) => item && typeof item === 'object' && typeof (item as { beatStart?: unknown }).beatStart === 'number'
  )
  const indexMap = new Map<number, number>()
  const movements: Record<string, unknown>[] = []

  if (hasRanges) {
    raw.forEach((item, fallbackIndex) => {
      if (!item || typeof item !== 'object') return
      const row = item as Record<string, unknown>
      const beatStart = Number(row.beatStart)
      const beatEnd = Number(row.beatEnd)
      if (!Number.isInteger(beatStart) || !Number.isInteger(beatEnd)) return
      const clipped = clipBeatRange(beatStart, beatEnd, rangeStart, rangeEnd)
      if (!clipped) return
      const oldIndex = typeof row.index === 'number' ? row.index : fallbackIndex
      const nextIndex = movements.length
      indexMap.set(oldIndex, nextIndex)
      movements.push({
        ...row,
        index: nextIndex,
        beatStart: clipped.beatStart,
        beatEnd: clipped.beatEnd,
      })
    })
  } else {
    raw.forEach((item, index) => {
      const referenced = beats.some((beat) => beat.movementIndex === index)
      if (!referenced) return
      indexMap.set(index, movements.length)
      movements.push(
        item && typeof item === 'object'
          ? { ...(item as Record<string, unknown>), index: movements.length }
          : { summary: String(item), index: movements.length }
      )
    })
  }

  const remapped = beats.map((beat) => {
    if (typeof beat.movementIndex !== 'number') return beat
    const next = indexMap.get(beat.movementIndex)
    if (next === undefined) {
      const rest = { ...beat }
      delete rest.movementIndex
      return rest
    }
    return next === beat.movementIndex ? beat : { ...beat, movementIndex: next }
  })

  return { movements, beats: remapped }
}

function rebuildSceneFromBeats(
  baseScene: Record<string, unknown>,
  beats: SceneBeat[],
  opts: { isContinuation: boolean; partIndex: number; beatRangeStart: number }
): Record<string, unknown> {
  const rangeEnd = opts.beatRangeStart + beats.length
  const { movements, beats: withMovementIndex } = sliceMovementList(
    baseScene.sceneMovements ?? baseScene.movements,
    beats,
    opts.beatRangeStart,
    rangeEnd
  )

  // Spread keeps cast, location, time of day, and sceneDirection (environment)
  // on every part. Continuation parts drop playback that belongs to part A.
  const stripped: Record<string, unknown> = { ...baseScene }
  stripped.scenePartIndex = opts.partIndex

  if (opts.isContinuation) {
    const newId = uuidv4()
    stripped.id = newId
    stripped.sceneId = newId
    stripped.heading = appendPartLabelToHeading(baseScene.heading, opts.partIndex)
    delete stripped.segments
    for (const key of CONTINUATION_PLAYBACK_KEYS) delete stripped[key]
    if (Array.isArray(stripped.sfx)) {
      stripped.sfx = stripped.sfx.map((item) => {
        if (!item || typeof item !== 'object') return item
        const next = { ...(item as Record<string, unknown>) }
        delete next.audioUrl
        delete next.audioDuration
        return next
      })
    }
  }

  if (Array.isArray(baseScene.sceneMovements) || Array.isArray(baseScene.movements)) {
    if (Array.isArray(baseScene.sceneMovements)) stripped.sceneMovements = movements
    if (Array.isArray(baseScene.movements)) stripped.movements = movements
  }

  const cueSources = ['sceneMusicCues', 'musicCues'] as const
  for (const key of cueSources) {
    if (Array.isArray(baseScene[key])) {
      stripped[key] = sliceMusicCueList(
        baseScene[key],
        opts.beatRangeStart,
        rangeEnd,
        opts.isContinuation
      )
    }
  }

  const withBeats = applyBeatsToScene(stripped, withMovementIndex)
  const duration = sumBeatDurations(withMovementIndex)
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
          beatRangeStart: start,
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

/**
 * Replace one script scene with a revision that may have been split.
 * Part A keeps its scene id. Later parts are inserted immediately after it.
 */
export function replaceSceneWithSplit(
  scenes: Record<string, unknown>[],
  sceneIndex: number,
  revisedScene: Record<string, unknown>,
  continuationScenes: Record<string, unknown>[] = []
): Record<string, unknown>[] {
  if (sceneIndex < 0 || sceneIndex >= scenes.length) return renumberScenes(scenes)
  const next = scenes.slice()
  next.splice(sceneIndex, 1, revisedScene, ...continuationScenes)
  return renumberScenes(next)
}

/** First part replaces the edited scene. Later parts are new scenes. */
export function splitRevisedScene(scene: Record<string, unknown>): {
  revisedScene: Record<string, unknown>
  continuationScenes: Record<string, unknown>[]
} {
  const { scenes } = splitOversizedScenes([scene])
  const [revisedScene, ...continuationScenes] = scenes
  return {
    revisedScene: revisedScene ?? scene,
    continuationScenes,
  }
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

const CHAPTER_ONES = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const

const CHAPTER_TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
] as const

/** Spelled chapter name for a 0-based beat index: "One", "Twenty-One", or "100". */
export function chapterName(beatIndex: number): string {
  const number = Math.trunc(beatIndex) + 1
  if (!Number.isFinite(number) || number < 1) return CHAPTER_ONES[0]
  if (number > 99) return String(number)
  if (number < 20) return CHAPTER_ONES[number - 1]
  const tens = Math.floor(number / 10)
  const ones = number % 10
  return ones === 0 ? CHAPTER_TENS[tens] : `${CHAPTER_TENS[tens]}-${CHAPTER_ONES[ones - 1]}`
}

/** "Chapter One" for beat index 0. Counts past ninety-nine stay numeric. */
export function chapterHeading(beatIndex: number): string {
  return `Chapter ${chapterName(beatIndex)}`
}

/** Synopsis, then description, then intent — the same order script generation uses. */
export function resolveBlueprintBeatDescription(
  beat: BlueprintBeatInput | undefined
): string | undefined {
  if (!beat) return undefined
  const synopsis =
    (typeof beat.synopsis === 'string' && beat.synopsis.trim()) ||
    (typeof beat.description === 'string' && beat.description.trim()) ||
    (typeof beat.intent === 'string' && beat.intent.trim()) ||
    ''
  return synopsis || undefined
}

/**
 * "Subterranean Isolation - Establish Gideon's defensive isolation…"
 * Treatment title wins; the scene's blueprintBeatTitle is the fallback name.
 */
export function resolveChapterBeatLine(
  beat: BlueprintBeatInput | undefined,
  fallbackTitle = ''
): string {
  const name =
    (typeof beat?.title === 'string' && beat.title.trim()) || fallbackTitle.trim()
  const description = resolveBlueprintBeatDescription(beat)
  if (name && description && description !== name) return `${name} - ${description}`
  return name || description || ''
}

/** Blueprint beats stored on the project, preferring the selected treatment variant. */
export function treatmentBeatsFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): BlueprintBeatInput[] {
  if (!metadata) return []

  const variant = metadata.filmTreatmentVariant
  if (variant && typeof variant === 'object' && !Array.isArray(variant)) {
    const beats = extractBlueprintBeats(variant as Record<string, unknown>)
    if (beats.length > 0) return beats
  }

  const treatment = metadata.filmTreatment
  if (treatment && typeof treatment === 'object' && !Array.isArray(treatment)) {
    return extractBlueprintBeats(treatment as Record<string, unknown>)
  }

  return []
}

export interface NeighboringChapterScenes {
  prevSceneIndex?: number
  nextSceneIndex?: number
}

/**
 * First scene of the previous and next chapter, in the order chapters first appear.
 * Scene-by-scene movement stays on the scene chevrons.
 */
export function getNeighboringChapterSceneIndices(
  scenes: Array<Record<string, unknown>>,
  sceneIndex: number
): NeighboringChapterScenes {
  const group = getBlueprintBeatGroup(scenes, sceneIndex)
  if (!group) return {}

  const order: number[] = []
  const firstScene = new Map<number, number>()
  scenes.forEach((scene, index) => {
    const beatIndex = scene?.blueprintBeatIndex
    if (typeof beatIndex !== 'number' || firstScene.has(beatIndex)) return
    firstScene.set(beatIndex, index)
    order.push(beatIndex)
  })

  const position = order.indexOf(group.beatIndex)
  if (position < 0) return {}

  const prevBeat = position > 0 ? order[position - 1] : undefined
  const nextBeat = position < order.length - 1 ? order[position + 1] : undefined

  return {
    ...(prevBeat !== undefined ? { prevSceneIndex: firstScene.get(prevBeat) } : {}),
    ...(nextBeat !== undefined ? { nextSceneIndex: firstScene.get(nextBeat) } : {}),
  }
}
