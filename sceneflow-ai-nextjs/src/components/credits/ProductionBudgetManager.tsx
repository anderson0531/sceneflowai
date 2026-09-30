'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Brain,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Key,
  Lightbulb,
  Pin,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'
import {
  actualPlanningTargets,
  applyMethodDefaults,
  buildProductionBudgetParams,
  buildSceneSchedule,
  DEFAULT_PRODUCTION_METHOD,
  DEFAULT_FRAME_ITERATIONS,
  DEFAULT_SCHEDULE_WEEKDAYS,
  DEFAULT_VIDEO_ITERATIONS,
  estimateProductionBudget,
  getFrameUnitCost,
  getVideoUnitCost,
  parseCreditsBudgetParamsV2,
  TOPAZ_CREDITS_PER_MINUTE,
  topazMinutes,
  PRODUCTION_METHODS,
  productionScheduleStatus,
  readProjectBudgetScope,
  rollupProductionBudget,
  type FrameQuality,
  type ProductionMethodId,
  type SceneScheduleEntry,
  type VideoQuality,
} from '@/lib/credits/productionBudgetManager'
import { getProjectCreditsBudget } from '@/lib/credits/projectBudgetShared'

export interface ProductionBudgetManagerProps {
  projectId?: string
  projectTitle?: string
  script?: unknown
  metadata?: Record<string, unknown> | null
  /** Live Production Studio scene map (preferred for frames/videos actuals). */
  sceneProductionData?: Record<string, unknown> | null
  currentBalance?: number
  initialByokExcludeMedia?: boolean
  hasByokKeys?: boolean
  onSetBudget?: (
    credits: number,
    budgetParams?: Record<string, unknown>
  ) => void | Promise<void>
}

const WEEKDAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, (month || 1) - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthCells(monthKey: string): Array<string | null> {
  const [year, month] = monthKey.split('-').map(Number)
  const first = new Date(Date.UTC(year, (month || 1) - 1, 1))
  const days = new Date(Date.UTC(year, month || 1, 0)).getUTCDate()
  const cells: Array<string | null> = Array.from({ length: first.getUTCDay() }, () => null)
  for (let day = 1; day <= days; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    )
  }
  return cells
}

type PrimaryTab = 'budget' | 'schedule'
type BudgetSection = 'plan' | 'rollup' | 'breakdown' | 'savings'
type ScheduleSection = 'plan' | 'calendar' | 'status'

