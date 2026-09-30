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
}

function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function buildCompanionPlanCard(args: {
  projectId: string
  title: string
  updatedAt: string
  metadata?: Record<string, unknown> | null
  today?: string
}): CompanionPlanCard {
  const metadata = args.metadata ?? null
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
  const hasParams = Boolean(saved && (saved.method || saved.schedule || saved.frameIterations != null))
  const plannedCredits = savedBudget > 0 ? savedBudget : hasParams ? rollup.masterCredits : null

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
  }
}
