import {
  readHeroNetworkContext,
  type HeroNetworkContext,
} from '@/lib/landing/heroPlaybackPolicy'

/** HTML video preload attribute values we use on the landing page. */
export type VideoPreloadValue = 'auto' | 'metadata' | 'none'

/**
 * Conservative preload for the inline hero. `auto` would pull the whole
 * progressive file during first paint; metadata is enough for muted autoplay.
 */
export function getVideoPreloadStrategy(
  options?: Partial<HeroNetworkContext>
): VideoPreloadValue {
  const measured = typeof window !== 'undefined' ? readHeroNetworkContext() : undefined
  const ctx: HeroNetworkContext = {
    isMobile: options?.isMobile ?? measured?.isMobile ?? false,
    saveData: options?.saveData ?? measured?.saveData ?? false,
    effectiveType: options?.effectiveType ?? measured?.effectiveType ?? '',
  }

  if (ctx.saveData) return 'none'
  return 'metadata'
}

/** Preload for modal players — defer until the surface is opened. */
export function getModalVideoPreload(open: boolean): VideoPreloadValue {
  return open ? 'metadata' : 'none'
}
