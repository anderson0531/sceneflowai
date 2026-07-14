'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Film,
  Globe,
  Layers,
  Loader2,
  Play,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { FinalCutStreamsPanel } from '@/components/final-cut/FinalCutStreamsPanel'
import { ProductionPublishPanel } from '@/components/production/ProductionPublishPanel'
import { buildFinalCutClips, type BuildFinalCutClipsArgs } from '@/lib/final-cut/useFinalCutClips'
import { applyAssemblyPreset } from '@/lib/final-cut/finalCutPresets'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import {
  buildDraftStream,
  mergeStreamsWithLanguages,
  resolveStreamCoverage,
  type ProjectStream,
} from '@/lib/streams/projectStreams'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { LANGUAGE_CONFIGS } from '@/lib/types/finalCut'
import type {
  FinalCutAssemblyPresetId,
  FinalCutSelection,
  ProductionLanguage,
} from '@/lib/types/finalCut'

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
  onGenerateLanguage: (language: string) => Promise<void>
  onPreviewStream: (language: string) => void
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
  stream: ProjectStream
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  userId?: string
  onSaveStreams: ProductionStreamsManagerProps['onSaveStreams']
  onPreviewStream: (language: string) => void
  allStreams: ProjectStream[]
}

function StreamCard({
  stream,
  projectId,
  projectTitle,
  metadata,
  script,
  userId,
  onSaveStreams,
  onPreviewStream,
  allStreams,
}: StreamCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
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

  const persistStream = useCallback(
    async (next: ProjectStream, compat?: { exportedVideoUrl?: string; exportedAnimaticUrl?: string }) => {
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

  const handleShareCreated = useCallback(
    async (result: { shareUrl: string; shareSlug?: string }) => {
      await persistStream({
        ...stream,
        publish: {
          ...stream.publish,
          shareUrl: result.shareUrl,
          shareSlug: result.shareSlug,
          publishedAt: new Date().toISOString(),
        },
      })
    },
    [stream, persistStream]
  )

  const handleYoutubePublished = useCallback(
    async (result: { youtubeUrl: string }) => {
      await persistStream({
        ...stream,
        publish: {
          ...stream.publish,
          youtubeUrl: result.youtubeUrl,
          publishedAt: new Date().toISOString(),
        },
      })
    },
    [stream, persistStream]
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
              <span className="text-[10px] text-zinc-500 uppercase">{stream.language}</span>
              {statusBadge(stream.status)}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatLabel} · {coverage.ready}/{coverage.total} scenes ready
              {coverage.missing > 0 ? ` · ${coverage.missing} missing` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-200"
            disabled={stream.status !== 'ready' || !stream.mp4Url}
            onClick={() => onPreviewStream(stream.language)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-200"
            onClick={() => setExpanded((v) => !v)}
          >
            <Film className="w-3.5 h-3.5 mr-1.5" />
            Render
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>
          <Button
            size="sm"
            className="bg-sf-primary hover:bg-sf-accent text-white"
            disabled={!stream.mp4Url}
            onClick={() => setPublishOpen((v) => !v)}
          >
            Publish
          </Button>
        </div>
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

      {publishOpen && stream.mp4Url ? (
        <div className="border-t border-zinc-800/80 px-4 py-4 sm:px-5 sm:py-5">
          <ProductionPublishPanel
            projectId={projectId}
            userId={userId}
            videoUrl={stream.mp4Url}
            title={`${projectTitle || 'Production'} (${getLanguageDisplayName(stream.language)})`}
            projectTitle={projectTitle}
            metadata={{
              ...(typeof metadata === 'object' && metadata ? metadata : {}),
              finalCut: localSelection,
            }}
            masterLanguage={stream.language}
            onShareCreated={handleShareCreated}
            onYoutubePublished={handleYoutubePublished}
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
  onGenerateLanguage,
  onPreviewStream,
}: ProductionStreamsManagerProps) {
  const [addLanguageOpen, setAddLanguageOpen] = useState(false)
  const [selectedNewLanguage, setSelectedNewLanguage] = useState<string>('es')
  const [addingLanguage, setAddingLanguage] = useState(false)

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

  const mergedStreams = useMemo(
    () => mergeStreamsWithLanguages(metadata, projectLike),
    [metadata, projectLike]
  )

  const displayStreams = streams.length > 0 ? streams : mergedStreams

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
              Manage per-language masters — add languages, render stitched MP4s, and publish each
              stream independently.
            </p>
          </div>
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
            No language streams yet. Add a language to get started.
          </div>
        ) : (
          displayStreams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              projectId={projectId}
              projectTitle={projectTitle}
              metadata={metadata}
              script={script}
              userId={userId}
              onSaveStreams={onSaveStreams}
              onPreviewStream={onPreviewStream}
              allStreams={displayStreams}
            />
          ))
        )}
      </div>
    </div>
  )
}
