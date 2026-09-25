/**
 * Splits a script into scene chunks for per-scene analysis.
 *
 * Analysis used to sample roughly every 15th scene once a script passed 30
 * scenes, so most scenes never received recommendations. Chunking lets each
 * batch run as its own durable step. Batches follow Blueprint beats when the
 * script recorded them, and never exceed a few scenes so one response can
 * finish even with high thinking.
 */

/** Safe default and hard maximum. A caller-supplied size can only go smaller. */
export const DEFAULT_SCENE_CHUNK_SIZE = 4

export const MAX_SCENES_PER_CHUNK = 4

export type SceneChunk = {
  index: number
  /** Zero-based index of the first scene in this chunk. */
  startIndex: number
  /** Zero-based index after the last scene in this chunk. */
  endIndex: number
  /** One-based scene numbers covered, as shown to the user and the model. */
  sceneNumbers: number[]
  /** Blueprint beat these scenes were written from, when every scene shares one. */
  blueprintBeatIndex?: number
  blueprintBeatTitle?: string
}

/**
 * Resolves the scene cap. An explicit size is a tighter cap, never a reason
 * to send more scenes than `MAX_SCENES_PER_CHUNK`.
 */
export function resolveSceneChunkCap(chunkSize?: number): number {
  if (chunkSize == null || !Number.isFinite(chunkSize)) return DEFAULT_SCENE_CHUNK_SIZE
  const requested = Math.floor(chunkSize)
  if (requested <= 0) return 1
  return Math.min(MAX_SCENES_PER_CHUNK, requested)
}

export function planSceneChunks(
  sceneCount: number,
  chunkSize: number = DEFAULT_SCENE_CHUNK_SIZE
): SceneChunk[] {
  if (!Number.isFinite(sceneCount) || sceneCount <= 0) return []
  const size = Math.max(1, Math.floor(chunkSize) || 1)

  const chunks: SceneChunk[] = []
  for (let startIndex = 0; startIndex < sceneCount; startIndex += size) {
    const endIndex = Math.min(startIndex + size, sceneCount)
    chunks.push({
      index: chunks.length,
      startIndex,
      endIndex,
      sceneNumbers: Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i + 1),
    })
  }
  return chunks
}

function beatIndexOf(scene: { blueprintBeatIndex?: unknown }): number | null {
  return typeof scene?.blueprintBeatIndex === 'number' && Number.isFinite(scene.blueprintBeatIndex)
    ? scene.blueprintBeatIndex
    : null
}

function beatTitleOf(scene: { blueprintBeatTitle?: unknown }): string | undefined {
  return typeof scene?.blueprintBeatTitle === 'string' && scene.blueprintBeatTitle.trim()
    ? scene.blueprintBeatTitle
    : undefined
}

/**
 * Groups consecutive scenes that share a Blueprint beat, then splits any group
 * larger than the cap. Scenes without a beat pack in order under the same cap
 * and are not merged across a beat boundary.
 */
export function planAnalysisChunks(
  scenes: Array<{ blueprintBeatIndex?: unknown; blueprintBeatTitle?: unknown }>,
  options?: { maxScenesPerChunk?: number }
): SceneChunk[] {
  if (!scenes?.length) return []
  const cap = resolveSceneChunkCap(options?.maxScenesPerChunk)

  type Group = { start: number; end: number; beat: number | null; title?: string }
  const groups: Group[] = []

  for (let i = 0; i < scenes.length; i++) {
    const beat = beatIndexOf(scenes[i])
    const title = beatTitleOf(scenes[i])
    const prev = groups[groups.length - 1]
    const continues =
      prev != null && ((prev.beat !== null && prev.beat === beat) || (prev.beat === null && beat === null))
    if (continues && prev) {
      prev.end = i + 1
      if (!prev.title && title) prev.title = title
    } else {
      groups.push({ start: i, end: i + 1, beat, title })
    }
  }

  const chunks: SceneChunk[] = []
  for (const group of groups) {
    for (let start = group.start; start < group.end; start += cap) {
      const end = Math.min(start + cap, group.end)
      chunks.push({
        index: chunks.length,
        startIndex: start,
        endIndex: end,
        sceneNumbers: Array.from({ length: end - start }, (_, i) => start + i + 1),
        ...(group.beat !== null
          ? {
              blueprintBeatIndex: group.beat,
              ...(group.title ? { blueprintBeatTitle: group.title } : {}),
            }
          : {}),
      })
    }
  }
  return chunks
}

/**
 * Splits a chunk in half so a truncated response can be retried as two smaller
 * requests. Returns null when the chunk is already a single scene.
 */
export function halveSceneChunk(chunk: SceneChunk): [SceneChunk, SceneChunk] | null {
  const count = chunk.endIndex - chunk.startIndex
  if (count < 2) return null
  const mid = chunk.startIndex + Math.ceil(count / 2)
  const splitAt = mid - chunk.startIndex
  const shared = {
    blueprintBeatIndex: chunk.blueprintBeatIndex,
    blueprintBeatTitle: chunk.blueprintBeatTitle,
  }
  return [
    {
      index: chunk.index,
      startIndex: chunk.startIndex,
      endIndex: mid,
      sceneNumbers: chunk.sceneNumbers.slice(0, splitAt),
      ...shared,
    },
    {
      index: chunk.index,
      startIndex: mid,
      endIndex: chunk.endIndex,
      sceneNumbers: chunk.sceneNumbers.slice(splitAt),
      ...shared,
    },
  ]
}

/**
 * Progress percentage after completing `completedChunks` of `totalChunks`.
 * The synthesis pass is the last 10%, so scene passes span 0-90.
 */
export function chunkProgress(completedChunks: number, totalChunks: number): number {
  if (totalChunks <= 0) return 90
  const ratio = Math.min(1, Math.max(0, completedChunks / totalChunks))
  return Math.round(ratio * 90)
}
