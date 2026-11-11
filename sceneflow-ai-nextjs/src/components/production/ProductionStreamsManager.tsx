'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  ExternalLink,
  Film,
  Globe,
  Languages,
  Layers,
  Loader2,
  Play,
  Plus,
  Share2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
import { resolvePromoScreeningVideoUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import {
  buildDraftStream,
  isLocalizeEligibleLanguage,
  mergeStreamsWithLanguages,
  resolveStreamCoverage,
  type ProjectStream,
} from '@/lib/streams/projectStreams'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { promoAssetForLanguage } from '@/lib/publish/promoLanguage'
import { getPublishingState, upsertPreVisMaster } from '@/lib/publish/publishingState'
import {
  collectPublishPreVisScenes,
  collectPublishScenes,
  listPublishChapters,
  publishUnitId,
  type PublishUnitKind,
} from '@/lib/publish/publishUnits'
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

function statusPill(ready: boolean, partial?: boolean, readyLabel = 'Ready', draftLabel = 'Not rendered') {
  if (ready) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-200 border-emerald-500/30">
        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
        {readyLabel}
      </span>
    )
  }
  if (partial) {
    return (
      <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border bg-amber-500/15 text-amber-200 border-amber-500/30">
        {draftLabel}
      </span>
    )
  }
  return (
    <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border bg-zinc-800/80 text-zinc-400 border-zinc-700/60">
      {draftLabel}
    </span>
  )
}

