/**
 * Scene movements: the mapping between a scene's description and its beats.
 *
 * A scene holds up to `MAX_BEATS_PER_SCENE` beats, and each beat is rendered as
 * an independent still. Without a shared structure every beat re-reads the same
 * whole-scene description and composes a frame for "the scene" rather than for
 * its own moment, which is what makes a 15-beat scene read as disconnected
 * fragments. A movement names one sentence of the scene description and the
 * contiguous run of beats that dramatizes it, so a beat can be told both what
 * it is illustrating and where that sits in the scene's arc.
 *
 * Movements are authored by the script LLM when available (`generatedBy: 'llm'`)
 * and derived deterministically from the scene description otherwise, so
 * projects written before movements existed still get an arc.
 */

import type { SceneBeat, SceneMovement } from '@/lib/script/segmentTypes'

/**
 * Upper bound on movements per scene.
 *
 * More movements than this turns the arc block into a beat-by-beat restatement
 * of the description, which costs prompt budget without adding structure.
 */
export const MAX_SCENE_MOVEMENTS = 6

/** Below this, a movement summary is a fragment rather than a story statement. */
const MIN_SUMMARY_LENGTH = 12

/** Summaries longer than this are truncated before entering a prompt. */
const MAX_SUMMARY_LENGTH = 320

function cleanSummary(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  return trimmed.length > MAX_SUMMARY_LENGTH
    ? `${trimmed.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`
    : trimmed
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > MIN_SUMMARY_LENGTH)
}

/**
 * Merge `sentences` down to at most `max` groups, keeping original order.
 * Used when a description has more sentences than the scene has movements.
 */
function mergeSentencesToCount(sentences: string[], max: number): string[] {
  if (sentences.length <= max) return sentences
  const groups: string[] = []
  const perGroup = sentences.length / max
  for (let i = 0; i < max; i++) {
    const start = Math.round(i * perGroup)
    const end = i === max - 1 ? sentences.length : Math.round((i + 1) * perGroup)
    const slice = sentences.slice(start, Math.max(end, start + 1))
    groups.push(slice.join(' '))
  }
  return groups
}

/**
 * Nudge a movement boundary by up to one beat so it lands after an action beat.
 *
 * Cutting a movement in the middle of an exchange leaves the two halves of a
 * line in different parts of the arc; action beats are the natural seams.
 */
function snapBoundaryToActionBeat(
  beats: SceneBeat[],
  boundary: number,
  minBoundary: number,
  maxBoundary: number
): number {
  if (boundary <= minBoundary || boundary >= maxBoundary) return boundary
  if (beats[boundary - 1]?.kind === 'action') return boundary
  for (const candidate of [boundary + 1, boundary - 1]) {
    if (candidate <= minBoundary || candidate >= maxBoundary) continue
    if (beats[candidate - 1]?.kind === 'action') return candidate
  }
  return boundary
}

/**
 * Spread `beatCount` beats across `summaries` in order, giving the remainder to
 * the earliest movements and snapping boundaries onto action beats.
 */
function assignRanges(
  summaries: string[],
  beats: SceneBeat[],
  source: SceneMovement['generatedBy']
): SceneMovement[] {
  const beatCount = beats.length
  const count = Math.min(summaries.length, beatCount)
  if (count <= 0) return []

  const base = Math.floor(beatCount / count)
  const remainder = beatCount % count

  const movements: SceneMovement[] = []
  let cursor = 0
  for (let index = 0; index < count; index++) {
    const size = base + (index < remainder ? 1 : 0)
    const isLast = index === count - 1
    let end = isLast ? beatCount : cursor + size
    if (!isLast) {
      end = snapBoundaryToActionBeat(beats, end, cursor + 1, beatCount - (count - index - 1))
    }
    movements.push({
      index,
      summary: summaries[index],
      beatStart: cursor,
      beatEnd: Math.max(cursor, end - 1),
      generatedBy: source,
    })
    cursor = end
  }

  return movements
}

/**
 * Group beats by their `movementIndex` tag.
 *
 * Returns `null` when the tags cannot describe an ordered partition — missing
 * tags, out-of-range values, or a movement whose beats are not contiguous. The
 * caller then falls back to proportional assignment rather than persisting an
 * arc that disagrees with the beat order.
 */
