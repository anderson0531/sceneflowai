/**
 * Splits a script into scene chunks for per-scene analysis.
 *
 * Analysis used to sample roughly every 15th scene once a script passed 30
 * scenes, so most scenes never received recommendations. Chunking lets each
 * batch run as its own durable step, which removes the single-response size
 * and timeout limits that forced the sampling in the first place.
 */

export const DEFAULT_SCENE_CHUNK_SIZE = 10

export type SceneChunk = {
  index: number
  /** Zero-based index of the first scene in this chunk. */
  startIndex: number
  /** Zero-based index after the last scene in this chunk. */
  endIndex: number
  /** One-based scene numbers covered, as shown to the user and the model. */
  sceneNumbers: number[]
}

export function planSceneChunks(
  sceneCount: number,
  chunkSize: number = DEFAULT_SCENE_CHUNK_SIZE
): SceneChunk[] {
  if (!Number.isFinite(sceneCount) || sceneCount <= 0) return []
  const size = Math.max(1, Math.floor(chunkSize))

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

/**
 * Progress percentage after completing `completedChunks` of `totalChunks`.
 * The synthesis pass is the last 10%, so scene passes span 0-90.
 */
export function chunkProgress(completedChunks: number, totalChunks: number): number {
  if (totalChunks <= 0) return 90
  const ratio = Math.min(1, Math.max(0, completedChunks / totalChunks))
  return Math.round(ratio * 90)
}
