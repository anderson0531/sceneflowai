export type GlobalNavItem = { key: string; label: string; href: string }

export const mainNav: GlobalNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'projects', label: 'Projects', href: '/dashboard/projects' },
  { key: 'start', label: 'Start Project', href: '/dashboard/studio/new-project' },
]

export const settingsNav: GlobalNavItem[] = [
  { key: 'profile', label: 'Profile', href: '/dashboard' },
  { key: 'byok', label: 'BYOK Settings', href: '/dashboard' },
  { key: 'billing', label: 'Billing & Credits', href: '/dashboard' },
]
