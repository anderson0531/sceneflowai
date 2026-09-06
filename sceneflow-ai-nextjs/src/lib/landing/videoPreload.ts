/** HTML video preload attribute values we use on the landing page. */
export type VideoPreloadValue = 'auto' | 'metadata' | 'none'

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
}

/**
 * Conservative preload for the landing hero.
 * `auto` on a large remote MP4 competes with poster first-paint.
 */
export function getVideoPreloadStrategy(options?: {
  isMobile?: boolean
  saveData?: boolean
  effectiveType?: string
}): VideoPreloadValue {
  const connection =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { connection?: NetworkInformation }).connection
      : undefined

  const saveData = options?.saveData ?? connection?.saveData ?? false

  if (saveData) return 'none'
  return 'metadata'
}

/** Preload for modal players — defer until the surface is opened. */
export function getModalVideoPreload(open: boolean): VideoPreloadValue {
  return open ? 'metadata' : 'none'
}
