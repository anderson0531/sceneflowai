/**
 * Order-dependent digest of a list of text inputs.
 *
 * FNV-1a rather than node `crypto` so the same helper runs in tests, on the
 * server, and in client-side code without pulling a node builtin into the
 * bundle.
 */
export function fingerprintSource(parts: Array<string | undefined | null>): string {
  const normalized = parts
    .map((part) => (part ?? '').replace(/\s+/g, ' ').trim().toLowerCase())
    .join('\u0000')

  let hash = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
