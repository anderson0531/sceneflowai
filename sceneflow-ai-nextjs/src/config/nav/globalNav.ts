export type GlobalNavItem = { key: string; label: string; href: string }

export const mainNav: GlobalNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'projects', label: 'Projects', href: '/dashboard/projects' },
  { key: 'series', label: 'Series', href: '/dashboard/series' },
  { key: 'start', label: 'Start Project', href: '/dashboard/studio/new-project' },
]

/**
 * Product Navigation - 4 Standalone Products
 * 
 * SceneFlow unbundles into four standalone products:
 * - Writer's Room: Script & Story development (Blueprint Phase)
 * - Visualizer: Storyboards & Scene generation (Production Phase)
 * - Smart Editor: Video editing & export (Final Cut)
 * - Screening Room: Analytics & Review (Premiere)
 */
export const productNav: GlobalNavItem[] = [
  { key: 'writers-room', label: "Writer's Room", href: '/dashboard/studio/new-project' },
  { key: 'visualizer', label: 'Visualizer', href: '/dashboard/workflow/storyboard' },
  { key: 'smart-editor', label: 'Smart Editor', href: '/dashboard/workflow/final-cut' },
  { key: 'screening-room', label: 'Screening Room', href: '/dashboard/workflow/premiere' },
]

export const settingsNav: GlobalNavItem[] = [
  { key: 'profile', label: 'Profile', href: '/dashboard/settings/profile' },
  { key: 'byok', label: 'BYOK Settings', href: '/dashboard/settings/byok' },
  { key: 'billing', label: 'Billing & Credits', href: '/dashboard/settings/billing' },
]
