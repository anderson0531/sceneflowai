/**
 * Listen-only pipeline walks for Production Examples.
 * One triple per production so the share chrome stays on that production.
 * Tokens stay empty until the listen-only links are published.
 *
 * The cinematic drama is the flagship. Its trailer and longform master stay
 * empty until the trailer cut is confirmed and Final exists in the Screening
 * Room. Do not point trailerSrc at the short Cinematic Drama promos.
 * Later cards stay dark until that master is published.
 */

export const FLAGSHIP_PRODUCTION_ID = 'drama' as const

export const PRODUCTION_WALK_IDS = [
  'drama',
  'animation',
  'documentary',
  'localization-houston',
  'localization-saopaulo',
] as const

export type ProductionWalkId = (typeof PRODUCTION_WALK_IDS)[number]

export type ScreeningCut = 'previs' | 'scenes' | 'trailer' | 'final'

export const SCREENING_CUTS: ScreeningCut[] = ['previs', 'scenes', 'trailer', 'final']

export type ProductionPipelineWalk = {
  blueprintShareToken: string
  scriptResonanceShareToken: string
  screeningRoomSlug: string
  /** Picture-only trailer. Empty until the cut is confirmed. Not the longform. */
  trailerSrc: string
  /** Runtime on the Watch button, such as "38 min". Empty until the master is timed. */
  longformRuntimeLabel: string
  /** True only after Screening Room Final is the real master. */
  longformPublished: boolean
}

const EMPTY_WALK: ProductionPipelineWalk = {
  blueprintShareToken: '',
  scriptResonanceShareToken: '',
  screeningRoomSlug: '',
  trailerSrc: '',
  longformRuntimeLabel: '',
  longformPublished: false,
}

export const PRODUCTION_PIPELINE_WALKS: Record<ProductionWalkId, ProductionPipelineWalk> = {
  drama: { ...EMPTY_WALK },
  animation: { ...EMPTY_WALK },
  documentary: { ...EMPTY_WALK },
  'localization-houston': { ...EMPTY_WALK },
  'localization-saopaulo': { ...EMPTY_WALK },
}

/** Flagship walk. Older callers read this single triple; it stays empty until drama is published. */
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

export type PipelineDemoStageId = 'blueprint' | 'script-ar' | 'screening-room'

export const PIPELINE_DEMO_STAGES: PipelineDemoStageId[] = [
  'blueprint',
  'script-ar',
  'screening-room',
]

export type ProductionExampleDoorId =
  | 'blueprint'
  | 'script-ar'
  | 'previs'
  | 'scenes'
  | 'trailer'
  | 'final'

export type ProductionExampleDoor = {
  id: ProductionExampleDoorId
  href: string
}

export type ProductionExampleMedia = {
  isFlagship: boolean
  trailerSrc: string | null
  longformHref: string | null
  longformRuntimeLabel: string
  doors: ProductionExampleDoor[]
}

export function productionWalkKey(cardId: string, localeId?: string): ProductionWalkId | null {
  if (cardId === 'localization') {
    return localeId === 'saopaulo' ? 'localization-saopaulo' : 'localization-houston'
  }
  if ((PRODUCTION_WALK_IDS as readonly string[]).includes(cardId)) {
    return cardId as ProductionWalkId
  }
  return null
}

export function screeningCutHref(slug: string, cut: ScreeningCut): string {
  const base = `/share/screening-room/${encodeURIComponent(slug)}`
  if (cut === 'previs') return `${base}?playback=animatic&cut=previs`
  if (cut === 'scenes') return `${base}?playback=video&cut=scenes`
  if (cut === 'trailer') return `${base}?cut=trailer`
  return `${base}?playback=video&cut=final`
}

function walkScreeningHref(walk: ProductionPipelineWalk, cut: ScreeningCut): string | null {
  if (!walk.longformPublished) return null
  const slug = walk.screeningRoomSlug.trim()
  if (!slug) return null
  return screeningCutHref(slug, cut)
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
  return walkScreeningHref(PRODUCTION_PIPELINE_WALKS.drama, 'final')
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
    case 'blueprint':
      return walkBlueprintHref(walk)
    case 'script-ar':
      return walkScriptARHref(walk)
    case 'screening-room':
      return walkScreeningHref(walk, 'final')
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

export function getPipelineTrailerSrc(tokenOrSlug: string): string | null {
  const match = matchPipelineWalk(tokenOrSlug)
  if (!match || match.stage !== 'screening-room') return null
  const walk = PRODUCTION_PIPELINE_WALKS[match.walkId]
  if (!walk.longformPublished) return null
  const src = walk.trailerSrc.trim()
  return src || null
}

export function getScreeningCutHref(walkId: ProductionWalkId, cut: ScreeningCut): string | null {
  const walk = PRODUCTION_PIPELINE_WALKS[walkId]
  if (cut === 'trailer') {
    if (!walk.trailerSrc.trim() || !walk.longformPublished) return null
  }
  return walkScreeningHref(walk, cut)
}

function screeningHrefFor(
  walk: ProductionPipelineWalk,
  cut: ScreeningCut
): string | null {
  if (cut === 'trailer' && !walk.trailerSrc.trim()) return null
  return walkScreeningHref(walk, cut)
}

/** Pure view of one card. Later productions stay dark until the drama master is published. */
export function buildProductionExampleMedia(
  walks: Record<ProductionWalkId, ProductionPipelineWalk>,
  cardId: string,
  localeId?: string
): ProductionExampleMedia {
  const walkId = productionWalkKey(cardId, localeId)
  const isFlagship = walkId === FLAGSHIP_PRODUCTION_ID
  if (!walkId) {
    return {
      isFlagship: false,
      trailerSrc: null,
      longformHref: null,
      longformRuntimeLabel: '',
      doors: [],
    }
  }

  const walk = walks[walkId]
  const flagshipReady =
    walks.drama.longformPublished && walks.drama.screeningRoomSlug.trim().length > 0
  const laterCardBlocked = !isFlagship && !flagshipReady
  const trailerSrc =
    laterCardBlocked || !walk.longformPublished ? null : walk.trailerSrc.trim() || null
  const longformHref = laterCardBlocked ? null : walkScreeningHref(walk, 'final')
  const doors: ProductionExampleDoor[] = []

  if (!laterCardBlocked) {
    const blueprint = walkBlueprintHref(walk)
    const scriptAr = walkScriptARHref(walk)
    if (blueprint) doors.push({ id: 'blueprint', href: blueprint })
    if (scriptAr) doors.push({ id: 'script-ar', href: scriptAr })
    for (const cut of ['previs', 'scenes', 'trailer'] as const) {
      const href = screeningHrefFor(walk, cut)
      if (href) doors.push({ id: cut, href })
    }
  }

  return {
    isFlagship,
    trailerSrc,
    longformHref,
    longformRuntimeLabel: longformHref ? walk.longformRuntimeLabel.trim() : '',
    doors,
  }
}

export function getProductionExampleMedia(
  cardId: string,
  localeId?: string
): ProductionExampleMedia {
  return buildProductionExampleMedia(PRODUCTION_PIPELINE_WALKS, cardId, localeId)
}
