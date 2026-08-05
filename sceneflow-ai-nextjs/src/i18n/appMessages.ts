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

async function loadSurface(surface: AppSurface, locale: string): Promise<Messages> {
  try {
    return await SURFACE_LOADERS[surface](locale)
  } catch {
    // A locale that has not been translated for this surface yet simply falls
    // back to English rather than throwing inside a layout.
    return {}
  }
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

  const out: Messages = {}

  for (const surface of wanted) {
    const english = await loadSurface(surface, DEFAULT_LOCALE)
    const localized =
      resolved === DEFAULT_LOCALE ? english : await loadSurface(surface, resolved)

    out[surface] =
      resolved === DEFAULT_LOCALE
        ? english
        : mergeMessages(english as Record<string, unknown>, localized as Record<string, unknown>)
  }

  return out
}
