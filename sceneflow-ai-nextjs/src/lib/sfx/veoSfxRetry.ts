/** Detect transient Vertex / Veo capacity errors worth retrying. */
export function isTransientVertexError(message: string): boolean {
  const m = (message || '').toLowerCase()
  if (!m) return false
  if (m.includes('high load') || m.includes('try again later')) return true
  if (m.includes('resource exhausted') || m.includes('resource_exhausted')) return true
  if (m.includes('too many requests') || m.includes('rate limit')) return true
  if (/\b429\b/.test(m) || /\b503\b/.test(m) || /\b502\b/.test(m)) return true
  return false
}

export function extractOperationId(message: string): string | undefined {
  const match = message.match(/Operation ID:\s*([a-f0-9-]+)/i)
  return match?.[1]
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Backoff delays between full generation retries (ms). */
export const VEO_SFX_RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const

export async function withVeoSfxRetries<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; label?: string } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? VEO_SFX_RETRY_DELAYS_MS.length + 1
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      lastError = err
      const transient = isTransientVertexError(err.message)
      const opId = extractOperationId(err.message)

      if (!transient || attempt >= maxAttempts) {
        throw err
      }

      const delay = VEO_SFX_RETRY_DELAYS_MS[attempt - 1] ?? 30_000
      console.warn(
        `[Veo SFX] ${options.label ?? 'Generation'} attempt ${attempt}/${maxAttempts} failed (transient).` +
          (opId ? ` Operation ID: ${opId}.` : '') +
          ` Retrying in ${delay / 1000}s…`,
        err.message
      )
      await sleepMs(delay)
    }
  }

  throw lastError ?? new Error('Veo SFX generation failed')
}