function rangesFromBeatTags(
  summaries: string[],
  beats: SceneBeat[],
  source: SceneMovement['generatedBy']
): SceneMovement[] | null {
  if (summaries.length === 0 || beats.length === 0) return null

  const bounds = new Map<number, { start: number; end: number; seen: number }>()
  for (let beatIndex = 0; beatIndex < beats.length; beatIndex++) {
    const tag = beats[beatIndex].movementIndex
    if (typeof tag !== 'number' || !Number.isInteger(tag)) return null
    if (tag < 0 || tag >= summaries.length) return null
    const existing = bounds.get(tag)
    if (existing) {
      existing.end = beatIndex
      existing.seen += 1
    } else {
      bounds.set(tag, { start: beatIndex, end: beatIndex, seen: 1 })
    }
  }

  const movements: SceneMovement[] = []
  let expectedStart = 0
  for (let index = 0; index < summaries.length; index++) {
    const range = bounds.get(index)
    // A summary with no beats means the model wrote an arc it never dramatized.
    if (!range) return null
    if (range.start !== expectedStart) return null
    if (range.end - range.start + 1 !== range.seen) return null
    movements.push({
      index,
      summary: summaries[index],
      beatStart: range.start,
      beatEnd: range.end,
      generatedBy: source,
    })
    expectedStart = range.end + 1
  }

  return expectedStart === beats.length ? movements : null
}

/** Text the derived arc is cut from, richest source first. */
function sceneDescriptionSource(scene: Record<string, unknown>): string {
  const direction =
    scene.sceneDirection && typeof scene.sceneDirection === 'object'
      ? (scene.sceneDirection as Record<string, unknown>)
      : scene.detailedDirection && typeof scene.detailedDirection === 'object'
        ? (scene.detailedDirection as Record<string, unknown>)
        : undefined

  // `sceneSynopsis` is deliberately absent: it is written FROM the arc, so
  // reading it back would freeze the first derivation in place and stop the
  // richer description written by the direction pass from ever taking effect.
  const candidates = [
    direction?.sceneDescription,
    scene.action,
    scene.description,
    scene.visualDescription,
    scene.summary,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > MIN_SUMMARY_LENGTH) {
      return candidate.trim()
    }
  }
  return ''
}

/**
 * Cut a scene's description into movements and spread the beats across them.
 *
 * This is the path taken by scripts written before movements existed, and by
 * any scene whose persisted arc no longer matches its beat list.
 */
export function deriveSceneMovements(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): SceneMovement[] {
  if (beats.length === 0) return []

  const description = sceneDescriptionSource(scene)
  if (!description) return []

  const sentences = splitSentences(description)
  if (sentences.length === 0) return []

  const summaries = mergeSentencesToCount(
    sentences,
    Math.min(MAX_SCENE_MOVEMENTS, beats.length)
  )
  return assignRanges(summaries, beats, 'derived')
}

/**
 * Build movements from LLM-authored summaries plus the beats they tag.
 *
 * `raw` is the model's `movements` array; beats are expected to carry
 * `movementIndex`. Falls back to proportional assignment when the tags do not
 * form an ordered partition of the beat list.
 */
export function normalizeSceneMovements(
  raw: unknown,
  beats: SceneBeat[],
  source: SceneMovement['generatedBy'] = 'llm'
): SceneMovement[] {
  if (!Array.isArray(raw) || beats.length === 0) return []

  const entries: Array<{ summary: string; intent?: string }> = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const summary = cleanSummary(item)
      if (summary) entries.push({ summary })
      continue
    }
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const summary = cleanSummary(row.summary ?? row.description ?? row.text)
    if (!summary) continue
    const intent = cleanSummary(row.intent ?? row.purpose)
    entries.push(intent ? { summary, intent } : { summary })
  }

  if (entries.length === 0) return []

  const summaries = entries.slice(0, MAX_SCENE_MOVEMENTS).map((entry) => entry.summary)
  const movements =
    rangesFromBeatTags(summaries, beats, source) ?? assignRanges(summaries, beats, source)

  return movements.map((movement) => {
    const intent = entries[movement.index]?.intent
    return intent ? { ...movement, intent } : movement
  })
}

/** Read a persisted arc, repairing any range that drifted from the beat list. */
export function parsePersistedSceneMovements(
  raw: unknown,
  beats: SceneBeat[]
): SceneMovement[] {
  if (!Array.isArray(raw) || raw.length === 0 || beats.length === 0) return []

  const parsed: SceneMovement[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const summary = cleanSummary(row.summary)
    if (!summary) continue
    const beatStart = Number(row.beatStart)
    const beatEnd = Number(row.beatEnd)
    if (!Number.isInteger(beatStart) || !Number.isInteger(beatEnd)) continue
    const intent = cleanSummary(row.intent)
    const generatedBy = row.generatedBy
    parsed.push({
      index: parsed.length,
      summary,
      ...(intent ? { intent } : {}),
      beatStart,
      beatEnd,
      generatedBy:
        generatedBy === 'llm' || generatedBy === 'user' || generatedBy === 'derived'
          ? generatedBy
          : 'derived',
    })
  }

  if (parsed.length === 0) return []

  const covers =
    parsed[0].beatStart === 0 &&
    parsed[parsed.length - 1].beatEnd === beats.length - 1 &&
    parsed.every(
      (movement, i) =>
        movement.beatEnd >= movement.beatStart &&
        (i === 0 || movement.beatStart === parsed[i - 1].beatEnd + 1)
    )

  if (covers) return parsed

  // Beats were added, removed, or reordered after the arc was written. Keep the
  // authored summaries and re-spread them rather than dropping the arc.
  return assignRanges(
    parsed.map((movement) => movement.summary),
    beats,
    parsed[0].generatedBy ?? 'derived'
  ).map((movement) => {
    const intent = parsed[movement.index]?.intent
    return intent ? { ...movement, intent } : movement
  })
}

