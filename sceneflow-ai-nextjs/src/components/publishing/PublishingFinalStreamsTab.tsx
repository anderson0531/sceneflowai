'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Film,
  Globe,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { FinalCutStreamsPanel } from '@/components/final-cut/FinalCutStreamsPanel'
import { buildFinalCutClips, type BuildFinalCutClipsArgs } from '@/lib/final-cut/useFinalCutClips'
import { applyAssemblyPreset } from '@/lib/final-cut/finalCutPresets'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import {
  resolveStreamCoverage,
  type ProjectStream,
} from '@/lib/streams/projectStreams'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import {
  computePublishingReadiness,
  resolveStreamRenderSettings,
} from '@/lib/publish/publishingState'
import {
  DELIVERY_PRESET_RESOLUTION,
  type PublishingStreamRecord,
  type StreamDeliveryPreset,
  type StreamRenderSettings,
} from '@/types/publishingAssets'
import { getPublishingState } from '@/lib/publish/publishingState'
import type {
  FinalCutAssemblyPresetId,
  FinalCutSelection,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import type { SceneProductionData } from '@/components/vision/scene-production/types'

type ProjectLike = NonNullable<BuildFinalCutClipsArgs['project']>

const DELIVERY_PRESETS: Array<{ id: StreamDeliveryPreset; label: string; hint: string }> = [
  { id: 'draft', label: 'Draft', hint: '720p · fast preview' },
  { id: 'standard', label: 'Standard', hint: '1080p · delivery default' },
  { id: 'premium', label: 'Premium', hint: '4K · highest quality' },
]

export interface PublishingFinalStreamsTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  streams: ProjectStream[]
  onSaveStreams: (
    streams: ProjectStream[],
    compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }
  ) => Promise<void>
  onPreviewStream: (language: string) => void
  sceneProductionState: Record<string, SceneProductionData>
}