interface StreamCardProps {
  stream: ProjectStream
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  userId?: string
  projectScenes: Array<Record<string, unknown>>
  previsMaster?: PreVisMasterAsset
  onSaveStreams: ProductionStreamsManagerProps['onSaveStreams']
  onPreviewStream: (language: string) => void
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
  projectScenes,
  previsMaster,
  onSaveStreams,
  onPreviewStream,
  onOpenPreVisRender,
  onOpenPackageShip,
  onOpenPromo,
  allStreams,
  sceneProductionState,
  onPersistSceneProduction,
  reloadSceneProduction,
}: StreamCardProps) {
  const [expanded, setExpanded] = useState(false)
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

  // Compute all publishable deliverables in this language stream
  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])

  const publishScenes = useMemo(
    () => collectPublishScenes(projectScenes, sceneProductionState as never, stream.language),
    [projectScenes, sceneProductionState, stream.language]
  )
  const previsScenes = useMemo(
    () => collectPublishPreVisScenes(projectScenes, sceneProductionState as never, stream.language),
    [projectScenes, sceneProductionState, stream.language]
  )

  // Merge scene readiness so Scenes & Chapters can ship either final video or Pre-Vis renders
  const mergedSceneDeliverables = useMemo(
    () =>
      publishScenes.map((sc, idx) => {
        const pv = previsScenes[idx]
        const inLangVideo = (sceneProductionState[sc.id]?.productionStreams || []).find(
          (s) =>
            (s.status === 'complete' || String(s.status) === 'ready') &&
            s.streamType === 'video' &&
            s.language === stream.language &&
            Boolean(s.mp4Url)
        )
        const mp4Url = inLangVideo?.mp4Url || pv?.mp4Url || (stream.language === 'en' ? sc.mp4Url : undefined)
        const duration = inLangVideo?.duration || pv?.duration || sc.duration
        return {
          ...sc,
          mp4Url,
          duration,
        }
      }),
    [publishScenes, previsScenes, sceneProductionState, stream.language]
  )

  const chapters = useMemo(
    () => listPublishChapters(mergedSceneDeliverables),
    [mergedSceneDeliverables]
  )

  const readyPreVisScenesCount = useMemo(
    () => previsScenes.filter((s) => Boolean(s.mp4Url)).length,
    [previsScenes]
  )
  const stitchedPreVisUrl =
    previsMaster?.mp4Url || (stream.format === 'animatic' && stream.mp4Url ? stream.mp4Url : undefined)
  const previsCanStitch =
    !stitchedPreVisUrl &&
    (readyPreVisScenesCount >= 2 ||
      (previsScenes.length === 1 && readyPreVisScenesCount === 1))

  const masterVideoUrl =
    stream.format !== 'animatic' && stream.mp4Url ? stream.mp4Url : undefined
  const readyScenesCount = useMemo(
    () => mergedSceneDeliverables.filter((s) => Boolean(s.mp4Url)).length,
    [mergedSceneDeliverables]
  )
  const readyChaptersCount = useMemo(
    () =>
      chapters.filter((ch) =>
        mergedSceneDeliverables
          .filter((s) => ch.sceneIds.includes(s.id))
          .some((s) => Boolean(s.mp4Url))
      ).length,
    [chapters, mergedSceneDeliverables]
  )

  const promoAsset = promoAssetForLanguage(publishingState.promo, stream.language)
  const promoUrl = useMemo(
    () =>
      resolvePromoScreeningVideoUrl({
        scenes: projectScenes,
        sceneProductionState: sceneProductionState as Record<string, unknown>,
        language: stream.language,
        finalCut: readFinalCutSelection(metadata),
        activePromoId: publishingState.promo?.activePromoId,
        fallbackPromoTrailerUrl: promoAsset?.mp4Url || null,
      }),
    [
      projectScenes,
      sceneProductionState,
      stream.language,
      metadata,
      publishingState.promo?.activePromoId,
      promoAsset?.mp4Url,
    ]
  )

  const findPublishedYoutubeUrl = useCallback(
    (kind: PublishUnitKind, targetSceneId?: string, targetBeatIndex?: number) => {
      const id16 = publishUnitId(kind, '16:9', stream.language, targetSceneId, targetBeatIndex)
      const id9 = publishUnitId(kind, '9:16', stream.language, targetSceneId, targetBeatIndex)
      const unitMatch = publishingState.units?.find(
        (u) =>
          (u.id === id16 || u.id === id9) &&
          u.destinations?.youtube?.status === 'published' &&
          Boolean(u.destinations?.youtube?.url)
      )
      return unitMatch?.destinations?.youtube?.url
    },
    [publishingState.units, stream.language]
  )

  const readyDeliverableTotal =
    (stitchedPreVisUrl || previsCanStitch ? 1 : 0) +
    (masterVideoUrl ? 1 : 0) +
    (promoUrl ? 1 : 0) +
    readyScenesCount +
    readyChaptersCount

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

  const previsPublishedUrl = findPublishedYoutubeUrl('previs')
  const masterPublishedUrl =
    findPublishedYoutubeUrl('master') || stream.publish?.youtubeUrl || undefined
  const promoPublishedUrl = findPublishedYoutubeUrl('promo')

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 backdrop-blur-md overflow-hidden">
      {/* Language Stream Header */}
      <div className="px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-violet-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">
                {getLanguageDisplayName(stream.language)}
              </h3>
              <span className="text-[10px] text-zinc-500 uppercase">{stream.language}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700/80 bg-zinc-900 text-zinc-300">
                {readyDeliverableTotal} publishable asset{readyDeliverableTotal === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pre-Vis {readyPreVisScenesCount}/{previsScenes.length} scenes · Master{' '}
              {coverage.ready}/{coverage.total} scenes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
            onClick={() => onOpenPreVisRender(stream.language, true)}
          >
            <Clapperboard className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
            Render Pre-Vis
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-200"
            onClick={() => setExpanded((v) => !v)}
          >
            <Film className="w-3.5 h-3.5 mr-1.5" />
            Assemble Master
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>
          {isLocalizeEligibleLanguage(stream.language) ? (
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-200"
              onClick={() => setLocalizeOpen((v) => !v)}
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
              className="border-zinc-700 text-zinc-200"
              onClick={() => onPreviewStream(stream.language)}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Preview
            </Button>
          ) : null}
        </div>
      </div>

      {/* Publishable Deliverables Shelf (Pre-Vis · Master · Promo · Scenes & Chapters) */}
      <div className="border-t border-zinc-800/70 bg-zinc-900/25 px-4 py-3 sm:px-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* 1. Stitched Pre-Vis */}
          <div className="rounded-lg border border-zinc-800/90 bg-zinc-950/60 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">Pre-Vis (Stitched)</span>
                {statusPill(
                  Boolean(stitchedPreVisUrl),
                  previsCanStitch,
                  'Ready',
                  previsCanStitch ? `${readyPreVisScenesCount} scenes ready` : 'Not rendered'
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {stitchedPreVisUrl
                  ? 'Combined Pre-Vis MP4 ready to publish'
                  : previsCanStitch
                    ? 'Ready to stitch & publish in 1 click'
                    : 'Render Pre-Vis scenes to stitch'}
              </p>
              {previsPublishedUrl ? (
                <a
                  href={previsPublishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  Published on YouTube <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : null}
            </div>
            <Button
              size="sm"
              disabled={!stitchedPreVisUrl && !previsCanStitch}
              onClick={() =>
                onOpenPackageShip({ kind: 'previs', language: stream.language })
              }
              className="h-8 text-xs bg-sf-primary hover:bg-sf-accent text-white shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Publish
            </Button>
          </div>

          {/* 2. Production Master */}
          <div className="rounded-lg border border-zinc-800/90 bg-zinc-950/60 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">Master</span>
                {statusPill(
                  Boolean(masterVideoUrl),
                  coverage.ready > 0 && coverage.missing === 0,
                  'Ready',
                  `${coverage.ready}/${coverage.total} scenes`
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {masterVideoUrl
                  ? 'Final language Master MP4 ready'
                  : 'Assemble & render Master stream'}
              </p>
              {masterPublishedUrl ? (
                <a
                  href={masterPublishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  Published on YouTube <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : null}
            </div>
            <Button
              size="sm"
              disabled={!masterVideoUrl}
              onClick={() =>
                onOpenPackageShip({ kind: 'master', language: stream.language })
              }
              className="h-8 text-xs bg-sf-primary hover:bg-sf-accent text-white shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Publish
            </Button>
          </div>

          {/* 3. Promo Trailer */}
          <div className="rounded-lg border border-zinc-800/90 bg-zinc-950/60 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">Promo</span>
                {statusPill(Boolean(promoUrl), false, 'Ready', 'Draft')}
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {promoUrl
                  ? 'Rendered Promo trailer ready'
                  : 'Create trailer in Promo Builder'}
              </p>
              {promoPublishedUrl ? (
                <a
                  href={promoPublishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  Published on YouTube <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : null}
            </div>
            {promoUrl ? (
              <Button
                size="sm"
                onClick={() =>
                  onOpenPackageShip({ kind: 'promo', language: stream.language })
                }
                className="h-8 text-xs bg-sf-primary hover:bg-sf-accent text-white shrink-0"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                Publish
              </Button>
            ) : onOpenPromo ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenPromo}
                className="h-8 text-xs border-fuchsia-500/35 text-fuchsia-200 hover:bg-fuchsia-500/10 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-fuchsia-400" />
                Build Promo
              </Button>
            ) : (
              <Button size="sm" disabled className="h-8 text-xs shrink-0">
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* 4. Scenes & Chapters Publish Drawer */}
        {mergedSceneDeliverables.length > 0 ? (
          <div className="rounded-lg border border-zinc-800/75 bg-zinc-950/40">
            <button
              type="button"
              onClick={() => setScenesChaptersOpen((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">Scenes &amp; Chapters</span>
                <span className="text-[11px] text-zinc-400">
                  {readyScenesCount}/{mergedSceneDeliverables.length} scenes ready
                  {chapters.length > 0
                    ? ` · ${readyChaptersCount}/${chapters.length} chapters ready`
                    : ''}
                </span>
              </span>
              {scenesChaptersOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </button>

            {scenesChaptersOpen ? (
              <div className="border-t border-zinc-800/75 p-3 space-y-3">
                {chapters.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                      Chapters ({getLanguageDisplayName(stream.language)})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {chapters.map((chapter) => {
                        const chapterMembers = mergedSceneDeliverables.filter((s) =>
                          chapter.sceneIds.includes(s.id)
                        )
                        const readyInChapter = chapterMembers.filter((s) =>
                          Boolean(s.mp4Url)
                        ).length
                        const isChapterReady = readyInChapter > 0
                        const pubUrl = findPublishedYoutubeUrl(
                          'chapter',
                          undefined,
                          chapter.beatIndex
                        )
                        return (
                          <div
                            key={chapter.beatIndex}
                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-zinc-200 truncate">{chapter.title}</p>
                              <p className="text-[10px] text-zinc-500">
                                {readyInChapter}/{chapterMembers.length} scene
                                {chapterMembers.length === 1 ? '' : 's'} rendered
                                {pubUrl ? ' · Published' : ''}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              disabled={!isChapterReady}
                              onClick={() =>
                                onOpenPackageShip({
                                  kind: 'chapter',
                                  language: stream.language,
                                  beatIndex: chapter.beatIndex,
                                })
                              }
                              className="h-7 px-2.5 text-[11px] bg-sf-primary hover:bg-sf-accent text-white shrink-0"
                            >
                              Publish
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                    Scenes ({getLanguageDisplayName(stream.language)})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mergedSceneDeliverables.map((scene) => {
                      const pubUrl = findPublishedYoutubeUrl('scene', scene.id)
                      return (
                        <div
                          key={scene.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-200 truncate">{scene.title}</p>
                            <p className="text-[10px] text-zinc-500">
                              {scene.mp4Url ? 'Ready' : 'Not rendered'}
                              {pubUrl ? ' · Published' : ''}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={!scene.mp4Url}
                            onClick={() =>
                              onOpenPackageShip({
                                kind: 'scene',
                                language: stream.language,
                                sceneId: scene.id,
                              })
                            }
                            className="h-7 px-2.5 text-[11px] bg-sf-primary hover:bg-sf-accent text-white shrink-0"
                          >
                            Publish
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {expanded ? (
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

  const publishingState = useMemo(
    () => getPublishingState(effectiveMetadata),
    [effectiveMetadata]
  )

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

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-1 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Production Streams</h2>
            </div>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Manage every language stream of your film — render Pre-Vis, Scenes, Chapters, Master,
              or Promo, then click <strong className="text-zinc-200 font-medium">Publish</strong> on
              any ready asset to package &amp; ship.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {projectScenes.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
                onClick={() =>
                  handleOpenPreVisRender(displayStreams[0]?.language || 'en', true)
                }
              >
                <Clapperboard className="w-4 h-4 mr-1.5 text-cyan-300" />
                Render &amp; Stitch Pre-Vis
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600 text-zinc-200"
              disabled={addableLanguages.length === 0}
              onClick={() => setAddLanguageOpen((v) => !v)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add language
            </Button>
          </div>
        </div>

        {addLanguageOpen ? (
          <div className="mt-4 rounded-lg border border-zinc-700/70 bg-zinc-900/50 p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                Language
              </label>
              <select
                value={selectedNewLanguage}
                onChange={(e) => setSelectedNewLanguage(e.target.value)}
                className="bg-zinc-900 text-zinc-200 text-sm rounded-md px-3 py-2 border border-zinc-700"
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
              Generate stream
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-1 pb-6">
        {displayStreams.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-8 text-center text-sm text-zinc-400">
            No language streams yet. Add a language or render Pre-Vis scenes above to get started.
          </div>
        ) : (
          displayStreams.map((stream) => (
            <StreamCard
              key={stream.id || stream.language}
              stream={stream}
              projectId={projectId}
              projectTitle={projectTitle}
              metadata={effectiveMetadata}
              script={script}
              userId={userId}
              projectScenes={projectScenes}
              previsMaster={publishingState.previsByLanguage?.[stream.language]}
              onSaveStreams={onSaveStreams}
              onPreviewStream={onPreviewStream}
              onOpenPreVisRender={handleOpenPreVisRender}
              onOpenPackageShip={handleOpenPackageShip}
              onOpenPromo={onOpenPromo}
              allStreams={displayStreams}
              sceneProductionState={mergedSceneProductionState}
              onPersistSceneProduction={onPersistSceneProduction}
              reloadSceneProduction={reloadSceneProduction}
            />
          ))
        )}
      </div>

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
