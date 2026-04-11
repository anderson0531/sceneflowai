/**
 * Normalize scene SFX descriptions into a concise search query for in-app library search.
 */

export function sfxSearchQuery(
  raw: string | { description?: string } | null | undefined
): string {
  const text =
    typeof raw === 'string'
      ? raw
      : typeof raw === 'object' && raw && typeof raw.description === 'string'
        ? raw.description
        : ''

  let q = text.trim()
  if (!q) return ''

  // Drop parenthetical production notes, e.g. "(for crimson flare)"
  q = q.replace(/\s*\([^)]*\)\s*/g, ' ')
  // Collapse whitespace
  q = q.replace(/\s+/g, ' ').trim()

  return q
}
