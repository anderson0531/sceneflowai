import type { NavItem } from './types'

export const seriesNav = (seriesId: string): NavItem[] => ([
  { key: 'cont', label: 'Continuity Engine', href: `/series/${seriesId}/continuity` },
  { key: 'char', label: 'Characters', href: `/series/${seriesId}/continuity/characters` },
  { key: 'loc', label: 'Locations', href: `/series/${seriesId}/continuity/locations` },
  { key: 'aes', label: 'Aesthetic Blueprint', href: `/series/${seriesId}/continuity/aesthetics` },
  { key: 'rev', label: 'Review Updates', href: `/series/${seriesId}/continuity/review-updates`, phase: 6 },
])
