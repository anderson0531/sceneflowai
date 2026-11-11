'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  ExternalLink,
  Film,
  Filter,
  Globe,
  Languages,
  Layers,
  LayoutGrid,
  LayoutList,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Tv,
  Video,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PreVisRenderDialog } from '@/components/vision/PreVisRenderDialog'
import {
  PackageShipDialog,
  type PackageShipTarget,
} from '@/components/publishing/PackageShipDialog'
import { cn } from '@/lib/utils'
import { FinalCutStreamsPanel } from '@/components/final-cut/FinalCutStreamsPanel'
import { StreamLocalizePanel } from '@/components/production/StreamLocalizePanel'
import { buildFinalCutClips, type BuildFinalCutClipsArgs } from '@/lib/final-cut/useFinalCutClips'
import { applyAssemblyPreset } from '@/lib/final-cut/finalCutPresets'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import {
  buildDraftStream,
  isLocalizeEligibleLanguage,
  mergeStreamsWithLanguages,
  resolveStreamCoverage,
  type ProjectStream,
} from '@/lib/streams/projectStreams'
import {
  buildStreamInventory,
  DEFAULT_STREAM_EXPLORER_FILTERS,
  filterStreamDeliverables,
  formatDurationBadge,
  hasActiveStreamFilters,
  type StreamDeliverableItem,
  type StreamDeliverableStatus,
  type StreamExplorerFilters,
  type StreamFormatFilter,
  type StreamStatusFilter,
  type StreamVersionVariant,
} from '@/lib/streams/streamExplorerModel'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { upsertPreVisMaster } from '@/lib/publish/publishingState'
import type { PublishUnitKind } from '@/lib/publish/publishUnits'
import { LANGUAGE_CONFIGS } from '@/lib/types/finalCut'
import type {
  FinalCutAssemblyPresetId,
  FinalCutSelection,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import type {
  ProductionStream,
  SceneProductionData,
} from '@/components/vision/scene-production/types'
import { SCENE_RENDER_APPENDED_EVENT } from '@/lib/projects/appendSceneRenderClient'
import { PREVIS_MASTER_SAVED_EVENT } from '@/lib/projects/savePreVisMasterClient'
import type { PreVisMasterAsset } from '@/types/publishingAssets'

export const OPEN_PACKAGE_SHIP_EVENT = 'sceneflow:open-package-ship'

type ProjectLike = NonNullable<BuildFinalCutClipsArgs['project']>
type StreamsLayoutMode = 'grouped' | 'catalog'

interface QuickPreviewState {
  title: string
  subtitle?: string
  mp4Url: string
  target?: PackageShipTarget
}

export interface ProductionStreamsManagerProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  userId?: string
  streams: ProjectStream[]
  onSaveStreams: (
    streams: ProjectStream[],
    compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }
  ) => Promise<void>
  onSaveMetadata?: (metadata: Record<string, unknown>) => Promise<void>
  onOpenPromo?: () => void
  /** Increment to open Package & Ship when navigating here from external menus/guides. */
  openPackageShipSignal?: number
  onGenerateLanguage: (language: string) => Promise<void>
  onPreviewStream: (language: string) => void
  sceneProductionState: Record<string, SceneProductionData>
  onPersistSceneProduction: (
    sceneId: string,
    updater: (current: SceneProductionData | undefined) => SceneProductionData | undefined
  ) => void
  reloadSceneProduction: () => Promise<Record<string, SceneProductionData>>
}

const DELIVERABLE_TYPE_TABS: Array<{ id: 'all' | PublishUnitKind; label: string }> = [
  { id: 'all', label: 'All Types' },
  { id: 'previs', label: 'Pre-Vis' },
  { id: 'master', label: 'Master' },
  { id: 'promo', label: 'Promo' },
  { id: 'chapter', label: 'Chapters' },
  { id: 'scene', label: 'Scenes' },
]

function renderStatusBadge(status: StreamDeliverableStatus, fallbackLabel?: string) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-200 border-emerald-500/40">
        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-300" />
        Published
      </span>
    )
  }
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border bg-emerald-500/12 text-emerald-200 border-emerald-500/30">
        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
        Ready
      </span>
    )
  }
  if (status === 'stitchable') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border bg-cyan-500/15 text-cyan-200 border-cyan-500/35">
        {fallbackLabel || 'Ready to Stitch'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border bg-zinc-800/80 text-zinc-400 border-zinc-700/60">
      {fallbackLabel || 'Needs Render'}
    </span>
  )
}

function kindBadgeStyle(kind: PublishUnitKind): { label: string; className: string } {
  switch (kind) {
    case 'previs':
      return {
        label: 'Pre-Vis',
        className: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
      }
    case 'master':
      return {
        label: 'Master',
        className: 'bg-violet-500/15 text-violet-200 border-violet-500/30',
      }
    case 'promo':
      return {
        label: 'Promo',
        className: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30',
      }
    case 'chapter':
      return {
        label: 'Chapter',
        className: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      }
    case 'scene':
      return {
        label: 'Scene',
        className: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
      }
  }
}

function toShipTarget(item: StreamDeliverableItem): PackageShipTarget {
  if (item.kind === 'master') {
    return { kind: 'master', language: item.language, aspectRatio: item.aspectRatio }
  }
  if (item.kind === 'promo') {
    return { kind: 'promo', language: item.language, aspectRatio: item.aspectRatio }
  }
  if (item.kind === 'chapter') {
    return {
      kind: 'chapter',
      language: item.language,
      beatIndex: item.beatIndex,
      aspectRatio: item.aspectRatio,
    }
  }
  if (item.kind === 'scene') {
    return {
      kind: 'scene',
      language: item.language,
      sceneId: item.sceneId,
      aspectRatio: item.aspectRatio,
    }
  }
  return { kind: 'previs', language: item.language, aspectRatio: item.aspectRatio }
}

interface SceneDeliverableRowProps {
  item: StreamDeliverableItem
  showLanguageBadge?: boolean
  onPreview: (preview: QuickPreviewState) => void
  onPublish: (target: PackageShipTarget) => void
}

