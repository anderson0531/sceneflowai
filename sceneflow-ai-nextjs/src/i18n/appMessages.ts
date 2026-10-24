import { mergeMessages } from './mergeMessages'
import { DEFAULT_LOCALE, isLocale } from './locale'
import { APP_SURFACES, BASE_SURFACE, type AppSurface } from './appSurfaces'

type Messages = Record<string, unknown>

/**
 * Static import map for app catalogs.
 *
 * `import()` with a fully dynamic specifier would make the bundler include
 * every locale of every surface in the client bundle. Enumerating the surfaces
 * and letting only the locale segment be dynamic keeps each locale in its own
 * chunk, so a reader of the Dashboard never downloads the Production catalog.
 */
const SURFACE_LOADERS: Record<AppSurface, (locale: string) => Promise<Messages>> = {
  common: (locale) => import(`../../messages/app/${locale}/common.json`).then(pick),
  dashboard: (locale) => import(`../../messages/app/${locale}/dashboard.json`).then(pick),
  settings: (locale) => import(`../../messages/app/${locale}/settings.json`).then(pick),
  series: (locale) => import(`../../messages/app/${locale}/series.json`).then(pick),
  blueprint: (locale) => import(`../../messages/app/${locale}/blueprint.json`).then(pick),
  production: (locale) => import(`../../messages/app/${locale}/production.json`).then(pick),
}

function pick(module: { default: Messages }): Messages {
  return module.default
}

const mergedSurfaceCache = new Map<string, Promise<Messages>>()

async function loadSurface(surface: AppSurface, locale: string): Promise<Messages> {
  try {
    return await SURFACE_LOADERS[surface](locale)
  } catch {
    // A locale that has not been translated for this surface yet simply falls
    // back to English rather than throwing inside a layout.
    return {}
  }
}

function loadMergedSurface(surface: AppSurface, resolvedLocale: string): Promise<Messages> {
  const key = `${resolvedLocale}:${surface}`
  const existing = mergedSurfaceCache.get(key)
  if (existing) return existing

  const promise = (async () => {
    if (resolvedLocale === DEFAULT_LOCALE) {
      return await loadSurface(surface, DEFAULT_LOCALE)
    }
    const [english, localized] = await Promise.all([
      loadSurface(surface, DEFAULT_LOCALE),
      loadSurface(surface, resolvedLocale),
    ])
    return mergeMessages(
      english as Record<string, unknown>,
      localized as Record<string, unknown>
    )
  })()

  mergedSurfaceCache.set(key, promise)
  return promise
}

/**
 * Load the app chrome catalog for a locale, namespaced by surface.
 *
 * Locale files are merged over the English base, so a partially translated
 * catalog degrades key by key to English instead of rendering raw message ids.
 */
export async function getAppMessages(
  locale: string,
  surfaces: readonly AppSurface[] = APP_SURFACES
): Promise<Messages> {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE
  const wanted = [...new Set<AppSurface>([BASE_SURFACE, ...surfaces])]

  const entries = await Promise.all(
    wanted.map(async (surface) => [surface, await loadMergedSurface(surface, resolved)] as const)
  )

  return Object.fromEntries(entries)
}
