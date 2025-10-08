import type { NavItem } from './types'

export const episodeNav = (seriesId: string, episodeId: string): NavItem[] => ([
  { key: 'p1', label: 'Treatment', href: `/series/${seriesId}/episode/${episodeId}/phase/1`, phase: 1 },
  { key: 'p2', label: 'Visual Script', href: `/series/${seriesId}/episode/${episodeId}/phase/2`, phase: 2, requires: [1] },
  { key: 'p3', label: 'Audio (Timing Lock)', href: `/series/${seriesId}/episode/${episodeId}/phase/3`, phase: 3, requires: [2] },
  { key: 'p4', label: 'Video (I+T+V)', href: `/series/${seriesId}/episode/${episodeId}/phase/4`, phase: 4, requires: [3], byok: true },
  { key: 'p5', label: 'Assembly (NLE)', href: `/series/${seriesId}/episode/${episodeId}/phase/5`, phase: 5, requires: [4] },
])
