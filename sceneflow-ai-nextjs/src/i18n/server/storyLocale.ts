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
 *     -> account default -> English
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
  source: 'explicit' | 'project' | 'series' | 'account' | 'default'
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
      const accountLocale = user.story_locale ?? user.preferred_locale
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
