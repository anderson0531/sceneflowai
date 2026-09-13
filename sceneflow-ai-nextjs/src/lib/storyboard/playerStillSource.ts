/**
 * Sizing helpers for the pre-vis players' scene stills.
 *
 * Stills are stored 16:9 at 1K-2K, so a raw `<img>` decodes 2.4-9.4 MB of
 * bitmap per image no matter how small the box it is drawn in. A scene strip
 * therefore decodes the whole project at full resolution the moment the
 * Screening tab opens. Routing the stills through `next/image` hands back a
 * bitmap sized to the box instead.
 *
 * The optimizer only accepts hosts listed in `images.remotePatterns`
 * (`next.config.mjs`) and cannot touch `data:` URLs, and scene media URLs are
 * only validated as non-empty strings (`isValidStoryboardMediaUrl`), so any
 * other source has to stay a plain `<img>` or it would render broken.
 */

/** Drawn at 56x36 (w-14 h-9) or 96x56 (w-24 h-14); decode for the larger box. */
export const PLAYER_THUMBNAIL_WIDTH = 96
export const PLAYER_THUMBNAIL_HEIGHT = 56

/** Mirrors the `images.remotePatterns` entries in `next.config.mjs`. */
function isOptimizerHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'storage.googleapis.com' ||
    host.endsWith('.public.blob.vercel-storage.com') ||
    host.endsWith('.googleusercontent.com')
  )
}

/** True when `next/image` can resize this still rather than serving it whole. */
export function canOptimizePlayerStill(url: string | null | undefined): boolean {
  if (!url) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
  return isOptimizerHost(parsed.hostname)
}

const warnedKinds = new Set<string>()

/**
 * Surfaces stills the optimizer has to skip. Inline stills are the expensive
 * case: a base64 still is megabytes inside the project JSON itself, which is
 * what `scripts/cleanup-large-projects.ts` was written to clear out.
 */
export function warnUnoptimizedPlayerStill(url: string): void {
  const kind = url.startsWith('data:') ? 'inline' : 'host'
  if (warnedKinds.has(kind)) return
  warnedKinds.add(kind)

  if (kind === 'inline') {
    console.warn(
      '[player] Scene still is an inline data URL, so it is decoded at full size. ' +
        'Re-upload the project stills to move them out of the project JSON.'
    )
    return
  }
  console.warn(
    `[player] Scene still host is not in next.config images.remotePatterns, so it is ` +
      `decoded at full size: ${url.slice(0, 120)}`
  )
}

/** Test seam: lets a suite observe the first warning again. */
export function resetPlayerStillWarnings(): void {
  warnedKinds.clear()
}
