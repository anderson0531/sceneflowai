/**
 * Bounded worker pool for audio metadata probes.
 *
 * A scene can carry a URL per beat plus SFX plus music. Firing a `new Audio()`
 * for every one of them in a single tick is what used to pile ~45 media
 * elements onto a 22-beat scene at mount.
 */

export const AUDIO_PROBE_CONCURRENCY = 4

export async function runBoundedPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
  isCancelled?: () => boolean
): Promise<void> {
  if (items.length === 0) return
  const limit = Math.max(1, Math.min(concurrency, items.length))
  let next = 0

  const runWorker = async (): Promise<void> => {
    while (next < items.length) {
      if (isCancelled?.()) return
      const index = next
      next += 1
      const item = items[index]
      if (item === undefined) return
      await worker(item)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()))
}