function statusBadge(status: ProjectStream['status']) {
  const styles: Record<ProjectStream['status'], string> = {
    draft: 'bg-zinc-700/60 text-zinc-300 border-zinc-600/50',
    rendering: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    ready: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    error: 'bg-red-500/15 text-red-200 border-red-500/30',
  }
  const labels: Record<ProjectStream['status'], string> = {
    draft: 'Draft',
    rendering: 'Rendering',
    ready: 'Ready',
    error: 'Error',
  }
  return (
    <span
      className={cn(
        'text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border',
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  )
}

interface StreamCardProps {
  stream: PublishingStreamRecord
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  onSaveStreams: PublishingFinalStreamsTabProps['onSaveStreams']
  onPreviewStream: (language: string) => void
  allStreams: PublishingStreamRecord[]
}

function StreamCard({
  stream,
  projectId,
  projectTitle,
  metadata,
  script,
  onSaveStreams,
  onPreviewStream,
  allStreams,
}: StreamCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastRenderUrl, setLastRenderUrl] = useState<string | null>(stream.mp4Url ?? null)

  const renderSettings = resolveStreamRenderSettings(stream)

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

  const persistStream = useCallback(
    async (
      next: PublishingStreamRecord,
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

  const handleDeliveryPresetChange = useCallback(
    (preset: StreamDeliveryPreset) => {
      const nextSettings: StreamRenderSettings = {
        ...renderSettings,
        preset,
        resolution: DELIVERY_PRESET_RESOLUTION[preset],
      }
      void persistStream({ ...stream, renderSettings: nextSettings })
    },
    [renderSettings, stream, persistStream]
  )

  const handleUpscaleToggle = useCallback(
    (upscale: boolean) => {
      const nextSettings: StreamRenderSettings = {
        ...renderSettings,
        upscale,
        upscaleSettings: upscale
          ? {
              provider: 'topaz',
              targetResolution: renderSettings.resolution === '4K' ? '4K' : '1080p',
              enhanceDetails: true,
              reducenoise: false,
              deinterlace: false,
            }
          : undefined,
      }
      void persistStream({ ...stream, renderSettings: nextSettings })
    },
    [renderSettings, stream, persistStream]
  )

  const handleRendered = useCallback(
    async (url: string) => {
      setLastRenderUrl(url)
      const renderedAt = new Date().toISOString()
      const next: PublishingStreamRecord = {
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

  const formatLabel = stream.format === 'animatic' ? 'Animatic' : 'Video'

  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 backdrop-blur-md overflow-hidden">
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
              {statusBadge(stream.status)}
              <span className="text-[10px] text-zinc-500 uppercase">{formatLabel}</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {coverage.ready}/{coverage.total} scenes ready
              {coverage.missing > 0 ? ` · ${coverage.missing} missing` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stream.mp4Url ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreviewStream(stream.language)}
              className="border-emerald-500/30 text-emerald-300"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Preview
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded((v) => !v)}
            className="border-zinc-700"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 mr-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
            )}
            {expanded ? 'Collapse' : 'Render'}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-zinc-800/70">
          <div className="px-4 py-3 sm:px-5 border-b border-zinc-800/50 space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                Delivery preset
              </span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {DELIVERY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={saving}
                    onClick={() => handleDeliveryPresetChange(preset.id)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors',
                      renderSettings.preset === preset.id
                        ? 'border-violet-500/50 bg-violet-500/15'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                    )}
                  >
                    <div className="text-xs font-medium text-white">{preset.label}</div>
                    <div className="text-[10px] text-zinc-500">{preset.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={renderSettings.upscale}
                onChange={(e) => handleUpscaleToggle(e.target.checked)}
                disabled={saving}
                className="rounded border-zinc-600"
              />
              Upscale after render (Topaz when credentials available)
            </label>
          </div>
          <FinalCutStreamsPanel
            selection={localSelection}
            clips={clips}
            availableLanguages={availableLanguages}
            onApplyPreset={handleApplyPreset}
            onChangeSceneOverride={handleChangeSceneOverride}
            disabled={saving}
            projectId={projectId}
            embeddedInSection
            suppressOuterTitle
            renderButtonProps={{
              projectId,
              filenameLabel: `${stream.language}-${projectTitle || projectId}`.slice(0, 40),
              onRendered: handleRendered,
              lastRenderUrl,
              resolution: renderSettings.resolution,
              upscale: renderSettings.upscale,
              upscaleSettings: renderSettings.upscaleSettings,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export function PublishingFinalStreamsTab({
  projectId,
  projectTitle,
  metadata,
  script,
  streams,
  onSaveStreams,
  onPreviewStream,
}: PublishingFinalStreamsTabProps) {
  const publishingStreams = useMemo(
    () => getPublishingState(metadata).streams,
    [metadata, streams]
  )

  const readiness = useMemo(
    () =>
      computePublishingReadiness(
        {
          id: projectId,
          metadata,
          script:
            (script as { script?: { scenes?: unknown } } | undefined)?.script ??
            (script as { scenes?: unknown } | undefined),
        } as ProjectLike,
        publishingStreams
      ),
    [projectId, metadata, script, publishingStreams]
  )

  if (publishingStreams.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/45 p-8 text-center">
        <Film className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">No language streams yet.</p>
        <p className="text-xs text-zinc-500 mt-1">
          Generate a language stream from the Streams view first.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="text-xs text-zinc-500">
          {readiness.readyStreamCount}/{readiness.totalStreamCount} streams ready · render all
          scenes then stitch a delivery-quality master per language.
        </p>
        {readiness.blockers.length > 0 ? (
          <span className="text-[10px] text-amber-400 shrink-0">
            {readiness.blockers.length} blocker{readiness.blockers.length !== 1 ? 's' : ''}
          </span>
        ) : null}
      </div>
      {publishingStreams.map((stream) => (
        <StreamCard
          key={stream.id || stream.language}
          stream={stream}
          projectId={projectId}
          projectTitle={projectTitle}
          metadata={metadata}
          script={script}
          onSaveStreams={onSaveStreams}
          onPreviewStream={onPreviewStream}
          allStreams={publishingStreams}
        />
      ))}
    </div>
  )
}
