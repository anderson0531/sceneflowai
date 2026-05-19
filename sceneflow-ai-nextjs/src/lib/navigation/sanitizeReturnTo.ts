/**
 * Validates `returnTo` query values to reduce open-redirect risk.
 * Allows same-origin relative paths or absolute URLs that resolve to the current origin.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  let decoded = raw.trim()
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return null
  }
  if (!decoded || decoded.length > 2048) return null

  if (decoded.startsWith('/') && !decoded.startsWith('//')) {
    return decoded
  }

  if (typeof window !== 'undefined') {
    try {
      const u = new URL(decoded, window.location.origin)
      if (u.origin === window.location.origin) {
        return `${u.pathname}${u.search}${u.hash}`
      }
    } catch {
      return null
    }
  }

  return null
}
