/**
 * Listen-only pipeline walks for Production Examples.
 * Each production has placeholder share tokens so visitors can walk
 * Blueprint → Audience Resonance → Screening Room before the real
 * listen-only links are published. Tokens that start with `example-`
 * render a prepared stage instead of fetching a project.
 *
 * The cinematic drama trailer is the confirmed picture-only cut.
 * Do not point trailerSrc at the short Cinematic Drama promos.
 * The Watch button stays hidden until Screening Room Final is the real master.
 */

export const FLAGSHIP_PRODUCTION_ID = 'drama' as const

export const CINEMATIC_DRAMA_SOURCE_BLOB_URL =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/English-Video-v11.mp4'

export const CINEMATIC_DRAMA_TRAILER_VERSION = '20261110'

/** Same-path public files. The query busts previously cached trailers. */
export const CINEMATIC_DRAMA_TRAILER_WEBM = `/videos/cinematic-drama-trailer.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`
export const CINEMATIC_DRAMA_TRAILER_MP4 = `/videos/cinematic-drama-trailer.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`

export const TRAILER_DUB_LOCALE_IDS = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export type TrailerDubLocaleId = (typeof TRAILER_DUB_LOCALE_IDS)[number]

export function resolveTrailerDubLocale(locale?: string): TrailerDubLocaleId {
  const cleaned = (locale ?? 'en').trim().toLowerCase()
  if (cleaned.startsWith('zh')) return 'zh'
  const base = cleaned.split(/[-_]/)[0] ?? 'en'
  if ((TRAILER_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as TrailerDubLocaleId
  }
  return 'en'
}

export const CINEMATIC_DRAMA_DUB_LOCALE_IDS = TRAILER_DUB_LOCALE_IDS

export type CinematicDramaDubLocaleId = (typeof CINEMATIC_DRAMA_DUB_LOCALE_IDS)[number]

export const CINEMATIC_DRAMA_SOURCE_BLOB_URLS: Record<CinematicDramaDubLocaleId, string> = {
  en: CINEMATIC_DRAMA_SOURCE_BLOB_URL,
  es: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Spanish-Video-v1.mp4',
  pt: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Portuguese-Video-v1.mp4',
  hi: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Hindi-Video-v1.mp4',
  zh: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Chinese-Mandarin-Video-v1.mp4',
  ar: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Arabic-Video-v2.mp4',
  th: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Thai-Video-v2.mp4',
}

export const CINEMATIC_DRAMA_DUB_TRAILERS: Record<
  CinematicDramaDubLocaleId,
  { webmSrc: string; mp4Src: string }
> = {
  en: {
    webmSrc: CINEMATIC_DRAMA_TRAILER_WEBM,
    mp4Src: CINEMATIC_DRAMA_TRAILER_MP4,
  },
  es: {
    webmSrc: `/videos/cinematic-drama-trailer-es.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
    mp4Src: `/videos/cinematic-drama-trailer-es.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
  },
  pt: {
    webmSrc: `/videos/cinematic-drama-trailer-pt.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
    mp4Src: `/videos/cinematic-drama-trailer-pt.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
  },
  hi: {
    webmSrc: `/videos/cinematic-drama-trailer-hi.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
    mp4Src: `/videos/cinematic-drama-trailer-hi.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
  },
  zh: {
    webmSrc: `/videos/cinematic-drama-trailer-zh.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
    mp4Src: `/videos/cinematic-drama-trailer-zh.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
  },
  ar: {
    webmSrc: `/videos/cinematic-drama-trailer-ar.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
    mp4Src: `/videos/cinematic-drama-trailer-ar.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
  },
  th: {
    webmSrc: `/videos/cinematic-drama-trailer-th.webm?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
    mp4Src: `/videos/cinematic-drama-trailer-th.mp4?v=${CINEMATIC_DRAMA_TRAILER_VERSION}`,
  },
}

export function resolveCinematicDramaDubLocale(locale?: string): CinematicDramaDubLocaleId {
  const base = (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] ?? 'en'
  if ((CINEMATIC_DRAMA_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as CinematicDramaDubLocaleId
  }
  return 'en'
}

export function getCinematicDramaTrailerSources(locale?: string): {
  webmSrc: string
  mp4Src: string
} {
  const resolved = resolveCinematicDramaDubLocale(locale)
  return CINEMATIC_DRAMA_DUB_TRAILERS[resolved]
}

export const ANIMATED_SERIES_TRAILER_VERSION = '20261101'

export const ANIMATED_SERIES_TRAILER_WEBM = `/videos/animated-series-trailer.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`
export const ANIMATED_SERIES_TRAILER_MP4 = `/videos/animated-series-trailer.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`

export const ANIMATED_SERIES_DUB_LOCALE_IDS = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export type AnimatedSeriesDubLocaleId = (typeof ANIMATED_SERIES_DUB_LOCALE_IDS)[number]

export const ANIMATED_SERIES_DUB_TRAILERS: Record<
  AnimatedSeriesDubLocaleId,
  { webmSrc: string; mp4Src: string }
> = {
  en: {
    webmSrc: ANIMATED_SERIES_TRAILER_WEBM,
    mp4Src: ANIMATED_SERIES_TRAILER_MP4,
  },
  es: {
    webmSrc: `/videos/animated-series-trailer-es.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/animated-series-trailer-es.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
  },
  pt: {
    webmSrc: `/videos/animated-series-trailer-pt.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/animated-series-trailer-pt.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
  },
  hi: {
    webmSrc: `/videos/animated-series-trailer-hi.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/animated-series-trailer-hi.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
  },
  zh: {
    webmSrc: `/videos/animated-series-trailer-zh.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/animated-series-trailer-zh.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
  },
  ar: {
    webmSrc: `/videos/animated-series-trailer-ar.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/animated-series-trailer-ar.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
  },
  th: {
    webmSrc: `/videos/animated-series-trailer-th.webm?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/animated-series-trailer-th.mp4?v=${ANIMATED_SERIES_TRAILER_VERSION}`,
  },
}

export function resolveAnimatedSeriesDubLocale(locale?: string): AnimatedSeriesDubLocaleId {
  const base = (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] ?? 'en'
  if ((ANIMATED_SERIES_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as AnimatedSeriesDubLocaleId
  }
  return 'en'
}

export function getAnimatedSeriesTrailerSources(locale?: string): {
  webmSrc: string
  mp4Src: string
} {
  const resolved = resolveAnimatedSeriesDubLocale(locale)
  return ANIMATED_SERIES_DUB_TRAILERS[resolved]
}

export const DOCUMENTARY_TRAILER_VERSION = '20261101'

export const DOCUMENTARY_TRAILER_WEBM = `/videos/documentary-trailer.webm?v=${DOCUMENTARY_TRAILER_VERSION}`
export const DOCUMENTARY_TRAILER_MP4 = `/videos/documentary-trailer.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`

export const DOCUMENTARY_DUB_LOCALE_IDS = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export type DocumentaryDubLocaleId = (typeof DOCUMENTARY_DUB_LOCALE_IDS)[number]

export const DOCUMENTARY_DUB_TRAILERS: Record<
  DocumentaryDubLocaleId,
  { webmSrc: string; mp4Src: string }
> = {
  en: {
    webmSrc: DOCUMENTARY_TRAILER_WEBM,
    mp4Src: DOCUMENTARY_TRAILER_MP4,
  },
  es: {
    webmSrc: `/videos/documentary-trailer-es.webm?v=${DOCUMENTARY_TRAILER_VERSION}`,
    mp4Src: `/videos/documentary-trailer-es.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`,
  },
  pt: {
    webmSrc: `/videos/documentary-trailer-pt.webm?v=${DOCUMENTARY_TRAILER_VERSION}`,
    mp4Src: `/videos/documentary-trailer-pt.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`,
  },
  hi: {
    webmSrc: `/videos/documentary-trailer-hi.webm?v=${DOCUMENTARY_TRAILER_VERSION}`,
    mp4Src: `/videos/documentary-trailer-hi.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`,
  },
  zh: {
    webmSrc: `/videos/documentary-trailer-zh.webm?v=${DOCUMENTARY_TRAILER_VERSION}`,
    mp4Src: `/videos/documentary-trailer-zh.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`,
  },
  ar: {
    webmSrc: `/videos/documentary-trailer-ar.webm?v=${DOCUMENTARY_TRAILER_VERSION}`,
    mp4Src: `/videos/documentary-trailer-ar.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`,
  },
  th: {
    webmSrc: `/videos/documentary-trailer-th.webm?v=${DOCUMENTARY_TRAILER_VERSION}`,
    mp4Src: `/videos/documentary-trailer-th.mp4?v=${DOCUMENTARY_TRAILER_VERSION}`,
  },
}

export function resolveDocumentaryDubLocale(locale?: string): DocumentaryDubLocaleId {
  const base = (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] ?? 'en'
  if ((DOCUMENTARY_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as DocumentaryDubLocaleId
  }
  return 'en'
}

export function getDocumentaryTrailerSources(locale?: string): {
  webmSrc: string
  mp4Src: string
} {
  const resolved = resolveDocumentaryDubLocale(locale)
  return DOCUMENTARY_DUB_TRAILERS[resolved]
}

export const TRAINING_SERIES_TRAILER_VERSION = '20261101'

export const TRAINING_SERIES_TRAILER_WEBM = `/videos/training-series-trailer.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`
export const TRAINING_SERIES_TRAILER_MP4 = `/videos/training-series-trailer.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`

export const TRAINING_SERIES_DUB_LOCALE_IDS = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export type TrainingSeriesDubLocaleId = (typeof TRAINING_SERIES_DUB_LOCALE_IDS)[number]

export const TRAINING_SERIES_DUB_TRAILERS: Record<
  TrainingSeriesDubLocaleId,
  { webmSrc: string; mp4Src: string }
> = {
  en: {
    webmSrc: TRAINING_SERIES_TRAILER_WEBM,
    mp4Src: TRAINING_SERIES_TRAILER_MP4,
  },
  es: {
    webmSrc: `/videos/training-series-trailer-es.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/training-series-trailer-es.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`,
  },
  pt: {
    webmSrc: `/videos/training-series-trailer-pt.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/training-series-trailer-pt.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`,
  },
  hi: {
    webmSrc: `/videos/training-series-trailer-hi.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/training-series-trailer-hi.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`,
  },
  zh: {
    webmSrc: `/videos/training-series-trailer-zh.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/training-series-trailer-zh.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`,
  },
  ar: {
    webmSrc: `/videos/training-series-trailer-ar.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/training-series-trailer-ar.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`,
  },
  th: {
    webmSrc: `/videos/training-series-trailer-th.webm?v=${TRAINING_SERIES_TRAILER_VERSION}`,
    mp4Src: `/videos/training-series-trailer-th.mp4?v=${TRAINING_SERIES_TRAILER_VERSION}`,
  },
}

export function resolveTrainingSeriesDubLocale(locale?: string): TrainingSeriesDubLocaleId {
  const base = (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] ?? 'en'
  if ((TRAINING_SERIES_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as TrainingSeriesDubLocaleId
  }
  return 'en'
}

export function getTrainingSeriesTrailerSources(locale?: string): {
  webmSrc: string
  mp4Src: string
} {
  const resolved = resolveTrainingSeriesDubLocale(locale)
  return TRAINING_SERIES_DUB_TRAILERS[resolved]
}

export const CREATOR_PODCAST_TRAILER_VERSION = '20261102'

export const CREATOR_PODCAST_TRAILER_WEBM = `/videos/creator-podcast-trailer.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`
export const CREATOR_PODCAST_TRAILER_MP4 = `/videos/creator-podcast-trailer.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`

export const CREATOR_PODCAST_DUB_LOCALE_IDS = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export type CreatorPodcastDubLocaleId = (typeof CREATOR_PODCAST_DUB_LOCALE_IDS)[number]

export const CREATOR_PODCAST_DUB_TRAILERS: Record<
  CreatorPodcastDubLocaleId,
  { webmSrc: string; mp4Src: string }
> = {
  en: {
    webmSrc: CREATOR_PODCAST_TRAILER_WEBM,
    mp4Src: CREATOR_PODCAST_TRAILER_MP4,
  },
  es: {
    webmSrc: `/videos/creator-podcast-trailer-es.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
    mp4Src: `/videos/creator-podcast-trailer-es.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
  },
  pt: {
    webmSrc: `/videos/creator-podcast-trailer-pt.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
    mp4Src: `/videos/creator-podcast-trailer-pt.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
  },
  hi: {
    webmSrc: `/videos/creator-podcast-trailer-hi.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
    mp4Src: `/videos/creator-podcast-trailer-hi.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
  },
  zh: {
    webmSrc: `/videos/creator-podcast-trailer-zh.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
    mp4Src: `/videos/creator-podcast-trailer-zh.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
  },
  ar: {
    webmSrc: `/videos/creator-podcast-trailer-ar.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
    mp4Src: `/videos/creator-podcast-trailer-ar.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
  },
  th: {
    webmSrc: `/videos/creator-podcast-trailer-th.webm?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
    mp4Src: `/videos/creator-podcast-trailer-th.mp4?v=${CREATOR_PODCAST_TRAILER_VERSION}`,
  },
}

export function resolveCreatorPodcastDubLocale(locale?: string): CreatorPodcastDubLocaleId {
  const base = (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] ?? 'en'
  if ((CREATOR_PODCAST_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as CreatorPodcastDubLocaleId
  }
  return 'en'
}

export function getCreatorPodcastTrailerSources(locale?: string): {
  webmSrc: string
  mp4Src: string
} {
  const resolved = resolveCreatorPodcastDubLocale(locale)
  return CREATOR_PODCAST_DUB_TRAILERS[resolved]
}

export const VIDEO_MEMOIR_TRAILER_VERSION = '20261102'

export const VIDEO_MEMOIR_TRAILER_WEBM = `/videos/video-memoir-trailer.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`
export const VIDEO_MEMOIR_TRAILER_MP4 = `/videos/video-memoir-trailer.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`

export const VIDEO_MEMOIR_DUB_LOCALE_IDS = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export type VideoMemoirDubLocaleId = (typeof VIDEO_MEMOIR_DUB_LOCALE_IDS)[number]

export const VIDEO_MEMOIR_DUB_TRAILERS: Record<
  VideoMemoirDubLocaleId,
  { webmSrc: string; mp4Src: string }
> = {
  en: {
    webmSrc: VIDEO_MEMOIR_TRAILER_WEBM,
    mp4Src: VIDEO_MEMOIR_TRAILER_MP4,
  },
  es: {
    webmSrc: `/videos/video-memoir-trailer-es.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
    mp4Src: `/videos/video-memoir-trailer-es.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
  },
  pt: {
    webmSrc: `/videos/video-memoir-trailer-pt.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
    mp4Src: `/videos/video-memoir-trailer-pt.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
  },
  hi: {
    webmSrc: `/videos/video-memoir-trailer-hi.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
    mp4Src: `/videos/video-memoir-trailer-hi.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
  },
  zh: {
    webmSrc: `/videos/video-memoir-trailer-zh.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
    mp4Src: `/videos/video-memoir-trailer-zh.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
  },
  ar: {
    webmSrc: `/videos/video-memoir-trailer-ar.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
    mp4Src: `/videos/video-memoir-trailer-ar.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
  },
  th: {
    webmSrc: `/videos/video-memoir-trailer-th.webm?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
    mp4Src: `/videos/video-memoir-trailer-th.mp4?v=${VIDEO_MEMOIR_TRAILER_VERSION}`,
  },
}

export function resolveVideoMemoirDubLocale(locale?: string): VideoMemoirDubLocaleId {
  const base = (locale ?? 'en').trim().toLowerCase().split(/[-_]/)[0] ?? 'en'
  if ((VIDEO_MEMOIR_DUB_LOCALE_IDS as readonly string[]).includes(base)) {
    return base as VideoMemoirDubLocaleId
  }
  return 'en'
}

export function getVideoMemoirTrailerSources(locale?: string): {
  webmSrc: string
  mp4Src: string
} {
  const resolved = resolveVideoMemoirDubLocale(locale)
  return VIDEO_MEMOIR_DUB_TRAILERS[resolved]
}

export const PRODUCTION_WALK_IDS = [
  'drama',
  'animation',
  'documentary',
  'training',
  'podcast',
  'memoir',
] as const

export type ProductionWalkId = (typeof PRODUCTION_WALK_IDS)[number]

export const PRODUCTION_TRAILER_POSTERS: Record<ProductionWalkId, string> = {
  drama: '/images/trailers/cinematic-drama-poster.webp',
  animation: '/images/trailers/animated-series-poster.webp',
  documentary: '/images/trailers/documentary-poster.webp',
  training: '/images/trailers/training-series-poster.webp',
  podcast: '/images/trailers/creator-podcast-poster.webp',
  memoir: '/images/trailers/video-memoir-poster.webp',
}

export function getProductionTrailerPoster(walkId: ProductionWalkId): string {
  return PRODUCTION_TRAILER_POSTERS[walkId]
}

export function getProductionTrailerSources(
  walkId: ProductionWalkId,
  locale?: string
): {
  webmSrc: string
  mp4Src: string
  posterSrc: string
} {
  const posterSrc = PRODUCTION_TRAILER_POSTERS[walkId]
  switch (walkId) {
    case 'drama':
      return { ...getCinematicDramaTrailerSources(locale), posterSrc }
    case 'animation':
      return { ...getAnimatedSeriesTrailerSources(locale), posterSrc }
    case 'documentary':
      return { ...getDocumentaryTrailerSources(locale), posterSrc }
    case 'training':
      return { ...getTrainingSeriesTrailerSources(locale), posterSrc }
    case 'podcast':
      return { ...getCreatorPodcastTrailerSources(locale), posterSrc }
    case 'memoir':
      return { ...getVideoMemoirTrailerSources(locale), posterSrc }
  }
}

export const PRODUCTION_WALK_LABELS: Record<ProductionWalkId, string> = {
  drama: 'Feature-Length Cinematic Drama',
  animation: 'Full-Season Animated Series',
  documentary: 'Long-Form Documentary',
  training: 'Multi-Module Training Series',
  podcast: 'Creator Channels & Video Podcasts',
  memoir: 'Video Memoirs & Client Studios',
}

export type ScreeningCut = 'previs' | 'rough' | 'scenes' | 'trailer' | 'final'

export const SCREENING_CUTS: ScreeningCut[] = ['previs', 'rough', 'scenes', 'trailer', 'final']

export const SCREENING_CUT_LABELS: Record<ScreeningCut, string> = {
  previs: 'Pre-Vis',
  rough: 'Rough Cut',
  scenes: 'Scenes',
  trailer: 'Trailer',
  final: 'Final',
}

export type ProductionPipelineWalk = {
  seriesShareToken: string
  blueprintShareToken: string
  scriptResonanceShareToken: string
  screeningRoomSlug: string
  /** Public Screening path. Empty uses /share/screening-room/{slug}. */
  screeningPath: string
  /** Picture-only trailer (WebM). Empty until the cut is confirmed. Not the longform. */
  trailerSrc: string
  /** MP4 fallback for the same trailer. */
  trailerMp4Src: string
  /** Runtime on the Watch button, such as "38 min". Empty until the master is timed. */
  longformRuntimeLabel: string
  /** True only after Screening Room Final is the real master. */
  longformPublished: boolean
}

function exampleWalk(
  id: ProductionWalkId,
  extra?: Partial<ProductionPipelineWalk>
): ProductionPipelineWalk {
  return {
    seriesShareToken: `example-${id}-series`,
    blueprintShareToken: `example-${id}-blueprint`,
    scriptResonanceShareToken: `example-${id}-script`,
    screeningRoomSlug: `example-${id}`,
    screeningPath: '',
    trailerSrc: '',
    trailerMp4Src: '',
    longformRuntimeLabel: '',
    longformPublished: false,
    ...extra,
  }
}

export const PRODUCTION_PIPELINE_WALKS: Record<ProductionWalkId, ProductionPipelineWalk> = {
  drama: exampleWalk('drama', {
    seriesShareToken: 'cb7cc9e663a87a074e37c62636ef8c00',
    blueprintShareToken: '5GDScu72NC7SWo1ioPMwzUxTg9KM2joz',
    scriptResonanceShareToken: '_uHqaPHdsD0ZfdJoEwtnHBi4DiAJBW9s',
    screeningRoomSlug: 'TheWhiteCityCurrent',
    screeningPath: '/TheWhiteCityCurrent',
    trailerSrc: CINEMATIC_DRAMA_TRAILER_WEBM,
    trailerMp4Src: CINEMATIC_DRAMA_TRAILER_MP4,
  }),
  animation: exampleWalk('animation', {
    trailerSrc: ANIMATED_SERIES_TRAILER_WEBM,
    trailerMp4Src: ANIMATED_SERIES_TRAILER_MP4,
  }),
  documentary: exampleWalk('documentary', {
    trailerSrc: DOCUMENTARY_TRAILER_WEBM,
    trailerMp4Src: DOCUMENTARY_TRAILER_MP4,
  }),
  training: exampleWalk('training', {
    trailerSrc: TRAINING_SERIES_TRAILER_WEBM,
    trailerMp4Src: TRAINING_SERIES_TRAILER_MP4,
  }),
  podcast: exampleWalk('podcast', {
    trailerSrc: CREATOR_PODCAST_TRAILER_WEBM,
    trailerMp4Src: CREATOR_PODCAST_TRAILER_MP4,
  }),
  memoir: exampleWalk('memoir', {
    trailerSrc: VIDEO_MEMOIR_TRAILER_WEBM,
    trailerMp4Src: VIDEO_MEMOIR_TRAILER_MP4,
  }),
}

/** Flagship walk. Older callers read this single triple. */
export const PRODUCTION_PIPELINE_DEMO = {
  get blueprintShareToken() {
    return PRODUCTION_PIPELINE_WALKS.drama.blueprintShareToken
  },
  get scriptResonanceShareToken() {
    return PRODUCTION_PIPELINE_WALKS.drama.scriptResonanceShareToken
  },
  get screeningRoomSlug() {
    return PRODUCTION_PIPELINE_WALKS.drama.screeningRoomSlug
  },
}

export type PipelineDemoStageId = 'series' | 'blueprint' | 'script-ar' | 'screening-room'

export const PIPELINE_DEMO_STAGES: PipelineDemoStageId[] = [
  'series',
  'blueprint',
  'script-ar',
  'screening-room',
]

export type ReviewerMilestoneId = 'series' | 'blueprint' | 'script-ar' | 'screening'

export type ReviewerMilestone = {
  id: ReviewerMilestoneId
  href: string
  placeholder: boolean
}

export type ProductionExampleMedia = {
  isFlagship: boolean
  trailerSrc: string | null
  trailerMp4Src: string | null
  longformHref: string | null
  longformRuntimeLabel: string
  milestones: ReviewerMilestone[]
}

export function productionWalkKey(cardId: string): ProductionWalkId | null {
  if ((PRODUCTION_WALK_IDS as readonly string[]).includes(cardId)) {
    return cardId as ProductionWalkId
  }
  return null
}

export function screeningCutHref(slug: string, cut: ScreeningCut): string {
  const base = `/share/screening-room/${encodeURIComponent(slug)}`
  if (cut === 'previs') return `${base}?playback=animatic&cut=previs`
  if (cut === 'rough') return `${base}?playback=video&cut=rough`
  if (cut === 'scenes') return `${base}?playback=video&cut=scenes`
  if (cut === 'trailer') return `${base}?cut=trailer`
  return `${base}?playback=video&cut=final`
}

/** One Screening link. The player inside already has Pre-Vis, Draft, and Master. */
function walkScreeningReviewHref(walk: ProductionPipelineWalk): string | null {
  const path = walk.screeningPath.trim()
  if (path) return path
  const slug = walk.screeningRoomSlug.trim()
  if (!slug) return null
  return `/share/screening-room/${encodeURIComponent(slug)}`
}

/** Screening link for a published master. Empty until Final exists. */
function publishedScreeningHref(walk: ProductionPipelineWalk): string | null {
  if (!walk.longformPublished) return null
  return walkScreeningReviewHref(walk)
}

/** Screening link for the pipeline walk, including placeholder slugs. */
function screeningSlugHref(walk: ProductionPipelineWalk, cut: ScreeningCut): string | null {
  const slug = walk.screeningRoomSlug.trim()
  if (!slug) return null
  if (walk.screeningPath.trim()) return walk.screeningPath.trim()
  return screeningCutHref(slug, cut)
}

function walkSeriesHref(walk: ProductionPipelineWalk): string | null {
  const token = walk.seriesShareToken.trim()
  return token ? `/s/series/${encodeURIComponent(token)}` : null
}

function walkBlueprintHref(walk: ProductionPipelineWalk): string | null {
  const token = walk.blueprintShareToken.trim()
  return token ? `/blueprint/share/${encodeURIComponent(token)}` : null
}

function walkScriptARHref(walk: ProductionPipelineWalk): string | null {
  const token = walk.scriptResonanceShareToken.trim()
  return token ? `/share/script-resonance/${encodeURIComponent(token)}` : null
}

export function getPipelineDemoBlueprintHref(): string | null {
  return walkBlueprintHref(PRODUCTION_PIPELINE_WALKS.drama)
}

export function getPipelineDemoScriptARHref(): string | null {
  return walkScriptARHref(PRODUCTION_PIPELINE_WALKS.drama)
}

export function getPipelineDemoScreeningHref(): string | null {
  return publishedScreeningHref(PRODUCTION_PIPELINE_WALKS.drama)
}

export function getPipelineDemoHref(stage: PipelineDemoStageId): string | null {
  return getWalkStageHref('drama', stage)
}

export function getWalkStageHref(
  walkId: ProductionWalkId,
  stage: PipelineDemoStageId
): string | null {
  const walk = PRODUCTION_PIPELINE_WALKS[walkId]
  switch (stage) {
    case 'series':
      return walkSeriesHref(walk)
    case 'blueprint':
      return walkBlueprintHref(walk)
    case 'script-ar':
      return walkScriptARHref(walk)
    case 'screening-room':
      return walkScreeningReviewHref(walk)
  }
}

export function getPipelineDemoNextStage(
  stage: PipelineDemoStageId
): PipelineDemoStageId | null {
  const index = PIPELINE_DEMO_STAGES.indexOf(stage)
  if (index < 0 || index >= PIPELINE_DEMO_STAGES.length - 1) return null
  return PIPELINE_DEMO_STAGES[index + 1] ?? null
}

export function matchPipelineWalk(
  tokenOrSlug: string
): { walkId: ProductionWalkId; stage: PipelineDemoStageId } | null {
  const value = tokenOrSlug.trim()
  if (!value) return null
  for (const walkId of PRODUCTION_WALK_IDS) {
    const walk = PRODUCTION_PIPELINE_WALKS[walkId]
    if (walk.seriesShareToken && value === walk.seriesShareToken) {
      return { walkId, stage: 'series' }
    }
    if (walk.blueprintShareToken && value === walk.blueprintShareToken) {
      return { walkId, stage: 'blueprint' }
    }
    if (walk.scriptResonanceShareToken && value === walk.scriptResonanceShareToken) {
      return { walkId, stage: 'script-ar' }
    }
    if (walk.screeningRoomSlug && value === walk.screeningRoomSlug) {
      return { walkId, stage: 'screening-room' }
    }
  }
  return null
}

export function matchPipelineDemoStage(tokenOrSlug: string): PipelineDemoStageId | null {
  return matchPipelineWalk(tokenOrSlug)?.stage ?? null
}

/** Placeholder shares use example- tokens and skip the live project fetch. */
export function isPipelinePlaceholderToken(tokenOrSlug: string): boolean {
  const value = tokenOrSlug.trim()
  if (!value.startsWith('example-')) return false
  return matchPipelineWalk(value) !== null
}

function trailerSourcesFor(tokenOrSlug: string): { webm: string; mp4: string } | null {
  const match = matchPipelineWalk(tokenOrSlug)
  if (!match || match.stage !== 'screening-room') return null
  const walk = PRODUCTION_PIPELINE_WALKS[match.walkId]
  const webm = walk.trailerSrc.trim()
  const mp4 = walk.trailerMp4Src.trim()
  if (!webm && !mp4) return null
  return { webm, mp4 }
}

export function getPipelineTrailerSrc(tokenOrSlug: string): string | null {
  const sources = trailerSourcesFor(tokenOrSlug)
  return sources?.webm || null
}

export function getPipelineTrailerMp4Src(tokenOrSlug: string): string | null {
  const sources = trailerSourcesFor(tokenOrSlug)
  return sources?.mp4 || null
}

export function getScreeningCutHref(walkId: ProductionWalkId, cut: ScreeningCut): string | null {
  return screeningSlugHref(PRODUCTION_PIPELINE_WALKS[walkId], cut)
}

function milestone(id: ReviewerMilestoneId, href: string | null): ReviewerMilestone | null {
  if (!href) return null
  return { id, href, placeholder: href.includes('example-') }
}

/** Pure view of one card. Four reviewer milestones, never the Screening Room cut buttons. */
export function buildProductionExampleMedia(
  walks: Record<ProductionWalkId, ProductionPipelineWalk>,
  cardId: string,
  locale?: string
): ProductionExampleMedia {
  const walkId = productionWalkKey(cardId)
  const isFlagship = walkId === FLAGSHIP_PRODUCTION_ID
  if (!walkId) {
    return {
      isFlagship: false,
      trailerSrc: null,
      trailerMp4Src: null,
      longformHref: null,
      longformRuntimeLabel: '',
      milestones: [],
    }
  }

  const walk = walks[walkId]
  const rawWebm = walk.trailerSrc.trim()
  const rawMp4 = walk.trailerMp4Src.trim()
  const useLocalizedDrama =
    walkId === 'drama' &&
    Boolean(locale) &&
    rawWebm === CINEMATIC_DRAMA_TRAILER_WEBM &&
    rawMp4 === CINEMATIC_DRAMA_TRAILER_MP4
  const useLocalizedAnimation =
    walkId === 'animation' &&
    Boolean(locale) &&
    rawWebm === ANIMATED_SERIES_TRAILER_WEBM &&
    rawMp4 === ANIMATED_SERIES_TRAILER_MP4
  const useLocalizedDocumentary =
    walkId === 'documentary' &&
    Boolean(locale) &&
    rawWebm === DOCUMENTARY_TRAILER_WEBM &&
    rawMp4 === DOCUMENTARY_TRAILER_MP4
  const useLocalizedTraining =
    walkId === 'training' &&
    Boolean(locale) &&
    rawWebm === TRAINING_SERIES_TRAILER_WEBM &&
    rawMp4 === TRAINING_SERIES_TRAILER_MP4
  const useLocalizedPodcast =
    walkId === 'podcast' &&
    Boolean(locale) &&
    rawWebm === CREATOR_PODCAST_TRAILER_WEBM &&
    rawMp4 === CREATOR_PODCAST_TRAILER_MP4
  const useLocalizedMemoir =
    walkId === 'memoir' &&
    Boolean(locale) &&
    rawWebm === VIDEO_MEMOIR_TRAILER_WEBM &&
    rawMp4 === VIDEO_MEMOIR_TRAILER_MP4
  const localizedSources = useLocalizedDrama
    ? getCinematicDramaTrailerSources(locale)
    : useLocalizedAnimation
      ? getAnimatedSeriesTrailerSources(locale)
      : useLocalizedDocumentary
        ? getDocumentaryTrailerSources(locale)
        : useLocalizedTraining
          ? getTrainingSeriesTrailerSources(locale)
          : useLocalizedPodcast
            ? getCreatorPodcastTrailerSources(locale)
            : useLocalizedMemoir
              ? getVideoMemoirTrailerSources(locale)
              : null
  const trailerSrc = (localizedSources ? localizedSources.webmSrc : rawWebm) || null
  const trailerMp4Src = (localizedSources ? localizedSources.mp4Src : rawMp4) || null
  const longformHref = publishedScreeningHref(walk)
  const milestones = [
    milestone('series', walkSeriesHref(walk)),
    milestone('blueprint', walkBlueprintHref(walk)),
    milestone('script-ar', walkScriptARHref(walk)),
    milestone('screening', walkScreeningReviewHref(walk)),
  ].filter((item): item is ReviewerMilestone => item !== null)

  return {
    isFlagship,
    trailerSrc,
    trailerMp4Src,
    longformHref,
    longformRuntimeLabel: longformHref ? walk.longformRuntimeLabel.trim() : '',
    milestones,
  }
}

export function getProductionExampleMedia(
  cardId: string,
  locale?: string
): ProductionExampleMedia {
  return buildProductionExampleMedia(PRODUCTION_PIPELINE_WALKS, cardId, locale)
}
