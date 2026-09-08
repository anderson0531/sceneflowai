import { DEFAULT_LOCALE, isLocale } from '@/i18n/locale'
import { buildProperNounGlossary } from '@/lib/prompts/localeDirective'

/**
 * Server-side resolution of the language AI content should be authored in.
 *
 * Server-authoritative on purpose: the studios send `storyLocale` in their
 * request context, but a route that trusted only that would silently fall back
 * to English whenever a caller forgot to pass it, which is exactly the failure
 * mode that makes localization look flaky. Resolution order:
 *
 *   explicit request value -> project override -> series override
 *     -> account story language -> English
 *
 * Interface language (`preferred_locale` / `sf-locale`) is not consulted.
 * A leftover Español chrome setting must not author story text.
 */
export interface ResolveStoryLocaleOptions {
  /** Value supplied by the caller, if any. */
  explicit?: string | null
  projectId?: string | null
  seriesId?: string | null
  /** Session user id or email. */
  userIdOrEmail?: string | null
  /** Skip the proper-noun lookup when the caller does not need it. */
  includeProperNouns?: boolean
}

export interface ResolvedStoryLocale {
  storyLocale: string
  properNouns: string[]
  /** Where the value came from, for logging. */
  source: 'explicit' | 'project' | 'series' | 'account' | 'cookie' | 'default'
}

export async function resolveStoryLocale(
  options: ResolveStoryLocaleOptions
): Promise<ResolvedStoryLocale> {
  const { explicit, projectId, seriesId, userIdOrEmail, includeProperNouns = true } = options

  let storyLocale: string | undefined
  let source: ResolvedStoryLocale['source'] = 'default'
  let properNouns: string[] = []
  let resolvedSeriesId = seriesId ?? undefined

  if (isLocale(explicit)) {
    storyLocale = explicit
    source = 'explicit'
  }

  if (projectId && !projectId.startsWith('new-project')) {
    try {
      const { default: Project } = await import('@/models/Project')
      const project = await Project.findByPk(projectId)
      if (project) {
        const projectLocale = (project.metadata as any)?.i18n?.sourceLocale
        if (!storyLocale && isLocale(projectLocale)) {
          storyLocale = projectLocale
          source = 'project'
        }
        resolvedSeriesId = resolvedSeriesId ?? project.series_id ?? undefined
      }
    } catch (error) {
      console.warn('[storyLocale] project lookup failed:', (error as Error)?.message)
    }
  }

  if (resolvedSeriesId && (!storyLocale || includeProperNouns)) {
    try {
      const { default: Series } = await import('@/models/Series')
      const series = await Series.findByPk(resolvedSeriesId)
      if (series) {
        const seriesLocale = (series.metadata as any)?.i18n?.sourceLocale
        if (!storyLocale && isLocale(seriesLocale)) {
          storyLocale = seriesLocale
          source = 'series'
        }
        if (includeProperNouns) {
          const bible = series.production_bible as any
          properNouns = buildProperNounGlossary(
            {
              characters: bible?.characters,
              locations: bible?.locations,
              props: bible?.props,
            },
            [series.title]
          )
        }
      }
    } catch (error) {
      console.warn('[storyLocale] series lookup failed:', (error as Error)?.message)
    }
  }

  if (!storyLocale && userIdOrEmail) {
    try {
      const { resolveUser } = await import('@/lib/userHelper')
      const user = await resolveUser(userIdOrEmail)
      const accountLocale = user.story_locale
      if (isLocale(accountLocale)) {
        storyLocale = accountLocale
        source = 'account'
      }
    } catch (error) {
      console.warn('[storyLocale] account lookup failed:', (error as Error)?.message)
    }
  }

  return {
    storyLocale: storyLocale ?? DEFAULT_LOCALE,
    properNouns,
    source: storyLocale ? source : 'default',
  }
}

/**
 * Language to author *revisions* of an existing blueprint in.
 *
 * Account `story_locale` and the UI cookie are ignored: those are how leftover
 * Español leaked into stored treatmentVariants and AR analysis. A project
 * whose content was stamped (generation or a prior revise) keeps that
 * language; everything else is English until the creator asks otherwise.
 */
export async function resolveExistingContentStoryLocale(
  options: ResolveStoryLocaleOptions
): Promise<ResolvedStoryLocale> {
  const { explicit, projectId, includeProperNouns = true } = options

  if (isLocale(explicit)) {
    const properNouns = includeProperNouns
      ? (await resolveStoryLocale({ ...options, explicit: undefined })).properNouns
      : []
    return { storyLocale: explicit, properNouns, source: 'explicit' }
  }

  if (projectId && !projectId.startsWith('new-project')) {
    try {
      const { default: Project } = await import('@/models/Project')
      const { readContentEntityI18n } = await import('@/i18n/content/entityI18n')
      const project = await Project.findByPk(projectId)
      if (project) {
        const content = readContentEntityI18n(project)
        const properNouns = includeProperNouns
          ? (await resolveStoryLocale({ ...options, explicit: undefined })).properNouns
          : []
        if (content.contentStamped && isLocale(content.sourceLocale)) {
          return { storyLocale: content.sourceLocale, properNouns, source: 'project' }
        }
        return { storyLocale: DEFAULT_LOCALE, properNouns, source: 'default' }
      }
    } catch (error) {
      console.warn('[storyLocale] content locale lookup failed:', (error as Error)?.message)
    }
  }

  return { storyLocale: DEFAULT_LOCALE, properNouns: [], source: 'default' }
}
