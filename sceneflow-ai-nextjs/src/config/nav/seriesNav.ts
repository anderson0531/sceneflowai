import type { NavItem } from './types'

/** @deprecated Use Series Room tabs at /dashboard/series/[id] instead. Kept for sidebar deep-links with redirects. */
export const seriesNav = (seriesId: string): NavItem[] => [
  {
    key: 'studio',
    label: 'Series Room',
    href: `/dashboard/series/${seriesId}`,
  },
  {
    key: 'cont',
    label: 'Continuity',
    href: `/dashboard/series/${seriesId}?tab=continuity`,
  },
  {
    key: 'ref',
    label: 'Reference Library',
    href: `/dashboard/series/${seriesId}?tab=reference-library`,
  },
  {
    key: 'eps',
    label: 'Episodes',
    href: `/dashboard/series/${seriesId}?tab=episodes`,
  },
]
