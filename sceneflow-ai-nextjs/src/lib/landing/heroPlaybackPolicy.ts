/**
 * Device / network policy for the landing hero.
 *
 * Phones and desktop both play the uploaded web encode (~35 MB). The 4K
 * master is never attached to the inline tile.
 */

export type HeroNetworkContext = {
  isMobile: boolean
  saveData: boolean
  effectiveType: string
}

type NavigatorConnection = {
  saveData?: boolean
  effectiveType?: string
}

export function readHeroNetworkContext(): HeroNetworkContext {
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  const connection =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { connection?: NavigatorConnection }).connection
      : undefined
  return {
    isMobile,
    saveData: Boolean(connection?.saveData),
    effectiveType: connection?.effectiveType ?? '',
  }
}

/** True when the inline hero should use the 720p file, not 1080p/4K. */
export function prefersLeanHeroSource(ctx: HeroNetworkContext): boolean {
  if (ctx.saveData) return true
  if (ctx.isMobile) return true
  return ctx.effectiveType === 'slow-2g' || ctx.effectiveType === '2g' || ctx.effectiveType === '3g'
}

/**
 * Conservative first paint: treat the visitor as mobile until the client
 * measures. That way a phone never starts the 4K master before hydration.
 */
export const HERO_NETWORK_CONTEXT_PENDING: HeroNetworkContext = {
  isMobile: true,
  saveData: false,
  effectiveType: '',
}