function SceneDeliverableRow({
  item,
  showLanguageBadge = false,
  onPreview,
  onPublish,
}: SceneDeliverableRowProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    item.versionVariants[0]?.id || ''
  )

  useEffect(() => {
    if (
      item.versionVariants.length > 0 &&
      !item.versionVariants.some((v) => v.id === selectedVariantId)
    ) {
      setSelectedVariantId(item.versionVariants[0].id)
    }
  }, [item.versionVariants, selectedVariantId])

  const activeVariant: StreamVersionVariant | undefined = useMemo(() => {
    if (item.versionVariants.length <= 1) return item.versionVariants[0]
    return (
      item.versionVariants.find((v) => v.id === selectedVariantId) || item.versionVariants[0]
    )
  }, [item.versionVariants, selectedVariantId])

  const effectiveMp4 = activeVariant?.mp4Url || item.mp4Url
  const effectiveDuration = formatDurationBadge(activeVariant?.durationSec ?? item.durationSec)
  const effectiveFormat = activeVariant?.streamType || item.format
  const effectiveVersion = activeVariant?.version ?? item.version

  return (
    <div className="flex items-center justify-between gap-2.5 rounded-lg border border-zinc-800/85 bg-zinc-900/50 hover:border-zinc-700/90 px-3 py-2 transition-colors">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showLanguageBadge ? (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
              {item.language}
            </span>
          ) : null}
          <p className="text-xs font-medium text-zinc-100 truncate">{item.title}</p>
          {item.canPublish ? (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                effectiveFormat === 'animatic'
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
                  : 'bg-violet-500/10 text-violet-300 border-violet-500/25'
              )}
            >
              {effectiveFormat === 'animatic' ? 'Pre-Vis' : 'Video'} v{effectiveVersion}
            </span>
          ) : null}
          {effectiveDuration ? (
            <span className="text-[10px] text-zinc-400 font-mono">{effectiveDuration}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-500">
          <span>{item.canPublish ? `Scene ${item.sceneNumber ?? ''}` : 'Not rendered'}</span>
          {item.publishedLinks.map((link) => (
            <a
              key={`${link.platform}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-emerald-400 hover:underline capitalize"
            >
              {link.platform} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item.versionVariants.length > 1 ? (
          <select
            aria-label="Select scene stream version"
            value={activeVariant?.id || ''}
            onChange={(e) => setSelectedVariantId(e.target.value)}
            className="h-7 rounded border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-200"
          >
            {item.versionVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.streamType === 'animatic' ? 'Pre-Vis' : 'Video'} v{variant.version}
                {variant.resolution ? ` (${variant.resolution})` : ''}
              </option>
            ))}
          </select>
        ) : null}

        {effectiveMp4 ? (
          <Button
            size="sm"
            variant="outline"
            title="Preview stream"
            onClick={() =>
              onPreview({
                title: item.title,
                subtitle: `${item.languageLabel} · ${
                  effectiveFormat === 'animatic' ? 'Pre-Vis' : 'AI Video'
                } v${effectiveVersion}`,
                mp4Url: effectiveMp4,
                target: { kind: 'scene', language: item.language, sceneId: item.sceneId },
              })
            }
            className="h-7 w-7 p-0 border-zinc-700 text-zinc-300 hover:text-white"
          >
            <Play className="h-3 w-3" />
          </Button>
        ) : null}

        <Button
          size="sm"
          disabled={!item.canPublish}
          onClick={() =>
            onPublish({
              kind: 'scene',
              language: item.language,
              sceneId: item.sceneId,
            })
          }
          className="h-7 px-2.5 text-[11px] bg-sf-primary hover:bg-sf-accent text-white shrink-0"
        >
          Publish
        </Button>
      </div>
    </div>
  )
}

interface StreamCardProps {
  stream: ProjectStream
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  itemsForLanguage: StreamDeliverableItem[]
  totalLanguageReadyCount: number
  totalLanguagePublishedCount: number
  previsSceneProgress: { ready: number; total: number }
  hasActiveFilters: boolean
  autoExpandSubsections: boolean
  defaultCardCollapsed?: boolean
  onSaveStreams: ProductionStreamsManagerProps['onSaveStreams']
  onPreviewStream: (language: string) => void
  onQuickPreview: (preview: QuickPreviewState) => void
  onOpenPreVisRender: (language: string, combine?: boolean) => void
  onOpenPackageShip: (target: PackageShipTarget) => void
  onOpenPromo?: () => void
  allStreams: ProjectStream[]
  sceneProductionState: Record<string, SceneProductionData>
  onPersistSceneProduction: ProductionStreamsManagerProps['onPersistSceneProduction']
  reloadSceneProduction: ProductionStreamsManagerProps['reloadSceneProduction']
}

function StreamCard({
  stream,
  projectId,
  projectTitle,
  metadata,
  script,
  itemsForLanguage,
  totalLanguageReadyCount,
  totalLanguagePublishedCount,
  previsSceneProgress,
  hasActiveFilters,
  autoExpandSubsections,
  defaultCardCollapsed = false,
  onSaveStreams,
  onPreviewStream,
  onQuickPreview,
  onOpenPreVisRender,
  onOpenPackageShip,
  onOpenPromo,
  allStreams,
  sceneProductionState,
  onPersistSceneProduction,
  reloadSceneProduction,
}: StreamCardProps) {
  const [cardCollapsed, setCardCollapsed] = useState(defaultCardCollapsed)
  const [assembleExpanded, setAssembleExpanded] = useState(false)
  const [scenesChaptersOpen, setScenesChaptersOpen] = useState(false)
  const [localizeOpen, setLocalizeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastRenderUrl, setLastRenderUrl] = useState<string | null>(stream.mp4Url ?? null)

  const projectLike = useMemo<ProjectLike>(
    () =>
      ({
        id: projectId,
        metadata,
        script:
          (script as { script?: { scenes?: unknown } } | undefined)?.script ??
          (script as { scenes?: unknown } | undefined),
      }) as ProjectLike,
    [projectId, metadata, script]
  )

  const selection = useMemo<FinalCutSelection>(() => {
    const snapshot = stream.finalCutSnapshot
    if (snapshot?.format && snapshot?.language) return snapshot
    return {
      format: stream.format,
      language: stream.language as ProductionLanguage,
      presetId: stream.format === 'animatic' ? 'all-animatic' : 'all-video',
      perSceneOverrides: {},
    }
  }, [stream])

  const [localSelection, setLocalSelection] = useState<FinalCutSelection>(selection)

  const clips = useMemo(
    () => buildFinalCutClips({ project: projectLike, selection: localSelection }),
    [projectLike, localSelection]
  )

  const availableLanguages = useMemo(() => {
    const sceneState = getSceneProductionStateFromMetadata(metadata)
    return getAvailableLanguagesForFormat(sceneState, localSelection.format)
  }, [metadata, localSelection.format])

  const coverage = useMemo(
    () =>
      resolveStreamCoverage(
        projectLike,
        stream.language,
        localSelection.format,
        localSelection
      ),
    [projectLike, stream.language, localSelection]
  )

  const sceneIds = useMemo(() => clips.map((c) => c.sceneId), [clips])

  const primaryItems = useMemo(
    () =>
      itemsForLanguage.filter(
        (i) => i.kind === 'previs' || i.kind === 'master' || i.kind === 'promo'
      ),
    [itemsForLanguage]
  )
  const chapterItems = useMemo(
    () => itemsForLanguage.filter((i) => i.kind === 'chapter'),
    [itemsForLanguage]
  )
  const sceneItems = useMemo(
    () => itemsForLanguage.filter((i) => i.kind === 'scene'),
    [itemsForLanguage]
  )

  const persistStream = useCallback(
    async (
      next: ProjectStream,
      compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }
    ) => {
      setSaving(true)
      try {
        const updated = allStreams.map((s) =>
          s.language === next.language ? next : s
        )
        if (!updated.some((s) => s.language === next.language)) {
          updated.push(next)
        }
        await onSaveStreams(updated, compat)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save stream'
        toast.error(message)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [allStreams, onSaveStreams]
  )

  const handleApplyPreset = useCallback(
    (presetId: FinalCutAssemblyPresetId) => {
      const next = applyAssemblyPreset({
        presetId,
        sceneIds,
        metadata,
        baselineLanguage: stream.language as ProductionLanguage,
      })
      setLocalSelection(next)
      void persistStream({
        ...stream,
        format: next.format,
        finalCutSnapshot: next,
      })
    },
    [sceneIds, metadata, stream, persistStream]
  )

  const handleChangeSceneOverride = useCallback(
    (
      sceneId: string,
      patch: {
        streamType?: 'animatic' | 'video' | null
        language?: ProductionLanguage | null
        streamVersion?: number | null
      }
    ) => {
      const overrides = { ...(localSelection.perSceneOverrides || {}) }
      if (
        patch.streamType == null &&
        patch.language == null &&
        patch.streamVersion == null
      ) {
        delete overrides[sceneId]
      } else {
        const existing = overrides[sceneId] || {}
        const nextOverride = { ...existing }
        if (patch.streamType != null) nextOverride.streamType = patch.streamType
        if (patch.language != null) nextOverride.language = patch.language
        if (patch.streamVersion != null) nextOverride.streamVersion = patch.streamVersion
        overrides[sceneId] = nextOverride
      }
      const next: FinalCutSelection = {
        ...localSelection,
        presetId: 'custom',
        perSceneOverrides: overrides,
      }
      setLocalSelection(next)
      void persistStream({
        ...stream,
        format: next.format,
        finalCutSnapshot: next,
      })
    },
    [localSelection, stream, persistStream]
  )

  const handleRendered = useCallback(
    async (url: string) => {
      setLastRenderUrl(url)
      const renderedAt = new Date().toISOString()
      const next: ProjectStream = {
        ...stream,
        status: 'ready',
        mp4Url: url,
        renderedAt,
        format: localSelection.format,
        finalCutSnapshot: localSelection,
      }
      const compat =
        localSelection.format === 'animatic'
          ? { exportedAnimaticUrl: url }
          : { exportedVideoUrl: url }
      await persistStream(next, compat)
      toast.success(`${getLanguageDisplayName(stream.language)} master render complete`)
    },
    [stream, localSelection, persistStream]
  )

  // Hide empty language cards while filtering unless an editing drawer is open
  if (
    hasActiveFilters &&
    itemsForLanguage.length === 0 &&
    !assembleExpanded &&
    !localizeOpen
  ) {
    return null
  }

  const effectiveCollapsed = cardCollapsed && !hasActiveFilters && !assembleExpanded && !localizeOpen
  const effectiveScenesOpen = scenesChaptersOpen || autoExpandSubsections
  const readyChaptersInView = chapterItems.filter((c) => c.canPublish).length
  const readyScenesInView = sceneItems.filter((s) => s.canPublish).length

  return (
    <div className="rounded-xl border border-zinc-800/85 bg-zinc-950/60 backdrop-blur-md overflow-hidden shadow-sm">
      {/* Language Stream Header */}
      <div className="px-4 py-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setCardCollapsed((v) => !v)}
            className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 flex items-center justify-center shrink-0 transition-colors"
            title={effectiveCollapsed ? 'Expand language stream' : 'Collapse language stream'}
          >
            {effectiveCollapsed ? (
              <ChevronRight className="w-4 h-4 text-violet-300" />
            ) : (
              <Globe className="w-4 h-4 text-violet-300" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCardCollapsed((v) => !v)}
                className="text-sm font-semibold text-white hover:text-violet-200 transition-colors"
              >
                {getLanguageDisplayName(stream.language)}
              </button>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                {stream.language}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 font-medium">
                {totalLanguageReadyCount} ready
              </span>
              {totalLanguagePublishedCount > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/15 text-violet-200 font-medium">
                  {totalLanguagePublishedCount} published
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
              <span>
                Pre-Vis{' '}
                <strong className="text-zinc-200 font-medium">
                  {previsSceneProgress.ready}/{previsSceneProgress.total}
                </strong>{' '}
                scenes
              </span>
              <span className="text-zinc-700">·</span>
              <span>
                Master{' '}
                <strong className="text-zinc-200 font-medium">
                  {coverage.ready}/{coverage.total}
                </strong>{' '}
                scenes
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-cyan-500/40 bg-cyan-950/35 text-cyan-200 hover:bg-cyan-900/50"
            onClick={() => onOpenPreVisRender(stream.language, true)}
          >
            <Clapperboard className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
            Render Pre-Vis
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'h-8 text-xs border-zinc-700 text-zinc-200',
              assembleExpanded && 'border-violet-500/50 bg-violet-950/30 text-violet-200'
            )}
            onClick={() => {
              setCardCollapsed(false)
              setAssembleExpanded((v) => !v)
            }}
          >
            <Film className="w-3.5 h-3.5 mr-1.5" />
            Assemble Master
            {assembleExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>
          {isLocalizeEligibleLanguage(stream.language) ? (
            <Button
              size="sm"
              variant="outline"
              className={cn(
                'h-8 text-xs border-zinc-700 text-zinc-200',
                localizeOpen && 'border-violet-500/50 bg-violet-950/30 text-violet-200'
              )}
              onClick={() => {
                setCardCollapsed(false)
                setLocalizeOpen((v) => !v)
              }}
            >
              <Languages className="w-3.5 h-3.5 mr-1.5" />
              Localize
              {localizeOpen ? (
                <ChevronUp className="w-3.5 h-3.5 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              )}
            </Button>
          ) : null}
          {stream.status === 'ready' && stream.mp4Url ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-zinc-700 text-zinc-200"
              onClick={() => onPreviewStream(stream.language)}
            >
              <Tv className="w-3.5 h-3.5 mr-1.5" />
              Screening
            </Button>
          ) : null}
        </div>
      </div>

      {/* Deliverables Shelf */}
      {!effectiveCollapsed ? (
        <div className="border-t border-zinc-800/70 bg-zinc-900/20 px-4 py-3.5 sm:px-5 space-y-3">
          {/* Primary Deliverables: Pre-Vis (Stitched) · Master · Promo */}
          {primaryItems.length > 0 ? (
            <div
              className={cn(
                'grid grid-cols-1 gap-2.5',
                primaryItems.length === 1
                  ? 'md:grid-cols-1'
                  : primaryItems.length === 2
                    ? 'md:grid-cols-2'
                    : 'md:grid-cols-3'
              )}
            >
              {primaryItems.map((item) => {
                const dur = formatDurationBadge(item.durationSec)
                const shipTarget =
                  item.kind === 'master'
                    ? { kind: 'master' as const, language: stream.language }
                    : item.kind === 'promo'
                      ? { kind: 'promo' as const, language: stream.language }
                      : { kind: 'previs' as const, language: stream.language }

                return (
                  <div
                    key={item.uid}
                    className="rounded-lg border border-zinc-800/90 bg-zinc-950/75 hover:border-zinc-700/80 p-3 flex items-center justify-between gap-2.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white truncate">
                          {item.title || (item.kind === 'previs' ? 'Pre-Vis (Stitched)' : '')}
                        </span>
                        {renderStatusBadge(
                          item.status,
                          item.status === 'stitchable' ? 'Ready to Stitch' : item.kind === 'promo' ? 'Draft' : 'Not rendered'
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-400">
                        <span className="truncate">{item.subtitle}</span>
                        {dur ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {dur}
                          </span>
                        ) : null}
                        {item.aspectRatio ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {item.aspectRatio}
                          </span>
                        ) : null}
                      </div>
                      {item.publishedLinks.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {item.publishedLinks.map((link) => (
                            <a
                              key={`${link.platform}-${link.url}`}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline capitalize"
                            >
                              {link.platform} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.mp4Url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          title={`Preview ${item.title}`}
                          onClick={() =>
                            onQuickPreview({
                              title: `${item.title} · ${item.languageLabel}`,
                              subtitle: item.subtitle,
                              mp4Url: item.mp4Url!,
                              target: shipTarget,
                            })
                          }
                          className="h-8 w-8 p-0 border-zinc-700 text-zinc-300 hover:text-white"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}

                      {item.kind === 'promo' && !item.canPublish && onOpenPromo ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onOpenPromo}
                          className="h-8 text-xs border-fuchsia-500/35 text-fuchsia-200 hover:bg-fuchsia-500/10"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-fuchsia-400" />
                          Build Promo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!item.canPublish}
                          onClick={() => onOpenPackageShip(shipTarget)}
                          className="h-8 text-xs bg-sf-primary hover:bg-sf-accent text-white"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Scenes & Chapters Expandable Drawer */}
          {chapterItems.length > 0 || sceneItems.length > 0 ? (
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/45 overflow-hidden">
              <button
                type="button"
                onClick={() => setScenesChaptersOpen((v) => !v)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-zinc-300 hover:text-white hover:bg-zinc-900/40 transition-colors"
              >
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-zinc-100">Scenes &amp; Chapters</span>
                  {sceneItems.length > 0 ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {readyScenesInView}/{sceneItems.length} scene
                      {sceneItems.length === 1 ? '' : 's'} ready
                    </span>
                  ) : null}
                  {chapterItems.length > 0 ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {readyChaptersInView}/{chapterItems.length} chapter
                      {chapterItems.length === 1 ? '' : 's'} ready
                    </span>
                  ) : null}
                </span>
                {effectiveScenesOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                )}
              </button>

              {effectiveScenesOpen ? (
                <div className="border-t border-zinc-800/75 p-3 space-y-3.5">
                  {chapterItems.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Chapters ({getLanguageDisplayName(stream.language)})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {chapterItems.map((chapter) => {
                          const dur = formatDurationBadge(chapter.durationSec)
                          return (
                            <div
                              key={chapter.uid}
                              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/85 bg-zinc-900/50 px-3 py-2"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium text-zinc-100 truncate">
                                    {chapter.title}
                                  </p>
                                  {dur ? (
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      {dur}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-500">
                                  <span>{chapter.subtitle}</span>
                                  {chapter.publishedLinks.map((link) => (
                                    <a
                                      key={`${link.platform}-${link.url}`}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-emerald-400 hover:underline capitalize"
                                    >
                                      {link.platform} <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {chapter.mp4Url ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      onQuickPreview({
                                        title: `${chapter.title} · ${chapter.languageLabel}`,
                                        subtitle: chapter.subtitle,
                                        mp4Url: chapter.mp4Url!,
                                        target: {
                                          kind: 'chapter',
                                          language: stream.language,
                                          beatIndex: chapter.beatIndex,
                                        },
                                      })
                                    }
                                    className="h-7 w-7 p-0 border-zinc-700 text-zinc-300"
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  disabled={!chapter.canPublish}
                                  onClick={() =>
                                    onOpenPackageShip({
                                      kind: 'chapter',
                                      language: stream.language,
                                      beatIndex: chapter.beatIndex,
                                    })
                                  }
                                  className="h-7 px-2.5 text-[11px] bg-sf-primary hover:bg-sf-accent text-white"
                                >
                                  Publish
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {sceneItems.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        Scenes ({getLanguageDisplayName(stream.language)})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {sceneItems.map((scene) => (
                          <SceneDeliverableRow
                            key={scene.uid}
                            item={scene}
                            onPreview={onQuickPreview}
                            onPublish={onOpenPackageShip}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {assembleExpanded ? (
        <div className="border-t border-zinc-800/80">
          <FinalCutStreamsPanel
            selection={localSelection}
            clips={clips}
            availableLanguages={availableLanguages}
            disabled={saving}
            embeddedInSection
            suppressOuterTitle
            onApplyPreset={handleApplyPreset}
            onChangeSceneOverride={handleChangeSceneOverride}
            productionHref={`/dashboard/workflow/vision/${projectId}`}
            projectId={projectId}
            renderButtonProps={{
              projectId,
              filenameLabel: `${projectTitle || projectId}-${stream.language}`,
              onRendered: handleRendered,
              lastRenderUrl: lastRenderUrl ?? stream.mp4Url ?? undefined,
            }}
          />
        </div>
      ) : null}

      {localizeOpen && isLocalizeEligibleLanguage(stream.language) ? (
        <div className="border-t border-zinc-800/80 px-4 py-4 sm:px-5 sm:py-5">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-white">Localize Video</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Each shot uses the Mixer choice for this language — dub, lip-sync, or regenerate —
              then stitch a localized master.
            </p>
          </div>
          <StreamLocalizePanel
            projectId={projectId}
            projectTitle={projectTitle}
            script={script}
            metadata={metadata}
            stream={stream}
            allStreams={allStreams}
            sceneProductionState={sceneProductionState}
            finalCutSelection={localSelection}
            onSaveStreams={onSaveStreams}
            onPersistSceneProduction={onPersistSceneProduction}
            reloadSceneProduction={reloadSceneProduction}
          />
        </div>
      ) : null}
    </div>
  )
}

export function ProductionStreamsManager({
  projectId,
  projectTitle,
  metadata,
  script,
  userId,
  streams,
  onSaveStreams,
  onSaveMetadata,
  onOpenPromo,
  openPackageShipSignal = 0,
  onGenerateLanguage,
  onPreviewStream,
  sceneProductionState,
  onPersistSceneProduction,
  reloadSceneProduction,
}: ProductionStreamsManagerProps) {
  const [addLanguageOpen, setAddLanguageOpen] = useState(false)
  const [selectedNewLanguage, setSelectedNewLanguage] = useState<string>('es')
  const [addingLanguage, setAddingLanguage] = useState(false)
  const [preVisDialogOpen, setPreVisDialogOpen] = useState(false)
  const [preVisDialogLanguage, setPreVisDialogLanguage] = useState<string>('en')
  const [preVisCombineDefault, setPreVisCombineDefault] = useState<boolean>(true)
  const [packageShipOpen, setPackageShipOpen] = useState(false)
  const [packageShipTarget, setPackageShipTarget] = useState<PackageShipTarget | null>(null)
  const [quickPreview, setQuickPreview] = useState<QuickPreviewState | null>(null)
  const [filters, setFilters] = useState<StreamExplorerFilters>(DEFAULT_STREAM_EXPLORER_FILTERS)
  const [layoutMode, setLayoutMode] = useState<StreamsLayoutMode>('grouped')

  const lastHandledShipSignalRef = useRef(0)
  const [liveSceneStreams, setLiveSceneStreams] = useState<Record<string, ProductionStream[]>>({})
  const [livePreVisMasters, setLivePreVisMasters] = useState<Record<string, PreVisMasterAsset>>({})

  useEffect(() => {
    if (openPackageShipSignal > lastHandledShipSignalRef.current) {
      lastHandledShipSignalRef.current = openPackageShipSignal
      setPackageShipTarget(null)
      setPackageShipOpen(true)
    }
  }, [openPackageShipSignal])

  // Listen to live scene & stitched Pre-Vis renders + external Package & Ship open events
  useEffect(() => {
    const onSceneAppended = (evt: Event) => {
      const detail = (evt as CustomEvent<{ sceneId?: string; stream?: ProductionStream }>).detail
      if (!detail?.sceneId || !detail.stream) return
      setLiveSceneStreams((prev) => ({
        ...prev,
        [detail.sceneId!]: [...(prev[detail.sceneId!] || []), detail.stream!],
      }))
    }
    const onPreVisSaved = (evt: Event) => {
      const detail = (evt as CustomEvent<{ projectId?: string; asset?: PreVisMasterAsset }>).detail
      if (!detail?.asset?.language || !detail.asset.mp4Url) return
      if (detail.projectId && detail.projectId !== projectId) return
      setLivePreVisMasters((prev) => ({
        ...prev,
        [detail.asset!.language]: detail.asset!,
      }))
    }
    const onOpenShipEvent = (evt: Event) => {
      const detail = (evt as CustomEvent<PackageShipTarget | undefined>).detail
      if (detail?.kind) {
        setPackageShipTarget(detail)
      }
      setPackageShipOpen(true)
    }
    window.addEventListener(SCENE_RENDER_APPENDED_EVENT, onSceneAppended)
    window.addEventListener(PREVIS_MASTER_SAVED_EVENT, onPreVisSaved)
    window.addEventListener(OPEN_PACKAGE_SHIP_EVENT, onOpenShipEvent)
    return () => {
      window.removeEventListener(SCENE_RENDER_APPENDED_EVENT, onSceneAppended)
      window.removeEventListener(PREVIS_MASTER_SAVED_EVENT, onPreVisSaved)
      window.removeEventListener(OPEN_PACKAGE_SHIP_EVENT, onOpenShipEvent)
    }
  }, [projectId])

  // Re-open Package & Ship automatically if returning from OAuth redirect with ?shipKind=...
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const shipKind = url.searchParams.get('shipKind') as PublishUnitKind | null
    if (!shipKind) return
    const shipLang = url.searchParams.get('shipLang') || 'en'
    const shipSceneId = url.searchParams.get('shipSceneId') || undefined
    const shipBeatRaw = url.searchParams.get('shipBeatIndex')
    const shipBeatIndex =
      shipBeatRaw != null && shipBeatRaw !== '' && Number.isFinite(Number(shipBeatRaw))
        ? Number(shipBeatRaw)
        : undefined

    setPackageShipTarget({
      kind: shipKind,
      language: shipLang,
      sceneId: shipSceneId,
      beatIndex: shipBeatIndex,
    })
    setPackageShipOpen(true)

    url.searchParams.delete('shipKind')
    url.searchParams.delete('shipLang')
    url.searchParams.delete('shipSceneId')
    url.searchParams.delete('shipBeatIndex')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const mergedSceneProductionState = useMemo(() => {
    const next: Record<string, SceneProductionData> = { ...sceneProductionState }
    for (const [sid, list] of Object.entries(liveSceneStreams)) {
      const existing = next[sid]?.productionStreams || []
      const map = new Map<string, ProductionStream>()
      for (const s of existing) {
        if (s?.id) map.set(s.id, s)
      }
      for (const s of list) {
        if (s?.id) map.set(s.id, s)
      }
      next[sid] = {
        ...(next[sid] || {}),
        productionStreams: Array.from(map.values()),
      } as SceneProductionData
    }
    return next
  }, [sceneProductionState, liveSceneStreams])

  const effectiveMetadata = useMemo(() => {
    const baseMeta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<
      string,
      unknown
    >
    const vp = (
      baseMeta.visionPhase && typeof baseMeta.visionPhase === 'object'
        ? baseMeta.visionPhase
        : {}
    ) as Record<string, unknown>
    const prod = (
      vp.production && typeof vp.production === 'object' ? vp.production : {}
    ) as Record<string, unknown>
    const metaScenes = (
      prod.scenes && typeof prod.scenes === 'object' ? prod.scenes : {}
    ) as Record<string, unknown>
    let combined: Record<string, unknown> = {
      ...baseMeta,
      visionPhase: {
        ...vp,
        production: {
          ...prod,
          scenes: {
            ...metaScenes,
            ...mergedSceneProductionState,
          },
        },
      },
    }
    for (const [lang, asset] of Object.entries(livePreVisMasters)) {
      combined = upsertPreVisMaster(combined, lang, asset)
    }
    return combined
  }, [metadata, mergedSceneProductionState, livePreVisMasters])

  const projectScenes = useMemo<Array<Record<string, unknown>>>(() => {
    const rawScript = script as
      | { script?: { scenes?: unknown }; scenes?: unknown }
      | undefined
    const fromScript = rawScript?.script?.scenes ?? rawScript?.scenes
    if (Array.isArray(fromScript) && fromScript.length > 0) {
      return fromScript as Array<Record<string, unknown>>
    }
    const vp = (
      effectiveMetadata as {
        visionPhase?: {
          script?: { script?: { scenes?: unknown }; scenes?: unknown }
          scenes?: unknown
        }
      }
    )?.visionPhase
    const fromMeta = vp?.script?.script?.scenes ?? vp?.script?.scenes ?? vp?.scenes
    return Array.isArray(fromMeta) ? (fromMeta as Array<Record<string, unknown>>) : []
  }, [script, effectiveMetadata])

  const projectLike = useMemo<ProjectLike>(
    () =>
      ({
        id: projectId,
        metadata: effectiveMetadata,
        script:
          (script as { script?: { scenes?: unknown } } | undefined)?.script ??
          (script as { scenes?: unknown } | undefined),
      }) as ProjectLike,
    [projectId, effectiveMetadata, script]
  )

  const mergedStreams = useMemo(
    () => mergeStreamsWithLanguages(effectiveMetadata, projectLike),
    [effectiveMetadata, projectLike]
  )

  const displayStreams = streams.length > 0 ? streams : mergedStreams

  const coverageByLanguage = useMemo(() => {
    const map: Record<string, { ready: number; total: number }> = {}
    for (const s of displayStreams) {
      const cov = resolveStreamCoverage(
        projectLike,
        s.language,
        s.finalCutSnapshot?.format || s.format,
        s.finalCutSnapshot
      )
      map[s.language] = { ready: cov.ready, total: cov.total }
    }
    return map
  }, [displayStreams, projectLike])

  const { items: allInventoryItems, summary } = useMemo(
    () =>
      buildStreamInventory({
        streams: displayStreams,
        projectScenes,
        sceneProductionState: mergedSceneProductionState,
        metadata: effectiveMetadata,
        coverageByLanguage,
      }),
    [displayStreams, projectScenes, mergedSceneProductionState, effectiveMetadata, coverageByLanguage]
  )

  const filteredItems = useMemo(
    () => filterStreamDeliverables(allInventoryItems, filters),
    [allInventoryItems, filters]
  )

  const filteredByLanguage = useMemo(() => {
    const grouped: Record<string, StreamDeliverableItem[]> = {}
    for (const item of filteredItems) {
      if (!grouped[item.language]) grouped[item.language] = []
      grouped[item.language].push(item)
    }
    return grouped
  }, [filteredItems])

  const previsProgressByLanguage = useMemo(() => {
    const map: Record<string, { ready: number; total: number }> = {}
    for (const s of displayStreams) {
      const sceneTakes = allInventoryItems.filter(
        (i) => i.language === s.language && i.kind === 'scene' && i.isLatestVersion
      )
      const readyAnimatics = sceneTakes.filter((i) =>
        i.versionVariants.some((v) => v.streamType === 'animatic')
      ).length
      map[s.language] = { ready: readyAnimatics, total: projectScenes.length }
    }
    return map
  }, [displayStreams, allInventoryItems, projectScenes.length])

  const isFiltering = hasActiveStreamFilters(filters)
  const autoExpandSubsections =
    filters.type === 'scene' ||
    filters.type === 'chapter' ||
    filters.version !== 'latest' ||
    filters.search.trim().length > 0

  const toggleTypeCard = useCallback((kind: 'all' | PublishUnitKind) => {
    setFilters((prev) => ({
      ...prev,
      type: prev.type === kind && kind !== 'all' ? 'all' : kind,
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_STREAM_EXPLORER_FILTERS)
  }, [])

  const handleOpenPreVisRender = useCallback((lang = 'en', combine = true) => {
    setPreVisDialogLanguage(lang)
    setPreVisCombineDefault(combine)
    setPreVisDialogOpen(true)
  }, [])

  const handleOpenPackageShip = useCallback((target: PackageShipTarget | null) => {
    setPackageShipTarget(target)
    setPackageShipOpen(true)
  }, [])

  const existingLanguages = useMemo(
    () => new Set(displayStreams.map((s) => s.language)),
    [displayStreams]
  )

  const addableLanguages = useMemo(
    () =>
      Object.keys(LANGUAGE_CONFIGS)
        .filter((code) => !existingLanguages.has(code))
        .sort((a, b) =>
          getLanguageDisplayName(a).localeCompare(getLanguageDisplayName(b))
        ),
    [existingLanguages]
  )

  const handleAddLanguage = useCallback(async () => {
    if (!selectedNewLanguage) return
    setAddingLanguage(true)
    try {
      const draft = buildDraftStream(selectedNewLanguage)
      await onSaveStreams([...displayStreams, draft])
      await onGenerateLanguage(selectedNewLanguage)
      toast.success(`Generating ${getLanguageDisplayName(selectedNewLanguage)} dialogue stream…`)
      setAddLanguageOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add language'
      toast.error(message)
    } finally {
      setAddingLanguage(false)
    }
  }, [selectedNewLanguage, displayStreams, onSaveStreams, onGenerateLanguage])

  const visibleStreams = useMemo(
    () =>
      filters.language === 'all'
        ? displayStreams
        : displayStreams.filter((s) => s.language === filters.language),
    [displayStreams, filters.language]
  )

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      {/* Scrollable Workspace Container (Dashboard + Sticky-Friendly Filter Bar + Stream List) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-8 space-y-4">
        {/* 1. Title & Primary Studio Actions */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-0.5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Layers className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Production Streams</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                {summary.totalReadyAssets} ready
                {summary.totalPublishedAssets > 0
                  ? ` · ${summary.totalPublishedAssets} published`
                  : ''}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Explore, filter, preview, and publish every deliverable — Pre-Vis, Scenes, Chapters,
              Master, and Promos — across all language streams and take versions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {projectScenes.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
                onClick={() =>
                  handleOpenPreVisRender(
                    filters.language !== 'all'
                      ? filters.language
                      : displayStreams[0]?.language || 'en',
                    true
                  )
                }
              >
                <Clapperboard className="w-4 h-4 mr-1.5 text-cyan-300" />
                Render &amp; Stitch Pre-Vis
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-200"
              disabled={addableLanguages.length === 0}
              onClick={() => setAddLanguageOpen((v) => !v)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Language
            </Button>
          </div>
        </div>

        {addLanguageOpen ? (
          <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/60 p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                Language Stream
              </label>
              <select
                value={selectedNewLanguage}
                onChange={(e) => setSelectedNewLanguage(e.target.value)}
                className="bg-zinc-950 text-zinc-200 text-sm rounded-md px-3 py-2 border border-zinc-700"
              >
                {addableLanguages.map((code) => (
                  <option key={code} value={code}>
                    {getLanguageDisplayName(code)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              className="bg-sf-primary hover:bg-sf-accent text-white"
              disabled={addingLanguage}
              onClick={() => void handleAddLanguage()}
            >
              {addingLanguage ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              Generate Stream
            </Button>
          </div>
        ) : null}

        {/* 2. Interactive Header Inventory Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {/* Card 1: All / Languages Overview */}
          <button
            type="button"
            onClick={() => toggleTypeCard('all')}
            className={cn(
              'text-left rounded-xl border p-3 transition-all',
              filters.type === 'all'
                ? 'border-violet-500/50 bg-violet-950/25 shadow-sm'
                : 'border-zinc-800/85 bg-zinc-950/60 hover:border-zinc-700'
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Languages</span>
              <Globe className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{summary.languageCount}</span>
              <span className="text-[11px] text-zinc-400">
                stream{summary.languageCount === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 truncate">
              {summary.languages.map((l) => l.code.toUpperCase()).join(' · ') || 'None'}
            </p>
          </button>

          {/* Card 2: Pre-Vis */}
          <button
            type="button"
            onClick={() => toggleTypeCard('previs')}
            className={cn(
              'text-left rounded-xl border p-3 transition-all',
              filters.type === 'previs'
                ? 'border-cyan-500/55 bg-cyan-950/25 shadow-sm'
                : 'border-zinc-800/85 bg-zinc-950/60 hover:border-zinc-700'
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Pre-Vis</span>
              <Clapperboard className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">
                {summary.previs.stitchedReady + summary.previs.stitchableCount}
              </span>
              <span className="text-[11px] text-zinc-400">
                /{summary.previs.totalLanguages} ready
              </span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 truncate">
              {summary.previs.sceneRendersReady} scene Pre-Vis render
              {summary.previs.sceneRendersReady === 1 ? '' : 's'}
            </p>
          </button>

          {/* Card 3: Masters */}
          <button
            type="button"
            onClick={() => toggleTypeCard('master')}
            className={cn(
              'text-left rounded-xl border p-3 transition-all',
              filters.type === 'master'
                ? 'border-violet-500/55 bg-violet-950/25 shadow-sm'
                : 'border-zinc-800/85 bg-zinc-950/60 hover:border-zinc-700'
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Masters</span>
              <Film className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{summary.masters.ready}</span>
              <span className="text-[11px] text-zinc-400">
                /{summary.masters.totalLanguages} assembled
              </span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 truncate">
              Full-film language cuts
            </p>
          </button>

          {/* Card 4: Promos */}
          <button
            type="button"
            onClick={() => toggleTypeCard('promo')}
            className={cn(
              'text-left rounded-xl border p-3 transition-all',
              filters.type === 'promo'
                ? 'border-fuchsia-500/55 bg-fuchsia-950/25 shadow-sm'
                : 'border-zinc-800/85 bg-zinc-950/60 hover:border-zinc-700'
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Promos</span>
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{summary.promos.ready}</span>
              <span className="text-[11px] text-zinc-400">ready</span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 truncate">
              {summary.promos.campaignsCount > 0
                ? `${summary.promos.campaignsCount} campaign${summary.promos.campaignsCount === 1 ? '' : 's'}`
                : 'Trailer & social cuts'}
            </p>
          </button>

          {/* Card 5: Chapters */}
          <button
            type="button"
            onClick={() => toggleTypeCard('chapter')}
            className={cn(
              'text-left rounded-xl border p-3 transition-all',
              filters.type === 'chapter'
                ? 'border-amber-500/55 bg-amber-950/25 shadow-sm'
                : 'border-zinc-800/85 bg-zinc-950/60 hover:border-zinc-700'
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Chapters</span>
              <Layers className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{summary.chapters.ready}</span>
              <span className="text-[11px] text-zinc-400">/{summary.chapters.total} ready</span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 truncate">
              Blueprint beat sequences
            </p>
          </button>

          {/* Card 6: Scenes & Versions */}
          <button
            type="button"
            onClick={() => toggleTypeCard('scene')}
            className={cn(
              'text-left rounded-xl border p-3 transition-all',
              filters.type === 'scene'
                ? 'border-sky-500/55 bg-sky-950/25 shadow-sm'
                : 'border-zinc-800/85 bg-zinc-950/60 hover:border-zinc-700'
            )}
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Scenes</span>
              <Video className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{summary.scenes.ready}</span>
              <span className="text-[11px] text-zinc-400">/{summary.scenes.total} ready</span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 truncate">
              {summary.scenes.totalVersionTakes} take
              {summary.scenes.totalVersionTakes === 1 ? '' : 's'}
              {summary.scenes.maxVersion > 1 ? ` · up to v${summary.scenes.maxVersion}` : ''}
            </p>
          </button>
        </div>

        {/* 3. Multi-Dimensional Filter & Layout Control Bar */}
        <div className="rounded-xl border border-zinc-800/85 bg-zinc-950/75 p-3 space-y-2.5">
          {/* Top Filter Row: Search + Deliverable Type Pills + View Mode Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Filter by scene, chapter, promo, language, v2…"
                className="w-full h-8 rounded-lg border border-zinc-800 bg-zinc-900/90 pl-8 pr-8 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/60"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex flex-wrap items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5 gap-0.5">
                {DELIVERABLE_TYPE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, type: tab.id }))}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      filters.type === tab.id
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setLayoutMode('grouped')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    layoutMode === 'grouped'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  title="Group deliverables by language stream"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  By Language
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('catalog')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    layoutMode === 'catalog'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  title="Flat cross-language deliverables catalog"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Catalog
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Filter Row: Language · Status · Format · Version + Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Filter className="w-3 h-3" />
                Filters:
              </span>

              {/* Language Filter */}
              <select
                aria-label="Filter by language"
                value={filters.language}
                onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))}
                className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-200"
              >
                <option value="all">All Languages ({summary.languageCount})</option>
                {summary.languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label} ({lang.readyCount} ready)
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                aria-label="Filter by readiness status"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as StreamStatusFilter }))
                }
                className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-200"
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready to Publish ({summary.totalReadyAssets})</option>
                <option value="published">Published Live ({summary.totalPublishedAssets})</option>
                <option value="draft">Needs Render</option>
              </select>

              {/* Format Filter */}
              <select
                aria-label="Filter by stream format"
                value={filters.format}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, format: e.target.value as StreamFormatFilter }))
                }
                className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-200"
              >
                <option value="all">All Formats</option>
                <option value="video">AI Video</option>
                <option value="animatic">Pre-Vis / Animatic</option>
              </select>

              {/* Version Filter */}
              <select
                aria-label="Filter by take version"
                value={String(filters.version)}
                onChange={(e) => {
                  const val = e.target.value
                  setFilters((f) => ({
                    ...f,
                    version:
                      val === 'latest' || val === 'all' ? val : Number(val) || 'latest',
                  }))
                }}
                className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-200"
              >
                <option value="latest">Latest Version</option>
                <option value="all">All Versions (History)</option>
                {summary.scenes.availableVersions.map((ver) => (
                  <option key={ver} value={String(ver)}>
                    Version v{ver}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>
                Showing <strong className="text-zinc-200">{filteredItems.length}</strong> asset
                {filteredItems.length === 1 ? '' : 's'}
              </span>
              {isFiltering ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetFilters}
                  className="h-7 px-2 text-[11px] border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* 4. Main Stream Content: Grouped by Language OR Unified Catalog */}
        {displayStreams.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-8 text-center text-sm text-zinc-400">
            No language streams yet. Add a language or render Pre-Vis scenes above to get started.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-8 text-center space-y-3">
            <p className="text-sm text-zinc-300">
              No streams match the active filter combination.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="border-zinc-700 text-zinc-200"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filters
            </Button>
          </div>
        ) : layoutMode === 'catalog' ? (
          /* Unified Cross-Language Deliverables Catalog */
          <div className="rounded-xl border border-zinc-800/85 bg-zinc-950/65 overflow-hidden divide-y divide-zinc-800/70">
            {filteredItems.map((item) => {
              const badge = kindBadgeStyle(item.kind)
              const dur = formatDurationBadge(item.durationSec)
              const target = toShipTarget(item)

              if (item.kind === 'scene' && item.versionVariants.length > 1 && filters.version === 'latest') {
                return (
                  <div key={item.uid} className="p-2.5">
                    <SceneDeliverableRow
                      item={item}
                      showLanguageBadge
                      onPreview={setQuickPreview}
                      onPublish={handleOpenPackageShip}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={item.uid}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {item.languageLabel} ({item.language})
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {item.title}
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                      <span>{item.subtitle}</span>
                      {item.version > 1 || filters.version === 'all' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          v{item.version}
                        </span>
                      ) : null}
                      {dur ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {dur}
                        </span>
                      ) : null}
                      {item.publishedLinks.map((link) => (
                        <a
                          key={`${link.platform}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline capitalize"
                        >
                          {link.platform} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.mp4Url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setQuickPreview({
                            title: `${item.title} · ${item.languageLabel}`,
                            subtitle: item.subtitle,
                            mp4Url: item.mp4Url!,
                            target,
                          })
                        }
                        className="h-8 text-xs border-zinc-700 text-zinc-200"
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Preview
                      </Button>
                    ) : null}

                    {item.kind === 'promo' && !item.canPublish && onOpenPromo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onOpenPromo}
                        className="h-8 text-xs border-fuchsia-500/35 text-fuchsia-200 hover:bg-fuchsia-500/10"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-fuchsia-400" />
                        Build Promo
                      </Button>
                    ) : item.kind === 'previs' && !item.canPublish ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPreVisRender(item.language, true)}
                        className="h-8 text-xs border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/40"
                      >
                        <Clapperboard className="w-3.5 h-3.5 mr-1 text-cyan-300" />
                        Render Pre-Vis
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!item.canPublish}
                        onClick={() => handleOpenPackageShip(target)}
                        className="h-8 text-xs bg-sf-primary hover:bg-sf-accent text-white"
                      >
                        <Share2 className="w-3.5 h-3.5 mr-1" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Grouped by Language Stream Cards */
          <div className="space-y-3.5">
            {visibleStreams.map((stream, index) => {
              const langStats = summary.languages.find((l) => l.code === stream.language)
              return (
                <StreamCard
                  key={stream.id || stream.language}
                  stream={stream}
                  projectId={projectId}
                  projectTitle={projectTitle}
                  metadata={effectiveMetadata}
                  script={script}
                  itemsForLanguage={filteredByLanguage[stream.language] || []}
                  totalLanguageReadyCount={langStats?.readyCount || 0}
                  totalLanguagePublishedCount={langStats?.publishedCount || 0}
                  previsSceneProgress={
                    previsProgressByLanguage[stream.language] || {
                      ready: 0,
                      total: projectScenes.length,
                    }
                  }
                  hasActiveFilters={isFiltering}
                  autoExpandSubsections={autoExpandSubsections}
                  defaultCardCollapsed={visibleStreams.length > 3 && index > 1}
                  onSaveStreams={onSaveStreams}
                  onPreviewStream={onPreviewStream}
                  onQuickPreview={setQuickPreview}
                  onOpenPreVisRender={handleOpenPreVisRender}
                  onOpenPackageShip={handleOpenPackageShip}
                  onOpenPromo={onOpenPromo}
                  allStreams={displayStreams}
                  sceneProductionState={mergedSceneProductionState}
                  onPersistSceneProduction={onPersistSceneProduction}
                  reloadSceneProduction={reloadSceneProduction}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Inline Video Preview Modal */}
      <Dialog
        open={Boolean(quickPreview)}
        onOpenChange={(open) => {
          if (!open) setQuickPreview(null)
        }}
      >
        <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              {quickPreview?.title || 'Stream Preview'}
            </DialogTitle>
            {quickPreview?.subtitle ? (
              <DialogDescription className="text-xs text-zinc-400">
                {quickPreview.subtitle}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {quickPreview?.mp4Url ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-black border border-zinc-800">
                <video
                  key={quickPreview.mp4Url}
                  src={quickPreview.mp4Url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[65vh] object-contain"
                />
              </div>
              {quickPreview.target ? (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuickPreview(null)}
                    className="border-zinc-700 text-zinc-300"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = quickPreview.target!
                      setQuickPreview(null)
                      handleOpenPackageShip(target)
                    }}
                    className="bg-sf-primary hover:bg-sf-accent text-white"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Publish Deliverable
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <PreVisRenderDialog
        open={preVisDialogOpen}
        onOpenChange={setPreVisDialogOpen}
        scenes={projectScenes}
        projectId={projectId}
        projectTitle={projectTitle}
        initialLanguage={preVisDialogLanguage}
        initialCombineSelectedScenes={preVisCombineDefault}
        availableLanguages={displayStreams.map((s) => s.language)}
        sceneProductionState={mergedSceneProductionState}
        onSceneStreamRendered={(renderedSceneId, stream) => {
          setLiveSceneStreams((prev) => ({
            ...prev,
            [renderedSceneId]: [...(prev[renderedSceneId] || []), stream],
          }))
        }}
        onCombinedStreamRendered={(asset) => {
          setLivePreVisMasters((prev) => ({
            ...prev,
            [asset.language]: asset,
          }))
          if (onSaveMetadata) {
            const nextMeta = upsertPreVisMaster(effectiveMetadata, asset.language, asset)
            void onSaveMetadata(nextMeta).catch(() => undefined)
          }
        }}
      />

      <PackageShipDialog
        open={packageShipOpen}
        onOpenChange={setPackageShipOpen}
        target={packageShipTarget}
        projectId={projectId}
        projectTitle={projectTitle}
        metadata={effectiveMetadata}
        script={script}
        userId={userId}
        streams={displayStreams}
        sceneProductionState={mergedSceneProductionState}
        onSaveMetadata={onSaveMetadata}
      />
    </div>
  )
}
