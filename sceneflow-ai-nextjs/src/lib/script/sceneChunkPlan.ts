/**
 * Chunk plan for script generation: turns the Blueprint beat decomposition into
 * per-call scene ranges.
 *
 * A single LLM call cannot emit a longform script — TARGET_BEATS_PER_SCENE
 * beats per scene across 20+ scenes exceeds any safe output token budget.
 * Generation therefore runs one call per chunk, and the scene count per chunk
 * is decided here rather than left to prompt prose the model is free to compress.
 */

import {
  TARGET_BEATS_PER_SCENE,
  type BeatDecompositionEntry,
  type BlueprintBeatInput,
  type SceneDecompositionPlan,
} from '@/lib/script/sceneDecomposition'

/** Scenes requested per LLM call. Keeps chunk output well inside the token budget. */
export const MAX_SCENES_PER_CHUNK = 6

export interface SceneChunk {
  /** 0-based Blueprint beat this chunk belongs to, or null when the treatment has no beats. */
  blueprintBeatIndex: number | null
  blueprintBeatTitle: string
  beatSynopsis?: string
  /** 1-based scene number of the first scene in this chunk, contiguous across chunks. */
  sceneNumberStart: number
  sceneCount: number
  targetBeatsPerScene: number
  /** Which slice of a multi-chunk beat this is, and how many slices that beat has. */
  partIndex: number
  partCount: number
}

export interface SceneChunkPlan {
  chunks: SceneChunk[]
  totalScenes: number
}

/**
 * Split n scenes into chunk sizes of at most `maxPerChunk`, spread evenly so no
 * call is left with a single scene to write.
 */
export function splitSceneCount(
  sceneCount: number,
  maxPerChunk: number = MAX_SCENES_PER_CHUNK
): number[] {
  const cap = Math.max(1, Math.floor(maxPerChunk))
  const total = Math.max(1, Math.floor(sceneCount))
  if (total <= cap) return [total]

  const chunkCount = Math.ceil(total / cap)
  const base = Math.floor(total / chunkCount)
  const remainder = total % chunkCount

  return Array.from({ length: chunkCount }, (_, i) => base + (i < remainder ? 1 : 0))
}

function resolveBeatSynopsis(beat: BlueprintBeatInput | undefined): string | undefined {
  if (!beat) return undefined
  const synopsis =
    (typeof beat.synopsis === 'string' && beat.synopsis.trim()) ||
    (typeof beat.description === 'string' && beat.description.trim()) ||
    (typeof beat.intent === 'string' && beat.intent.trim()) ||
    ''
  return synopsis || undefined
}

function beatsPerSceneFor(entry: BeatDecompositionEntry): number {
  const perScene = Math.round(entry.targetBeats / Math.max(1, entry.targetScenes))
  return Math.max(4, Math.min(TARGET_BEATS_PER_SCENE, perScene))
}

/**
 * Build the ordered chunk list. Scene numbers run 1..totalScenes across chunks so
 * the model never has to guess where its slice sits in the script.
 */
export function buildSceneChunks(
  plan: SceneDecompositionPlan,
  blueprintBeats: BlueprintBeatInput[] = [],
  opts?: { maxScenesPerChunk?: number }
): SceneChunkPlan {
  const maxPerChunk = opts?.maxScenesPerChunk ?? MAX_SCENES_PER_CHUNK
  const chunks: SceneChunk[] = []
  let sceneNumber = 1

  for (const entry of plan.entries) {
    const sizes = splitSceneCount(entry.targetScenes, maxPerChunk)
    const targetBeatsPerScene = beatsPerSceneFor(entry)
    const beatSynopsis = resolveBeatSynopsis(blueprintBeats[entry.index])

    sizes.forEach((sceneCount, partIndex) => {
      chunks.push({
        blueprintBeatIndex: entry.index,
        blueprintBeatTitle: entry.title,
        beatSynopsis,
        sceneNumberStart: sceneNumber,
        sceneCount,
        targetBeatsPerScene,
        partIndex,
        partCount: sizes.length,
      })
      sceneNumber += sceneCount
    })
  }

  return { chunks, totalScenes: sceneNumber - 1 }
}

/**
 * Chunks for a treatment with no Blueprint beats. Scene count comes from the
 * format's target so beat-less treatments keep generating a full-length script.
 */
export function buildFallbackSceneChunks(
  totalScenes: number,
  opts?: { maxScenesPerChunk?: number; targetBeatsPerScene?: number }
): SceneChunkPlan {
  const maxPerChunk = opts?.maxScenesPerChunk ?? MAX_SCENES_PER_CHUNK
  const targetBeatsPerScene = Math.max(
    4,
    Math.min(TARGET_BEATS_PER_SCENE, opts?.targetBeatsPerScene ?? TARGET_BEATS_PER_SCENE)
  )
  const sizes = splitSceneCount(totalScenes, maxPerChunk)

  const chunks: SceneChunk[] = []
  let sceneNumber = 1
  sizes.forEach((sceneCount, partIndex) => {
    chunks.push({
      blueprintBeatIndex: null,
      blueprintBeatTitle: `Act ${partIndex + 1} of ${sizes.length}`,
      sceneNumberStart: sceneNumber,
      sceneCount,
      targetBeatsPerScene,
      partIndex,
      partCount: sizes.length,
    })
    sceneNumber += sceneCount
  })

  return { chunks, totalScenes: sceneNumber - 1 }
}

/**
 * Halve a chunk when its call hit the output token ceiling. Returns null when the
 * chunk is already a single scene and cannot be reduced further.
 */
export function halveChunk(chunk: SceneChunk): [SceneChunk, SceneChunk] | null {
  if (chunk.sceneCount < 2) return null

  const firstCount = Math.ceil(chunk.sceneCount / 2)
  const secondCount = chunk.sceneCount - firstCount

  return [
    { ...chunk, sceneCount: firstCount, partCount: chunk.partCount + 1 },
    {
      ...chunk,
      sceneNumberStart: chunk.sceneNumberStart + firstCount,
      sceneCount: secondCount,
      partIndex: chunk.partIndex + 1,
      partCount: chunk.partCount + 1,
    },
  ]
}

/** Produced-vs-planned scene counts per Blueprint beat, for logging and QA. */
export function summarizeChunkYield(
  chunks: SceneChunk[],
  producedByChunk: number[]
): Array<{ blueprintBeatIndex: number | null; title: string; planned: number; produced: number }> {
  const byBeat = new Map<
    string,
    { blueprintBeatIndex: number | null; title: string; planned: number; produced: number }
  >()

  chunks.forEach((chunk, i) => {
    const key = String(chunk.blueprintBeatIndex ?? `fallback-${chunk.partIndex}`)
    const existing = byBeat.get(key)
    const produced = producedByChunk[i] ?? 0
    if (existing) {
      existing.planned += chunk.sceneCount
      existing.produced += produced
    } else {
      byBeat.set(key, {
        blueprintBeatIndex: chunk.blueprintBeatIndex,
        title: chunk.blueprintBeatTitle,
        planned: chunk.sceneCount,
        produced,
      })
    }
  })

  return Array.from(byBeat.values())
}
