import {
  DEFAULT_PRODUCTION_METHOD,
  estimateProductionBudget,
  formatPlanDate,
  getFrameUnitCost,
  getVideoUnitCost,
  latestScheduleDate,
  parseCreditsBudgetParamsV2,
  PRODUCTION_METHODS,
  productionScheduleStatus,
  readProjectBudgetScope,
  rollupProductionBudget,
  type ProductionMethodId,
  type ScheduleChapterEnd,
  type SchedulePace,
  type SpendPace,
} from '@/lib/credits/productionBudgetManager'
import { getProjectCreditsBudget, getProjectCreditsUsed } from '@/lib/credits/projectBudgetShared'
import { byokMediaCredits } from '@/lib/credits/creditCosts'

export type CompanionMilestoneStage =
  | 'blueprint'
  | 'resonance'
  | 'continuity'
  | 'production'
  | 'screening'

export interface CompanionShareLinks {
  blueprintUrl?: string | null
  resonanceUrl?: string | null
  continuityUrl?: string | null
  screeningUrl?: string | null
}

export interface CompanionContinuitySummary {
  totalSlots: number
  approvedSlots: number
  pendingUploads: number
}

export interface CompanionPlanDate {
  date: string
  label: string
  credits: number
  cumulativeCredits: number
}

export interface CompanionPlanCard {
  projectId: string
  title: string
  updatedAt: string
  hasSchedule: boolean
  /** Saved target when set, otherwise the calculated master total. */
  plannedCredits: number | null
  finishDate: string | null
  finishLabel: string | null
  schedulePace: SchedulePace | null
  spendPace: SpendPace | null
  scenesPlanned: number | null
  scenesFinished: number | null
  creditsUsed: number
  plannedThroughToday: number | null
  upcoming: CompanionPlanDate[]
  chapterEnds: ScheduleChapterEnd[]
  /** Live workflow & client-PM collaboration status */
  milestoneStage: CompanionMilestoneStage
  pmSupportRequested: boolean
  isClientProject: boolean
  clientStage: string | null
  actionState: 'waiting_on_client' | 'action_required' | 'client_approved' | null
  creditBudgetCap: number | null
  resonanceScore: number | null
  shareLinks: CompanionShareLinks
  continuitySummary: CompanionContinuitySummary | null
}

function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function extractResonanceScore(metadata: Record<string, any> | null): number | null {
  if (!metadata) return null
  const direct =
    metadata.audienceResonanceScore ??
    metadata.filmTreatmentVariant?.audienceResonance?.overallScore ??
    metadata.filmTreatmentVariant?.resonanceScore ??
    metadata.visionPhase?.scriptReview?.overallScore ??
    metadata.visionPhase?.audienceResonance?.overallScore
  return typeof direct === 'number' && Number.isFinite(direct) ? Math.round(direct) : null
}

function deriveScreeningShareUrl(metadata: Record<string, any> | null): string | null {
  if (!metadata) return null
  const sr = metadata.screeningRoomShareLink as Record<string, any> | undefined
  if (!sr || sr.isActive === false) return null
  const slugOrToken = sr.slug || sr.shareToken
  if (typeof slugOrToken === 'string' && slugOrToken.trim()) {
    return `/share/screening-room/${encodeURIComponent(slugOrToken.trim())}`
  }
  return null
}

