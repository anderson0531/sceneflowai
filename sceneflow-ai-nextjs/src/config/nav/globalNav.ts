export type GlobalNavItem = { key: string; label: string; href: string }

export const mainNav: GlobalNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'projects', label: 'Projects', href: '/dashboard/projects' },
  { key: 'series', label: 'Series', href: '/dashboard/series' },
  { key: 'start', label: 'Start Project', href: '/dashboard/studio/new-project' },
]

/**
 * Product Navigation — Blueprint + Production + Screening Room
 */
export const productNav: GlobalNavItem[] = [
  { key: 'writers-room', label: "Writer's Room", href: '/dashboard/studio/new-project' },
  { key: 'visualizer', label: 'Visualizer', href: '/dashboard/workflow/pre-vis' },
  { key: 'screening-room', label: 'Screening Room', href: '/dashboard/workflow/screening-room' },
]

export const settingsNav: GlobalNavItem[] = [
  { key: 'profile', label: 'Profile', href: '/dashboard/settings/profile' },
  { key: 'byok', label: 'BYOK Settings', href: '/dashboard/settings/byok' },
  { key: 'billing', label: 'Billing & Credits', href: '/dashboard/settings/billing' },
]
