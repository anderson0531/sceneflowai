/**
 * Which localization mechanism applies to each route.
 *
 * Google Translate rewrites DOM text nodes underneath React. On a read-mostly
 * page that is harmless, and it already works that way on Blueprint share pages.
 * Inside the studios it is not: `vision/[projectId]/page.tsx` re-renders
 * constantly, and a widget mutating text nodes between React's render and commit
 * produces `removeChild` reconciliation crashes and mangles values inside
 * inputs. So the studios never get the widget — they get message catalogs.
 *
 * This map is what closes the gap during migration: a surface whose chrome has
 * not been extracted yet is marked `gt`, so a non-English reader still gets a
 * fully readable page, and the entry flips to `catalog` as extraction lands.
 */
export type LocalizationMode =
  /** Message catalogs. Google Translate is never offered. */
  | 'catalog'
  /** Opt-in Google Translate. Read-mostly surfaces only. */
  | 'gt'
  /** Neither: nothing worth translating, or translation would be harmful. */
  | 'none'

interface SurfaceRule {
  prefix: string
  mode: LocalizationMode
  /** Why, so the next person does not "fix" it. */
  reason: string
}

/** Longest prefix wins. */
const SURFACE_RULES: SurfaceRule[] = [
  // ── Catalog: extracted, or interactive enough that the widget is unsafe ──
  {
    prefix: '/dashboard/settings',
    mode: 'catalog',
    reason: 'Chrome extracted; forms would be corrupted by DOM rewriting.',
  },
  {
    prefix: '/dashboard/studio',
    mode: 'catalog',
    reason: 'Highly interactive editor. DOM rewriting breaks React reconciliation.',
  },
  {
    prefix: '/dashboard/workflow',
    mode: 'catalog',
    reason: 'Production Studio re-renders constantly; the widget crashes it.',
  },
  {
    prefix: '/dashboard/series',
    mode: 'catalog',
    reason: 'Editable continuity data; DOM rewriting would corrupt inputs.',
  },
  {
    prefix: '/dashboard/projects',
    mode: 'catalog',
    reason: 'Chrome extraction in progress; list is interactive.',
  },
  {
    prefix: '/dashboard/help',
    mode: 'gt',
    reason: 'Read-only documentation. Full coverage matters more than fidelity.',
  },
  {
    prefix: '/dashboard',
    mode: 'catalog',
    reason: 'Dashboard home is interactive.',
  },

  // ── GT: read-mostly, and often reached by people without an account ──
  {
    prefix: '/share',
    mode: 'gt',
    reason: 'Reviewers arrive from a link in any language; already uses the widget.',
  },
  { prefix: '/blueprint/share', mode: 'gt', reason: 'Existing share-review surface.' },
  { prefix: '/embed', mode: 'gt', reason: 'Read-only embed.' },
  { prefix: '/collaborate', mode: 'gt', reason: 'External reviewers, read-mostly.' },
  { prefix: '/screening-room', mode: 'gt', reason: 'Playback surface, read-only.' },
  { prefix: '/contact', mode: 'gt', reason: 'Static page.' },
  { prefix: '/privacy', mode: 'gt', reason: 'Legal text, read-only.' },
  { prefix: '/terms', mode: 'gt', reason: 'Legal text, read-only.' },
  { prefix: '/trust-safety', mode: 'gt', reason: 'Legal text, read-only.' },
  { prefix: '/legal', mode: 'gt', reason: 'Legal text, read-only.' },
  { prefix: '/product-description', mode: 'gt', reason: 'Marketing copy, read-only.' },

  // ── None ──
  {
    prefix: '/admin',
    mode: 'none',
    reason: 'Internal tooling; mistranslated operational labels are dangerous.',
  },
  {
    prefix: '/api',
    mode: 'none',
    reason: 'Not a page.',
  },
  {
    prefix: '/setup-database',
    mode: 'none',
    reason: 'Internal tooling.',
  },
]

export function localizationModeForPath(pathname: string): LocalizationMode {
  const match = SURFACE_RULES.filter((rule) => pathname.startsWith(rule.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length
  )[0]
  // The landing page and its locale routes use next-intl catalogs.
  return match?.mode ?? 'catalog'
}

export function localizationReasonForPath(pathname: string): string | undefined {
  return SURFACE_RULES.filter((rule) => pathname.startsWith(rule.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length
  )[0]?.reason
}

export function allowsGoogleTranslate(pathname: string): boolean {
  return localizationModeForPath(pathname) === 'gt'
}
