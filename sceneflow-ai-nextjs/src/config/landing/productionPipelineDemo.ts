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

/** Same-path public file. The query busts the previous cached trailer. */
export const CINEMATIC_DRAMA_TRAILER_WEBM = '/videos/cinematic-drama-trailer.webm?v=20261011'
export const CINEMATIC_DRAMA_TRAILER_MP4 =
  'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/25467ce3-606a-4e07-98ba-a91cf2be7ff2.mp4'

export const PRODUCTION_WALK_IDS = ['drama', 'animation', 'documentary', 'training'] as const

export type ProductionWalkId = (typeof PRODUCTION_WALK_IDS)[number]

export const PRODUCTION_WALK_LABELS: Record<ProductionWalkId, string> = {
  drama: 'Feature-Length Cinematic Drama',
  animation: 'Full-Season Animated Series',
  documentary: 'Long-Form Documentary',
  training: 'Multi-Module Training Series',
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
  animation: exampleWalk('animation'),
  documentary: exampleWalk('documentary'),
  training: exampleWalk('training'),
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
  cardId: string
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
  const trailerSrc = walk.trailerSrc.trim() || null
  const trailerMp4Src = walk.trailerMp4Src.trim() || null
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

export function getProductionExampleMedia(cardId: string): ProductionExampleMedia {
  return buildProductionExampleMedia(PRODUCTION_PIPELINE_WALKS, cardId)
}
