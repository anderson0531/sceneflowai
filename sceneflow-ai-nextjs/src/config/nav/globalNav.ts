import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

export type GlobalNavItem = { key: string; label: string; href: string }

export const mainNav: GlobalNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'projects', label: 'Projects', href: '/dashboard/projects' },
  { key: 'series', label: STUDIO_DISPLAY_NAMES.series, href: '/dashboard/series' },
  { key: 'start', label: 'Start Project', href: '/dashboard/studio/new-project' },
]

/**
 * Product Navigation — Blueprint Studio + Production Studio + Screening Room
 */
export const productNav: GlobalNavItem[] = [
  { key: 'blueprint', label: STUDIO_DISPLAY_NAMES.blueprint, href: '/dashboard/studio/new-project' },
  { key: 'visualizer', label: 'Visualizer', href: '/dashboard/workflow/pre-vis' },
  { key: 'screening-room', label: 'Screening Room', href: '/dashboard/workflow/screening-room' },
]

export const settingsNav: GlobalNavItem[] = [
  { key: 'profile', label: 'Profile', href: '/dashboard/settings/profile' },
  { key: 'byok', label: 'BYOK Settings', href: '/dashboard/settings/byok' },
  { key: 'billing', label: 'Billing & Credits', href: '/dashboard/settings/billing' },
]
