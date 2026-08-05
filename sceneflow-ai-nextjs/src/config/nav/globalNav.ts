import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'

export type GlobalNavItem = {
  key: string
  label: string
  /** Catalog key under `common.nav`; required for the sidebar to localize. */
  labelKey: string
  href: string
}

export const mainNav: GlobalNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', labelKey: 'dashboard', href: '/dashboard' },
  { key: 'projects', label: 'Projects', labelKey: 'projects', href: '/dashboard/projects' },
  { key: 'series', label: STUDIO_DISPLAY_NAMES.series, labelKey: 'series', href: '/dashboard/series' },
  { key: 'start', label: 'Start Project', labelKey: 'startProject', href: '/dashboard/studio/new-project' },
]

/**
 * Product Navigation — Blueprint Studio + Production Studio + Screening Room
 */
export const productNav: GlobalNavItem[] = [
  {
    key: 'blueprint',
    label: STUDIO_DISPLAY_NAMES.blueprint,
    labelKey: 'blueprint',
    href: '/dashboard/studio/new-project',
  },
  { key: 'visualizer', label: 'Visualizer', labelKey: 'visualizer', href: '/dashboard/workflow/pre-vis' },
  {
    key: 'screening-room',
    label: 'Screening Room',
    labelKey: 'screeningRoom',
    href: '/dashboard/workflow/screening-room',
  },
]

export const settingsNav: GlobalNavItem[] = [
  { key: 'profile', label: 'Profile', labelKey: 'profile', href: '/dashboard/settings/profile' },
  { key: 'byok', label: 'BYOK Settings', labelKey: 'byokSettings', href: '/dashboard/settings/byok' },
  {
    key: 'billing',
    label: 'Billing & Credits',
    labelKey: 'billingCredits',
    href: '/dashboard/settings/billing',
  },
]
