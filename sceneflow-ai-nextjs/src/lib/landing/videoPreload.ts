import {
  prefersLeanHeroSource,
  readHeroNetworkContext,
  type HeroNetworkContext,
} from '@/lib/landing/heroPlaybackPolicy'

/** HTML video preload attribute values we use on the landing page. */
export type VideoPreloadValue = 'auto' | 'metadata' | 'none'

/**
 * Pick a conservative preload strategy for mobile and slow connections.
 * Desktop fast links may still use `auto` for smoother hero autoplay.
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
  if (prefersLeanHeroSource(ctx)) return 'metadata'
  return 'auto'
}

/** Preload for modal players — defer until the surface is opened. */
export function getModalVideoPreload(open: boolean): VideoPreloadValue {
  return open ? 'metadata' : 'none'
}