export function resolveCompanionMilestoneStage(args: {
  metadata: Record<string, any> | null
  framesDone: number
  videosDone: number
  resonanceScore: number | null
  shareLinks?: CompanionShareLinks
}): CompanionMilestoneStage {
  const md = args.metadata || {}
  const clientStage = String(md.clientOrder?.stage || '')
  const screeningUrl = args.shareLinks?.screeningUrl || deriveScreeningShareUrl(md)

  if (
    screeningUrl ||
    clientStage === 'final_approved' ||
    clientStage === 'screening_changes_requested'
  ) {
    return 'screening'
  }
  if (args.videosDone > 0 || args.framesDone > 0) {
    return 'production'
  }
  const refs = md.visionPhase?.references || {}
  const hasContinuityRefs =
    Boolean(args.shareLinks?.continuityUrl) ||
    clientStage.startsWith('continuity_') ||
    (Array.isArray(md.visionPhase?.characters) &&
      md.visionPhase.characters.some((c: any) => c?.referenceImage || c?.imageUrl)) ||
    (Array.isArray(refs.locationReferences) && refs.locationReferences.length > 0) ||
    (Array.isArray(refs.objectReferences) && refs.objectReferences.length > 0)

  if (hasContinuityRefs) {
    return 'continuity'
  }
  if (args.resonanceScore != null || args.shareLinks?.resonanceUrl) {
    return 'resonance'
  }
  return 'blueprint'
}

