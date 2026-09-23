/**
 * SceneFlow brand tokens — film-strip infinity (cyan-to-purple on navy).
 * Wordmark styling mirrors SceneProductionMixer / landing hero palette.
 */

export const BRAND = {
  name: 'SceneFlow Studio',
  shortName: 'SceneFlow',
  badge: {
    src: '/brand/sf-badge.png',
    src2x: '/brand/sf-badge@2x.png',
    /** Landscape 1x display size (use @2x asset for retina) */
    width: 81,
    height: 44,
  },
  badgeApp: {
    width: 66,
    height: 36,
  },
  badgeCompact: {
    width: 73,
    height: 40,
  },
  lockup: {
    src: '/brand/sf-logo-lockup.png',
    width: 512,
    height: 512,
  },
  colors: {
    cyan: '#00F2FF',
    navy: '#050A18',
    purple: '#1A0B2E',
    gold: '#C9A227',
  },
  wordmark: {
    fontFamily: 'var(--font-montserrat), var(--font-inter), system-ui, sans-serif',
  },
} as const

export type BrandVariant = 'landing' | 'app' | 'compact'

export function getBadgeSize(variant: BrandVariant): { width: number; height: number } {
  switch (variant) {
    case 'landing':
      return { width: BRAND.badge.width, height: BRAND.badge.height }
    case 'app':
      return { width: BRAND.badgeApp.width, height: BRAND.badgeApp.height }
    case 'compact':
      return { width: BRAND.badgeCompact.width, height: BRAND.badgeCompact.height }
  }
}