/**
 * The scene's arc, in order of authority: the persisted arc when it still fits
 * the beats, then the raw `movements` the script LLM emitted alongside them,
 * then one cut from the scene description.
 */
export function getSceneMovements(
  scene: Record<string, unknown> | null | undefined,
  beats: SceneBeat[]
): SceneMovement[] {
  if (!scene || beats.length === 0) return []

  const persisted = parsePersistedSceneMovements(scene.sceneMovements, beats)
  // An authored arc is the scene's intent and is never recomputed. A derived
  // one is only ever a read of the best description available at the time, so
  // it is recut whenever a richer description has since been written (the
  // direction pass replaces raw scene action with a per-movement synopsis).
  if (persisted.length > 0 && persisted[0].generatedBy !== 'derived') return persisted

  const fromLlm = normalizeSceneMovements(scene.movements, beats, 'llm')
  if (fromLlm.length > 0) return fromLlm

  const derived = deriveSceneMovements(scene, beats)
  return derived.length > 0 ? derived : persisted
}

export interface ResolvedBeatMovement {
  movement: SceneMovement
  /** 1-based position of this beat inside its movement. */
  positionInMovement: number
  /** Total beats in this movement. */
  movementBeatCount: number
  /** Total movements in the scene. */
  totalMovements: number
}

/** Locate the movement a beat belongs to, with its position inside it. */
export function resolveBeatMovement(
  movements: SceneMovement[],
  beatIndex: number
): ResolvedBeatMovement | undefined {
  const movement = movements.find(
    (candidate) => beatIndex >= candidate.beatStart && beatIndex <= candidate.beatEnd
  )
  if (!movement) return undefined
  return {
    movement,
    positionInMovement: beatIndex - movement.beatStart + 1,
    movementBeatCount: movement.beatEnd - movement.beatStart + 1,
    totalMovements: movements.length,
  }
}

/** Persist the arc on the scene and tag each beat with its movement. */
export function applySceneMovements(
  scene: Record<string, unknown>,
  movements: SceneMovement[],
  beats: SceneBeat[]
): { scene: Record<string, unknown>; beats: SceneBeat[] } {
  if (movements.length === 0) return { scene, beats }

  const taggedBeats = beats.map((beat, index) => {
    const resolved = resolveBeatMovement(movements, index)
    if (!resolved) return beat
    return beat.movementIndex === resolved.movement.index
      ? beat
      : { ...beat, movementIndex: resolved.movement.index }
  })

  const nextScene: Record<string, unknown> = {
    ...scene,
    sceneMovements: movements,
    sceneSynopsis: buildSceneSynopsis(movements),
  }
  // `movements` is the raw LLM field; `sceneMovements` is the normalized record.
  delete nextScene.movements

  return { scene: nextScene, beats: taggedBeats }
}

/** Resolve the scene's arc and persist it together with the beat tags. */
export function ensureSceneMovements(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): { scene: Record<string, unknown>; beats: SceneBeat[] } {
  return applySceneMovements(scene, getSceneMovements(scene, beats), beats)
}

/** The scene description as one paragraph, one sentence per movement. */
export function buildSceneSynopsis(movements: SceneMovement[]): string {
  return movements
    .map((movement) => movement.summary.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Prompt block naming the whole arc, with `>` on the movement being rendered.
 *
 * Every beat sees the full arc so it can hold continuity with the beats around
 * it, and sees which part of that arc it is responsible for so it does not try
 * to illustrate the entire scene.
 */
export function formatSceneArcBlock(
  movements: SceneMovement[],
  currentMovementIndex?: number
): string {
  if (movements.length === 0) return ''

  const lines = movements.map((movement) => {
    const marker = movement.index === currentMovementIndex ? '>' : ' '
    const beatRange =
      movement.beatStart === movement.beatEnd
        ? `beat ${movement.beatStart + 1}`
        : `beats ${movement.beatStart + 1}-${movement.beatEnd + 1}`
    return `${marker} ${movement.index + 1}. (${beatRange}) ${movement.summary}`
  })

  return `SCENE ARC (the beats below tell this story in order):\n${lines.join('\n')}`
}