export function buildCompanionPlanCard(args: {
  projectId: string
  title: string
  updatedAt: string
  metadata?: Record<string, unknown> | null
  today?: string
  shareLinks?: CompanionShareLinks
  continuitySummary?: CompanionContinuitySummary | null
}): CompanionPlanCard {
  const metadata = (args.metadata ?? null) as Record<string, any> | null
  const today = args.today ?? todayIso()
  const saved = parseCreditsBudgetParamsV2(metadata?.creditsBudgetParams)
  const method = (saved?.method ?? DEFAULT_PRODUCTION_METHOD) as ProductionMethodId
  const defaults = PRODUCTION_METHODS[method]
  const frameQuality = saved?.frameQuality ?? defaults.frameQuality
  const videoQuality = saved?.videoQuality ?? defaults.videoQuality
  const frameIterations = saved?.frameIterations ?? defaults.frameIterations
  const videoIterations = saved?.videoIterations ?? defaults.videoIterations
  const topazEnabled = saved?.topazEnabled ?? defaults.topazEnabled
  const intelligenceEnabled = saved?.intelligenceEnabled ?? defaults.intelligenceEnabled
  const byokExcludeMedia = Boolean(saved?.byokExcludeMedia)
  const scope = readProjectBudgetScope({ metadata })
  const videoOn = videoQuality !== 'none'
  const estimate = estimateProductionBudget({
    scenes: scope.scenes,
    beats: scope.beats,
    segmentDurationSec: scope.segmentDurationSec,
    method,
    frameQuality,
    videoQuality,
    frameIterations,
    videoIterations: videoOn ? videoIterations : 0,
    topazEnabled,
    intelligenceEnabled,
    byokExcludeMedia,
    creditsUsed: getProjectCreditsUsed(metadata),
    framesDone: scope.framesDone,
    videosDone: scope.videosDone,
    observedVideoTakesAvg: scope.observedVideoTakesAvg ?? undefined,
    creditsBudget: getProjectCreditsBudget(metadata),
    hasByokKeys: byokExcludeMedia,
  })
  const rollup = rollupProductionBudget({
    scenes: scope.sceneActuals,
    frameIterations,
    videoIterations: videoOn ? videoIterations : 0,
    frameUnit: byokExcludeMedia
      ? byokMediaCredits(getFrameUnitCost(frameQuality))
      : getFrameUnitCost(frameQuality),
    videoUnit: byokExcludeMedia
      ? byokMediaCredits(getVideoUnitCost(videoQuality, scope.segmentDurationSec))
      : getVideoUnitCost(videoQuality, scope.segmentDurationSec),
    topazCredits: estimate.topaz.credits,
    intelligenceCredits: estimate.intelligence.credits,
    videoOn,
  })

  const entries = saved?.schedule?.entries ?? []
  const sceneCreditById = new Map<string, number>()
  for (const chapter of rollup.chapters) {
    for (const scene of chapter.scenes) sceneCreditById.set(scene.sceneId, scene.credits)
  }
  const dates = [
    ...new Set(entries.map((entry) => entry.date).filter((date): date is string => Boolean(date))),
  ].sort()
  let running = 0
  const byDate = dates.map((date) => {
    const sceneIds = entries.filter((entry) => entry.date === date).map((entry) => entry.sceneId)
    const credits = sceneIds.reduce((sum, sceneId) => sum + (sceneCreditById.get(sceneId) ?? 0), 0)
    running += credits
    return { date, sceneIds, credits, cumulativeCredits: running }
  })
  const scheduleById = new Map(entries.map((entry) => [entry.sceneId, entry]))
  const chapterEnds = rollup.chapters.flatMap((chapter) => {
    const chapterDates = chapter.scenes
      .map((scene) => scheduleById.get(scene.sceneId)?.date)
      .filter((date): date is string => Boolean(date))
      .sort()
    const date = chapterDates[chapterDates.length - 1]
    return date ? [{ key: chapter.key, title: chapter.title, date }] : []
  })
  const status = productionScheduleStatus({
    entries,
    byDate,
    finishedSceneIds: rollup.chapters.flatMap((chapter) =>
      chapter.scenes.filter((scene) => scene.finished).map((scene) => scene.sceneId)
    ),
    creditsUsed: scope.creditsUsed,
    today,
  })
  const finishDate = latestScheduleDate(saved?.schedule)
  const savedBudget = getProjectCreditsBudget(metadata)
  const clientOrder = (metadata?.clientOrder || {}) as Record<string, any>
  const creditBudgetCap =
    typeof clientOrder.creditBudgetCap === 'number' && clientOrder.creditBudgetCap > 0
      ? clientOrder.creditBudgetCap
      : null
  const hasParams = Boolean(saved && (saved.method || saved.schedule || saved.frameIterations != null))
  const plannedCredits =
    savedBudget > 0
      ? savedBudget
      : creditBudgetCap != null
        ? creditBudgetCap
        : hasParams
          ? rollup.masterCredits
          : null

  const resonanceScore = extractResonanceScore(metadata)
  const screeningUrl = args.shareLinks?.screeningUrl ?? deriveScreeningShareUrl(metadata)
  const mergedLinks: CompanionShareLinks = {
    blueprintUrl: args.shareLinks?.blueprintUrl ?? null,
    resonanceUrl: args.shareLinks?.resonanceUrl ?? null,
    continuityUrl: args.shareLinks?.continuityUrl ?? null,
    screeningUrl,
  }
  const milestoneStage = resolveCompanionMilestoneStage({
    metadata,
    framesDone: scope.framesDone,
    videosDone: scope.videosDone,
    resonanceScore,
    shareLinks: mergedLinks,
  })
  const rawActionState = clientOrder.actionState
  const actionState =
    rawActionState === 'waiting_on_client' ||
    rawActionState === 'action_required' ||
    rawActionState === 'client_approved'
      ? rawActionState
      : null

  return {
    projectId: args.projectId,
    title: args.title,
    updatedAt: args.updatedAt,
    hasSchedule: Boolean(finishDate),
    plannedCredits,
    finishDate,
    finishLabel: finishDate ? formatPlanDate(finishDate) : null,
    schedulePace: status?.schedulePace ?? null,
    spendPace: status?.spendPace ?? null,
    scenesPlanned: status?.scenesPlanned ?? null,
    scenesFinished: status?.scenesFinished ?? null,
    creditsUsed: scope.creditsUsed,
    plannedThroughToday: status?.plannedCredits ?? null,
    upcoming: byDate
      .filter((row) => row.date >= today)
      .slice(0, 8)
      .map((row) => ({ ...row, label: formatPlanDate(row.date) })),
    chapterEnds: chapterEnds.map((chapter) => ({
      ...chapter,
      date: formatPlanDate(chapter.date),
    })),
    milestoneStage,
    pmSupportRequested: Boolean(clientOrder.pmSupportRequested),
    isClientProject: Boolean(clientOrder.isClientProject || clientOrder.pmSupportRequested),
    clientStage: typeof clientOrder.stage === 'string' ? clientOrder.stage : null,
    actionState,
    creditBudgetCap,
    resonanceScore,
    shareLinks: mergedLinks,
    continuitySummary: args.continuitySummary ?? null,
  }
}
