/**
 * App chrome is split into per-surface catalogs rather than one file.
 *
 * The landing catalog is already 141 KB in English and reaches 342 KB in Thai.
 * Folding app chrome into the same blob would ship the entire product's UI text
 * to someone reading the Dashboard, which is a real regression for a PWA. Each
 * route group loads only what it renders.
 */
export const APP_SURFACES = [
  'common',
  'dashboard',
  'settings',
  'series',
  'blueprint',
  'production',
] as const

export type AppSurface = (typeof APP_SURFACES)[number]

/** Loaded everywhere; keep it small. */
export const BASE_SURFACE: AppSurface = 'common'

/**
 * Route prefix -> surfaces, longest prefix first.
 *
 * Mirrors the layouts that already exist (`dashboard/`, `dashboard/studio/`,
 * `dashboard/workflow/`, `dashboard/settings/`), so a provider can be wired per
 * layout without inventing new route boundaries.
 */
const SURFACES_BY_PREFIX: Array<{ prefix: string; surfaces: AppSurface[] }> = [
  { prefix: '/dashboard/studio', surfaces: ['blueprint'] },
  { prefix: '/dashboard/workflow', surfaces: ['production'] },
  { prefix: '/dashboard/series', surfaces: ['series'] },
  { prefix: '/dashboard/settings', surfaces: ['settings'] },
  { prefix: '/dashboard/projects', surfaces: ['dashboard'] },
  { prefix: '/dashboard', surfaces: ['dashboard'] },
  { prefix: '/series', surfaces: ['series'] },
]

export function surfacesForPath(pathname: string): AppSurface[] {
  const match = SURFACES_BY_PREFIX.find((entry) => pathname.startsWith(entry.prefix))
  return [BASE_SURFACE, ...(match?.surfaces ?? [])]
}

export function isAppSurface(value: string): value is AppSurface {
  return (APP_SURFACES as readonly string[]).includes(value)
}
