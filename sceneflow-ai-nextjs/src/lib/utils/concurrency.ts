/**
 * Run async work over `items` with at most `limit` in flight. Results keep input order.
 * Use from the client to batch calls (e.g. `/api/production/generate-segment-frames`) without overwhelming the server.
 */
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []
  const cap = Math.max(1, Math.floor(limit))
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }

  const n = Math.min(cap, items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}
