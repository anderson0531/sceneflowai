/** HTML video preload attribute values we use on the landing page. */
export type VideoPreloadValue = 'auto' | 'metadata' | 'none'

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
}

/**
 * Pick a conservative preload strategy for mobile and slow connections.
 * Desktop fast links may still use `auto` for smoother hero autoplay.
 */
export function getVideoPreloadStrategy(options?: {
  isMobile?: boolean
  saveData?: boolean
  effectiveType?: string
}): VideoPreloadValue {
  const isMobile =
    options?.isMobile ??
    (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)

  const connection =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { connection?: NetworkInformation }).connection
      : undefined

  const saveData = options?.saveData ?? connection?.saveData ?? false
  const effectiveType = options?.effectiveType ?? connection?.effectiveType ?? ''

  if (saveData) return 'none'
  if (isMobile) return 'metadata'
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return 'metadata'
  }
  return 'auto'
}

/** Preload for modal players — defer until the surface is opened. */
export function getModalVideoPreload(open: boolean): VideoPreloadValue {
  return open ? 'metadata' : 'none'
}