function TabRow({
  tabs,
  active,
  onSelect,
}: {
  tabs: Array<{ id: string; label: string }>
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
              selected ? 'bg-cyan-500/20 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

const METHOD_ORDER: ProductionMethodId[] = [
  'animatic_first',
  'draft_production',
  'final_delivery',
  'express_sprint',
]

function formatCredits(n: number): string {
  return Math.round(n).toLocaleString()
}

function MethodIcon({ id }: { id: ProductionMethodId }) {
  switch (id) {
    case 'animatic_first':
      return <Clapperboard className="w-4 h-4" />
    case 'draft_production':
      return <Film className="w-4 h-4" />
    case 'final_delivery':
      return <Sparkles className="w-4 h-4" />
    case 'express_sprint':
      return <Zap className="w-4 h-4" />
    default:
      return <Calculator className="w-4 h-4" />
  }
}

export function ProductionBudgetManager({
  projectId,
  projectTitle,
  script,
  metadata,
  sceneProductionData,
  currentBalance = 0,
  initialByokExcludeMedia = false,
  hasByokKeys = false,
  onSetBudget,
}: ProductionBudgetManagerProps) {
  const t = useTranslations('production.budgetManager')

  const scope = useMemo(
    () =>
      readProjectBudgetScope({
        script,
        metadata: metadata ?? null,
        productionScenes: sceneProductionData ?? null,
      }),
    [script, metadata, sceneProductionData]
  )

  const saved = useMemo(
    () => parseCreditsBudgetParamsV2(metadata?.creditsBudgetParams),
    [metadata?.creditsBudgetParams]
  )

  const creditsBudget = useMemo(
    () => getProjectCreditsBudget(metadata ?? null),
    [metadata]
  )

  const [method, setMethod] = useState<ProductionMethodId>(
    saved?.method ?? DEFAULT_PRODUCTION_METHOD
  )
  const [frameQuality, setFrameQuality] = useState<FrameQuality>(
    saved?.frameQuality ?? PRODUCTION_METHODS.animatic_first.frameQuality
  )
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(
    saved?.videoQuality ?? PRODUCTION_METHODS.animatic_first.videoQuality
  )
  const [frameIterations, setFrameIterations] = useState(
    saved?.frameIterations ?? DEFAULT_FRAME_ITERATIONS
  )
  const [videoIterations, setVideoIterations] = useState(
    saved?.videoIterations ?? 0
  )
  const [topazEnabled, setTopazEnabled] = useState(
    saved?.topazEnabled ?? false
  )
  const [intelligenceEnabled, setIntelligenceEnabled] = useState(
    saved?.intelligenceEnabled ?? true
  )
  const [byokExcludeMedia, setByokExcludeMedia] = useState(
    Boolean(saved?.byokExcludeMedia ?? initialByokExcludeMedia)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [startDate, setStartDate] = useState(saved?.schedule?.startDate ?? todayIso())
  const [weekdays, setWeekdays] = useState<boolean[]>(
    saved?.schedule?.weekdays ?? [...DEFAULT_SCHEDULE_WEEKDAYS]
  )
  const [scenesPerDay, setScenesPerDay] = useState(saved?.schedule?.scenesPerDay ?? 2)
  const [scheduleEntries, setScheduleEntries] = useState<SceneScheduleEntry[]>(
    saved?.schedule?.entries ?? []
  )
  const [calendarMonth, setCalendarMonth] = useState(
    (saved?.schedule?.startDate ?? todayIso()).slice(0, 7)
  )
  const [openScenes, setOpenScenes] = useState<Record<string, boolean>>({})
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('budget')
  const [budgetSection, setBudgetSection] = useState<BudgetSection>('plan')
  const [scheduleSection, setScheduleSection] = useState<ScheduleSection>('plan')

  useEffect(() => {
    setByokExcludeMedia(Boolean(saved?.byokExcludeMedia ?? initialByokExcludeMedia))
  }, [initialByokExcludeMedia, saved?.byokExcludeMedia])

  const applyMethod = useCallback((next: ProductionMethodId) => {
    const defaults = applyMethodDefaults(next)
    setMethod(next)
    setFrameQuality(defaults.frameQuality)
    setVideoQuality(defaults.videoQuality)
    setFrameIterations(defaults.frameIterations)
    setVideoIterations(defaults.videoIterations)
    setTopazEnabled(defaults.topazEnabled)
    setIntelligenceEnabled(defaults.intelligenceEnabled)
  }, [])

  const estimate = useMemo(
    () =>
      estimateProductionBudget({
        scenes: scope.scenes,
        beats: scope.beats,
        segmentDurationSec: scope.segmentDurationSec,
        method,
        frameQuality,
        videoQuality,
        frameIterations,
        videoIterations: videoQuality === 'none' ? 0 : videoIterations,
        topazEnabled,
        intelligenceEnabled,
        byokExcludeMedia,
        creditsUsed: scope.creditsUsed,
        framesDone: scope.framesDone,
        videosDone: scope.videosDone,
        observedVideoTakesAvg: scope.observedVideoTakesAvg ?? undefined,
        creditsBudget,
        hasByokKeys: hasByokKeys || byokExcludeMedia,
      }),
    [
      scope,
      method,
      frameQuality,
      videoQuality,
      frameIterations,
      videoIterations,
      topazEnabled,
      intelligenceEnabled,
      byokExcludeMedia,
      creditsBudget,
      hasByokKeys,
    ]
  )

  const frameUnit = getFrameUnitCost(frameQuality)
  const videoUnit = getVideoUnitCost(videoQuality, scope.segmentDurationSec)
  const videoOn = videoQuality !== 'none'
  const draftClipCost = getVideoUnitCost('draft', scope.segmentDurationSec)
  const finalClipCost = getVideoUnitCost('final', scope.segmentDurationSec)
  const upscaleClipCost =
    draftClipCost + topazMinutes(1, scope.segmentDurationSec) * TOPAZ_CREDITS_PER_MINUTE
  const finalPremium = Math.max(0, finalClipCost - draftClipCost)
  const upscaleGap = finalClipCost - upscaleClipCost
  const shotCredits = byokExcludeMedia
    ? 0
    : frameIterations * frameUnit + (videoOn ? videoIterations * videoUnit : 0)
  const rollup = useMemo(
    () =>
      rollupProductionBudget({
        scenes: scope.sceneActuals,
        frameIterations,
        videoIterations: videoOn ? videoIterations : 0,
        frameUnit: byokExcludeMedia ? 0 : frameUnit,
        videoUnit: byokExcludeMedia ? 0 : videoUnit,
        topazCredits: estimate.topaz.credits,
        intelligenceCredits: estimate.intelligence.credits,
        videoOn,
      }),
    [
      scope.sceneActuals,
      frameIterations,
      videoIterations,
      frameUnit,
      videoUnit,
      estimate.topaz.credits,
      estimate.intelligence.credits,
      videoOn,
      byokExcludeMedia,
    ]
  )
  const actualTargets = actualPlanningTargets(scope.sceneActuals, videoOn)
  const scheduleById = useMemo(
    () => new Map(scheduleEntries.map((entry) => [entry.sceneId, entry])),
    [scheduleEntries]
  )
  const daysUsed = scheduleEntries.reduce((max, entry) => Math.max(max, entry.day), 0)
  const sceneCreditById = useMemo(() => {
    const credits = new Map<string, number>()
    for (const chapter of rollup.chapters) {
      for (const scene of chapter.scenes) credits.set(scene.sceneId, scene.credits)
    }
    return credits
  }, [rollup.chapters])
  const scheduleTotals = useMemo(() => {
    const dates = [
      ...new Set(
        scheduleEntries
          .map((entry) => entry.date)
          .filter((date): date is string => Boolean(date))
      ),
    ].sort()
    let running = 0
    return dates.map((date) => {
      const sceneIds = scheduleEntries
        .filter((entry) => entry.date === date)
        .map((entry) => entry.sceneId)
      const credits = sceneIds.reduce((sum, sceneId) => sum + (sceneCreditById.get(sceneId) ?? 0), 0)
      running += credits
      return { date, sceneIds, credits, cumulativeCredits: running }
    })
  }, [scheduleEntries, sceneCreditById])
  const chapterEnds = useMemo(
    () =>
      rollup.chapters.flatMap((chapter) => {
        const dates = chapter.scenes
          .map((scene) => scheduleById.get(scene.sceneId)?.date)
          .filter((date): date is string => Boolean(date))
          .sort()
        const date = dates[dates.length - 1]
        return date ? [{ key: chapter.key, title: chapter.title, date }] : []
      }),
    [rollup.chapters, scheduleById]
  )
  const scheduleStatus = productionScheduleStatus({
    entries: scheduleEntries,
    byDate: scheduleTotals,
    finishedSceneIds: rollup.chapters.flatMap((chapter) =>
      chapter.scenes.filter((scene) => scene.finished).map((scene) => scene.sceneId)
    ),
    creditsUsed: scope.creditsUsed,
    today: todayIso(),
  })
  const masterEndDate = scheduleTotals[scheduleTotals.length - 1]?.date

  const handleSetBudget = async () => {
    if (!onSetBudget) return
    setIsSaving(true)
    try {
      const params = buildProductionBudgetParams({
        method,
        frameQuality,
        videoQuality,
        frameIterations,
        videoIterations: videoQuality === 'none' ? 0 : videoIterations,
        topazEnabled,
        intelligenceEnabled,
        byokExcludeMedia,
        segmentDurationSec: scope.segmentDurationSec,
        schedule: {
          workDays: Math.max(daysUsed, 1),
          scenesPerDay,
          startDate,
          weekdays,
          entries: scheduleEntries,
        },
      })
      await onSetBudget(estimate.plannedTotal, params)
    } finally {
      setIsSaving(false)
    }
  }

  const remainingToBudget = Math.max(0, estimate.plannedTotal - currentBalance)

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-slate-700/50 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('title')}</h2>
            <p className="text-sm text-gray-400">
              {projectTitle ? t('subtitleWithTitle', { title: projectTitle }) : t('subtitle')}
            </p>
          </div>
        </div>
        {currentBalance > 0 && (
          <div className="text-right shrink-0">
            <div className="text-sm text-gray-400">{t('currentBalance')}</div>
            <div className="text-lg font-bold text-cyan-400">
              {t('creditsCount', { count: formatCredits(currentBalance) })}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Hero summary: Charged / To complete / Forecast dominate first scan */}
        <div
          className={`p-5 rounded-2xl border ${
            estimate.creditsUsed > 0 && estimate.variance > 0
              ? 'bg-gradient-to-br from-slate-800/90 to-amber-950/30 border-amber-500/25'
              : 'bg-gradient-to-br from-slate-800/90 to-cyan-950/40 border-cyan-500/20'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 text-center">
            <div>
              <div className="text-xs uppercase tracking-wide text-cyan-400/80 mb-1">
                {t('charged')}
              </div>
              <div className="text-3xl font-semibold tabular-nums text-cyan-300">
                {formatCredits(estimate.creditsUsed)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-amber-300/80 mb-1">
                {t('costToComplete')}
              </div>
              <div className="text-3xl font-semibold tabular-nums text-white">
                {formatCredits(estimate.costToComplete)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/70 mb-1">
                {t('forecast')}
              </div>
              <div className="text-4xl font-bold tabular-nums text-white tracking-tight">
                {formatCredits(estimate.forecastTotal)}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-300">
            <span>
              {t('progressFrames', {
                done: scope.framesDone,
                total: scope.beats,
              })}
            </span>
            <span className="text-slate-600 hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>
              {t('progressVideos', {
                done: scope.videosDone,
                total: scope.beats,
              })}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              {t('required')}: {formatCredits(estimate.plannedTotal)}
            </span>
            {currentBalance > 0 && (
              <span>
                {t('currentBalance')}: {formatCredits(currentBalance)}
              </span>
            )}
          </div>

          {creditsBudget > 0 && (
            <div className="mt-3 text-xs text-gray-400 text-center">
              {estimate.variance > 0
                ? t('overBudget', { credits: formatCredits(estimate.variance) })
                : t('underBudget', {
                    credits: formatCredits(Math.abs(estimate.variance)),
                  })}
            </div>
          )}
          {remainingToBudget > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('needCredits', { credits: formatCredits(remainingToBudget) })}
            </div>
          )}
        </div>

        <TabRow
          tabs={[
            { id: 'budget', label: t('tabs.budget') },
            { id: 'schedule', label: t('tabs.schedule') },
          ]}
          active={primaryTab}
          onSelect={(id) => {
            if (id === 'budget') {
              setPrimaryTab('budget')
              setBudgetSection('plan')
            } else {
              setPrimaryTab('schedule')
              setScheduleSection('plan')
            }
          }}
        />
        <TabRow
          tabs={
            primaryTab === 'budget'
              ? [
                  { id: 'plan', label: t('tabs.plan') },
                  { id: 'rollup', label: t('tabs.rollup') },
                  { id: 'breakdown', label: t('tabs.breakdown') },
                  { id: 'savings', label: t('tabs.savings') },
                ]
              : [
                  { id: 'plan', label: t('tabs.plan') },
                  { id: 'calendar', label: t('tabs.calendar') },
                  { id: 'status', label: t('tabs.status') },
                ]
          }
          active={primaryTab === 'budget' ? budgetSection : scheduleSection}
          onSelect={(id) => {
            if (primaryTab === 'budget') setBudgetSection(id as BudgetSection)
            else setScheduleSection(id as ScheduleSection)
          }}
        />

        {primaryTab === 'budget' && budgetSection === 'plan' && (
        <>
        <label
          className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${
            byokExcludeMedia
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-slate-800/50 border-slate-700/50'
          }`}
        >
          <input
            type="checkbox"
            checked={byokExcludeMedia}
            onChange={(e) => setByokExcludeMedia(e.target.checked)}
            className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Key className="w-4 h-4 text-amber-400" />
              {t('byokTitle')}
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('byokDescription')}</p>
          </div>
        </label>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
          <span>
            {t('scenes')}: <span className="text-gray-300">{scope.scenes}</span>
          </span>
          <span>
            {t('beats')}: <span className="text-gray-300">{scope.beats}</span>
          </span>
          <span>
            {t('clipDuration')}:{' '}
            <span className="text-gray-300">
              {t('seconds', { count: scope.segmentDurationSec })}
            </span>
          </span>
        </div>
        <p className="text-xs text-gray-500 -mt-4">{t('scopeFixedHint')}</p>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">{t('methodsTitle')}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {METHOD_ORDER.map((id) => {
              const selected = method === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyMethod(id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 font-medium">
                    <MethodIcon id={id} />
                    {t(`methods.${id}.name`)}
                    {id === 'animatic_first' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {t('recommended')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{t(`methods.${id}.hint`)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {t('frameResolution')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['draft', 'final'] as FrameQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setFrameQuality(q)}
                  className={`p-3 rounded-lg border text-sm ${
                    frameQuality === q
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-300'
                  }`}
                >
                  {t(`quality.${q}`)}
                  <div className="text-xs text-cyan-400/80 mt-1">
                    {t('creditsPerFrame', { credits: getFrameUnitCost(q) })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <Video className="w-4 h-4" />
              {t('videoResolution')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'draft', 'final'] as VideoQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setVideoQuality(q)
                    if (q === 'none') setVideoIterations(0)
                    else if (videoIterations <= 0) setVideoIterations(DEFAULT_VIDEO_ITERATIONS)
                  }}
                  className={`p-3 rounded-lg border text-sm ${
                    videoQuality === q
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-gray-300'
                  }`}
                >
                  {t(`quality.${q}`)}
                  <div className="text-xs text-cyan-400/80 mt-1">
                    {q === 'none'
                      ? t('creditsZero')
                      : t('creditsPerClip', {
                          credits: getVideoUnitCost(q, scope.segmentDurationSec),
                          seconds: scope.segmentDurationSec,
                        })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">{t('providerNote')}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300" htmlFor="still-iterations">
              {t('frameIterations')}
            </label>
            <input
              id="still-iterations"
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={frameIterations}
              onChange={(e) => setFrameIterations(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm tabular-nums text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300" htmlFor="clip-iterations">
              {t('videoIterations')}
            </label>
            <input
              id="clip-iterations"
              type="number"
              min={1}
              max={5}
              step={0.1}
              disabled={!videoOn}
              value={videoOn ? videoIterations : 0}
              onChange={(e) => setVideoIterations(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm tabular-nums text-white disabled:opacity-40"
            />
          </div>
        </div>
        <p className="text-sm text-gray-300 -mt-2">
          {t('shotPrice', {
            stills: frameIterations.toFixed(1),
            clips: videoOn ? videoIterations.toFixed(1) : '0',
            credits: formatCredits(shotCredits),
          })}
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
              topazEnabled
                ? 'bg-violet-500/10 border-violet-500/40'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            <input
              type="checkbox"
              checked={topazEnabled}
              onChange={(e) => setTopazEnabled(e.target.checked)}
              className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500"
            />
            <div>
              <div className="text-sm font-medium text-white">{t('topazTitle')}</div>
              <p className="text-xs text-gray-400 mt-0.5">{t('topazDescription')}</p>
            </div>
          </label>
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
              intelligenceEnabled
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            <input
              type="checkbox"
              checked={intelligenceEnabled}
              onChange={(e) => setIntelligenceEnabled(e.target.checked)}
              className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Brain className="w-4 h-4 text-emerald-400" />
                {t('intelligenceTitle')}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{t('intelligenceDescription')}</p>
            </div>
          </label>
        </div>
        </>
        )}

        {primaryTab === 'budget' && budgetSection === 'rollup' && (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">{t('rollupTitle')}</h3>
              <p className="text-sm tabular-nums text-gray-300">
                {t('masterTotal', { credits: formatCredits(rollup.masterCredits) })}
              </p>
            </div>
            <button
              type="button"
              disabled={!actualTargets}
              onClick={() => {
                if (!actualTargets) return
                setFrameIterations(actualTargets.frameIterations)
                if (actualTargets.videoIterations != null) {
                  setVideoIterations(actualTargets.videoIterations)
                }
              }}
              className="rounded-lg border border-cyan-500/40 px-3 py-2 text-sm font-medium text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('useActuals')}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {actualTargets
              ? t('useActualsConfirm', {
                  stills: actualTargets.frameIterations.toFixed(1),
                  clips:
                    actualTargets.videoIterations == null
                      ? '0'
                      : actualTargets.videoIterations.toFixed(1),
                })
              : t('noFinishedScenes')}
          </p>
          {rollup.chapters.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noBeatsYet')}</p>
          ) : (
            <div className="space-y-4">
              {rollup.chapters.map((chapter) => (
                <div key={chapter.key} className="rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-white">{chapter.title}</span>
                    <span className="tabular-nums text-gray-300">{formatCredits(chapter.credits)}</span>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {chapter.scenes.map((scene) => {
                      const open = Boolean(openScenes[scene.sceneId])
                      return (
                        <div key={scene.sceneId} className="px-3 py-2">
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-3 text-left"
                            onClick={() =>
                              setOpenScenes((prev) => ({
                                ...prev,
                                [scene.sceneId]: !prev[scene.sceneId],
                              }))
                            }
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-1 text-sm text-white">
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`}
                                />
                                {scene.title}
                              </span>
                              <span className="mt-1 block text-xs text-gray-400">
                                {t('sceneRates', {
                                  stills: scene.stillIterations.toFixed(1),
                                  clips: videoOn ? scene.clipIterations.toFixed(1) : '0',
                                })}
                                {scene.finished && scene.stillActual != null && (
                                  <>
                                    {' · '}
                                    <span
                                      className={
                                        scene.stillActual > scene.stillIterations ||
                                        (scene.clipActual != null &&
                                          scene.clipActual > scene.clipIterations)
                                          ? 'text-amber-300'
                                          : undefined
                                      }
                                    >
                                      {t('sceneActuals', {
                                        stills: scene.stillActual.toFixed(1),
                                        clips:
                                          scene.clipActual == null
                                            ? '0'
                                            : scene.clipActual.toFixed(1),
                                      })}
                                    </span>
                                  </>
                                )}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-white">
                              {formatCredits(scene.credits)}
                            </span>
                          </button>
                          {open && (
                            <ul className="mt-2 space-y-1 pl-5">
                              {scene.shots.map((shot) => (
                                <li
                                  key={shot.id}
                                  className="flex items-center justify-between text-xs text-gray-400"
                                >
                                  <span>{shot.label}</span>
                                  <span className="tabular-nums">
                                    {t('shotAttempts', {
                                      stills: shot.stillAttempts,
                                      clips: shot.clipAttempts,
                                      credits: formatCredits(shot.credits),
                                    })}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {primaryTab === 'schedule' && scheduleSection === 'plan' && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-white">{t('scheduleTitle')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-300">
              {t('startDate')}
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value
                  if (!next) return
                  setStartDate(next)
                  setCalendarMonth(next.slice(0, 7))
                }}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-sm text-gray-300">
              {t('scenesPerDay')}
              <input
                type="number"
                min={1}
                value={scenesPerDay}
                onChange={(e) =>
                  setScenesPerDay(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm tabular-nums text-white"
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-300">{t('weekdays')}</p>
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={weekdays[index]}
                  onClick={() =>
                    setWeekdays((current) =>
                      current.map((on, day) => (day === index ? !on : on))
                    )
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    weekdays[index]
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'bg-slate-800 text-gray-500'
                  }`}
                >
                  {t(`weekday.${label}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={scope.sceneActuals.length === 0 || !weekdays.some(Boolean)}
            onClick={() => {
              const built = buildSceneSchedule({
                sceneIds: scope.sceneActuals.map((scene) => scene.sceneId),
                scenesPerDay,
                startDate,
                weekdays,
                pinned: scheduleEntries
                  .filter((entry) => entry.pinned)
                  .map((entry) => ({
                    sceneId: entry.sceneId,
                    day: entry.day,
                    date: entry.date,
                  })),
                sceneCredits: Object.fromEntries(sceneCreditById),
                chapters: rollup.chapters.map((chapter) => ({
                  key: chapter.key,
                  title: chapter.title,
                  sceneIds: chapter.scenes.map((scene) => scene.sceneId),
                })),
              })
              setScheduleEntries(built.entries)
              if (built.endDate) setCalendarMonth(built.endDate.slice(0, 7))
            }}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {t('buildSchedule')}
          </button>
          {masterEndDate && (
            <p className="text-sm text-gray-300">
              {t('masterEnd', {
                date: masterEndDate,
                credits: formatCredits(scheduleTotals[scheduleTotals.length - 1]?.cumulativeCredits ?? 0),
              })}
            </p>
          )}
          {chapterEnds.length > 0 && (
            <ul className="space-y-1 text-xs text-gray-400">
              {chapterEnds.map((chapter) => (
                <li key={chapter.key}>
                  {t('chapterEnd', { title: chapter.title, date: chapter.date })}
                </li>
              ))}
            </ul>
          )}
          {scope.sceneActuals.length === 0 ? (
            <p className="text-sm text-gray-400">{t('noBeatsYet')}</p>
          ) : (
            <ul className="space-y-2">
              {scope.sceneActuals.map((scene) => {
                const entry = scheduleById.get(scene.sceneId)
                return (
                  <li
                    key={scene.sceneId}
                    className="flex flex-col gap-2 rounded-lg bg-slate-800/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm text-white">
                      {scene.title}
                      {entry?.pinned && <Pin className="h-3.5 w-3.5 text-cyan-300" aria-hidden />}
                    </span>
                    <label className="text-xs text-gray-400">
                      {t('sceneDate')}
                      <input
                        type="date"
                        value={entry?.date ?? ''}
                        onChange={(e) => {
                          const date = e.target.value
                          if (!date) return
                          setScheduleEntries((prev) => {
                            const next = prev.filter((row) => row.sceneId !== scene.sceneId)
                            next.push({ sceneId: scene.sceneId, day: entry?.day ?? 0, date, pinned: true })
                            return next
                          })
                        }}
                        className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
                      />
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        )}

        {primaryTab === 'schedule' && scheduleSection === 'calendar' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">{t('calendarTitle')}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}
                  className="rounded border border-slate-700 px-2 py-1"
                  aria-label={t('previousMonth')}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <span className="tabular-nums">{calendarMonth}</span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}
                  className="rounded border border-slate-700 px-2 py-1"
                  aria-label={t('nextMonth')}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label}>{t(`weekday.${label}`)}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells(calendarMonth).map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />
                const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
                const isWorkday = weekdays[weekday]
                const total = scheduleTotals.find((row) => row.date === date)
                return (
                  <div
                    key={date}
                    className={`min-h-[4rem] rounded-md border p-1 text-left ${
                      isWorkday ? 'border-slate-700 bg-slate-800/70' : 'border-transparent bg-slate-950/40 text-gray-600'
                    }`}
                  >
                    <div className="text-[11px] tabular-nums text-gray-400">{Number(date.slice(8))}</div>
                    {(total?.sceneIds ?? []).slice(0, 2).map((sceneId) => (
                      <div key={sceneId} className="truncate text-[10px] text-white">
                        {scope.sceneActuals.find((scene) => scene.sceneId === sceneId)?.title}
                      </div>
                    ))}
                    {total && (
                      <div className="text-[10px] tabular-nums text-cyan-200">
                        {formatCredits(total.cumulativeCredits)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {primaryTab === 'schedule' && scheduleSection === 'status' && (
          <div className="rounded-xl border border-slate-700/60 p-3">
            <h4 className="text-sm font-medium text-white">{t('statusTitle')}</h4>
            {scheduleStatus ? (
              <div className="mt-2 space-y-1 text-sm text-gray-300">
                <p>
                  {t('statusScenes', {
                    finished: scheduleStatus.scenesFinished,
                    planned: scheduleStatus.scenesPlanned,
                  })}{' '}
                  <span className={scheduleStatus.schedulePace === 'behind' ? 'text-amber-300' : 'text-cyan-200'}>
                    {t(`pace.${scheduleStatus.schedulePace}`)}
                  </span>
                </p>
                <p>
                  {t('statusCredits', {
                    used: formatCredits(scheduleStatus.creditsUsed),
                    planned: formatCredits(scheduleStatus.plannedCredits),
                  })}{' '}
                  <span className={scheduleStatus.spendPace === 'over' ? 'text-amber-300' : 'text-cyan-200'}>
                    {t(`spend.${scheduleStatus.spendPace}`)}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">{t('statusEmpty')}</p>
            )}
          </div>
        )}

        {primaryTab === 'budget' && budgetSection === 'breakdown' && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">{t('breakdown')}</h3>
          <div className="space-y-2">
            {[
              {
                key: 'frames',
                icon: ImageIcon,
                label: t('lineFrames', {
                  quality: t(`quality.${frameQuality}`),
                  rate: frameUnit,
                }),
                line: estimate.frames,
              },
              {
                key: 'videos',
                icon: Video,
                label: t('lineVideos', {
                  quality: t(`quality.${videoQuality}`),
                  rate: videoUnit,
                  seconds: scope.segmentDurationSec,
                }),
                line: estimate.videos,
              },
              {
                key: 'topaz',
                icon: Sparkles,
                label: t('lineTopaz'),
                line: estimate.topaz,
              },
              {
                key: 'intelligence',
                icon: Brain,
                label: t('lineIntelligence'),
                line: estimate.intelligence,
              },
            ].map((row) => {
              const Icon = row.icon
              if (row.line.quantity <= 0 && row.line.credits <= 0 && row.key !== 'videos') {
                return null
              }
              return (
                <div
                  key={row.key}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    row.line.excluded
                      ? 'bg-amber-950/20 border border-amber-700/30'
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className={row.line.excluded ? 'line-through text-gray-400' : ''}>
                      {row.label}
                    </span>
                    {row.line.excluded && (
                      <span className="text-[10px] text-amber-300">{t('excludedByok')}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {formatCredits(row.line.credits)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}

        {primaryTab === 'budget' && budgetSection === 'savings' && (
          <div className="space-y-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
            <div className="flex items-start gap-2 text-sm font-medium text-white">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>{t('savingsLead')}</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              {videoOn && <li>{t('savingsPrevis')}</li>}
              {videoQuality === 'final' && (
                <li>{t('savingsFinalWhenPublishing', { gap: formatCredits(finalPremium) })}</li>
              )}
              {videoOn && (videoQuality === 'final' || videoIterations > 1) && (
                <li>{t('savingsTestDraft')}</li>
              )}
              {videoOn && upscaleGap > 0 && (
                <li>
                  {t('savingsUpscale', {
                    upscale: formatCredits(upscaleClipCost),
                    final: formatCredits(finalClipCost),
                    gap: formatCredits(upscaleGap),
                  })}
                </li>
              )}
              {videoOn && upscaleGap < 0 && (
                <li>
                  {t('savingsUpscaleFinalCheaper', {
                    upscale: formatCredits(upscaleClipCost),
                    final: formatCredits(finalClipCost),
                    gap: formatCredits(Math.abs(upscaleGap)),
                  })}
                </li>
              )}
              {videoOn && <li>{t('savingsDub')}</li>}
            </ul>
          </div>
        )}

        {onSetBudget && (
          <button
            type="button"
            disabled={isSaving || !projectId || scope.beats === 0}
            onClick={handleSetBudget}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isSaving
              ? t('saving')
              : t('setAsProjectBudget', {
                  credits: formatCredits(estimate.plannedTotal),
                })}
          </button>
        )}
        {scope.beats === 0 && (
          <p className="text-xs text-amber-300 text-center">{t('noBeatsYet')}</p>
        )}
      </div>
    </div>
  )
}

export default ProductionBudgetManager
